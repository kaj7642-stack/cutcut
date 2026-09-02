#!/usr/bin/env node
/**
 * 파이프라인 자동 검증 + 자동 복구 루프.
 *
 *   npm run verify              # 전체 (mock 프로바이더, 외부 API 키 불필요)
 *   npm run verify -- --quick   # 정적 검사(typecheck/lint/build) 생략
 *   npm run verify -- --only 5  # 특정 체크만 (이름 부분 일치)
 *
 * 각 체크는 실패 시 repair()로 산출물을 정리한 뒤 최대 MAX_ATTEMPTS번까지
 * 다시 시도한다. 마지막까지 실패하면 그 이유를 그대로 출력하고 종료 코드 1.
 */
import { execFile } from "child_process";
import { readFile, rm, stat } from "fs/promises";
import { join } from "path";
import { promisify } from "util";

process.env.PIPELINE_MOCK ??= "1";

const exec = promisify(execFile);

const SERIES_ID = "verify-series";
const EPISODE = 1;
const MAX_ATTEMPTS = 3;

const args = process.argv.slice(2);
const QUICK = args.includes("--quick");
const ONLY = args.includes("--only") ? args[args.indexOf("--only") + 1] : undefined;

/* ── 유틸 ───────────────────────────────────────────────────────── */

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function sizeOf(path: string): Promise<number> {
  return (await stat(path)).size;
}

interface Check {
  name: string;
  run: () => Promise<string | void>;
  /** 실패했을 때 다음 시도를 위해 상태를 정리한다 */
  repair?: (error: Error, attempt: number) => Promise<void>;
}

/* ── 파이프라인 모듈 (동적 import — 환경변수 설정 후 로드) ────── */

const paths = await import("../lib/pipeline/paths");
const { runEpisodePipeline } = await import("../lib/pipeline/orchestrator");
const { ffmpegAvailable, probeDuration } = await import("../lib/pipeline/providers/media");
const schemas = await import("../lib/pipeline/schemas");
const { enforcePromptInvariants } = await import("../lib/pipeline/images");
const { buildVideoMetadata } = await import("../lib/pipeline/upload");
const { buildAssembleInput, assembleEpisode } = await import("../lib/pipeline/assemble");
const { buildTimeline } = await import("../remotion/schema");

const EP_ID = paths.episodeId(SERIES_ID, EPISODE);

type Bible = import("../lib/pipeline/types").SeriesBible;
type Script = import("../lib/pipeline/types").EpisodeScript;
type ImagePrompt = import("../lib/pipeline/types").ImagePrompt;
type GeneratedImage = import("../lib/pipeline/types").GeneratedImage;
type TtsResult = import("../lib/pipeline/types").TtsResult;
type AssembleResult = import("../lib/pipeline/types").AssembleResult;
type UploadLogEntry = import("../lib/pipeline/upload").UploadLogEntry;

async function loadArtifact<T>(name: string): Promise<T> {
  const path = paths.artifactPath(SERIES_ID, EPISODE, name);
  const value = await paths.readJsonIfExists<T>(path);
  assert(value, `산출물이 없습니다: ${path}`);
  return value;
}

/** 검증 대상 시리즈의 모든 산출물을 지운다 (자동 복구용). */
async function wipeSeries() {
  await rm(paths.seriesDir(SERIES_ID), { recursive: true, force: true });
  await rm(paths.imagesDir(EP_ID), { recursive: true, force: true });
  await rm(paths.audioDir(EP_ID), { recursive: true, force: true });
  await rm(paths.videoPath(EP_ID), { force: true });
}

/* ── 체크 정의 ──────────────────────────────────────────────────── */

const DRAFT_RENDER = {
  width: 640,
  height: 360,
  fps: 12,
  maxScenes: 2,
  maxSceneSeconds: 3,
  titleSeconds: 1.5,
  outroSeconds: 1.5,
  crf: 30,
};

const checks: Check[] = [
  {
    name: "0. 환경 — ffmpeg / ffprobe",
    run: async () => {
      assert(
        await ffmpegAvailable(),
        "ffmpeg / ffprobe를 찾지 못했습니다. 설치하거나 FFMPEG_PATH / FFPROBE_PATH를 설정하세요.",
      );
      return "ffmpeg, ffprobe 사용 가능";
    },
  },

  {
    name: "1-4. 대본·이미지·TTS 파이프라인 (mock)",
    run: async () => {
      const result = await runEpisodePipeline({
        seriesId: SERIES_ID,
        episodeNumber: EPISODE,
        stopAfter: "tts",
      });
      assert(
        result.ok,
        `파이프라인이 ${result.failed_step ?? "?"}에서 멈췄습니다: ` +
          `${result.logs.find((l) => l.status === "failed")?.error ?? ""}`,
      );
      const done = result.logs.filter((l) => l.status !== "failed").map((l) => l.step);
      for (const step of ["bible", "script", "image_prompts", "images", "tts"]) {
        assert(done.includes(step as never), `단계가 실행되지 않았습니다: ${step}`);
      }
      return `단계 ${done.join(" → ")}`;
    },
    repair: async () => {
      await wipeSeries();
    },
  },

  {
    name: "1. 바이블 스키마",
    run: async () => {
      const bible = await paths.readJsonIfExists<Bible>(paths.biblePath(SERIES_ID));
      assert(bible, "series_bible.json이 없습니다.");
      const parsed = schemas.seriesBibleSchema.safeParse(bible);
      assert(
        parsed.success,
        `바이블 스키마 위반:\n${parsed.success ? "" : JSON.stringify(schemas.toIssues(parsed.error), null, 2)}`,
      );
      assert(bible.series_id === SERIES_ID, "series_id가 요청값과 다릅니다.");
      return `세력 ${bible.factions.length} / 인물 ${bible.characters.length} / 아크 ${bible.story_arc.length}화`;
    },
    repair: async () => {
      await rm(paths.biblePath(SERIES_ID), { force: true });
      await runEpisodePipeline({ seriesId: SERIES_ID, episodeNumber: EPISODE, stopAfter: "bible" });
    },
  },

  {
    name: "2. 대본 스키마 + 분량",
    run: async () => {
      const script = await loadArtifact<Script>("script");
      const parsed = schemas.episodeScriptSchema.safeParse(script);
      assert(
        parsed.success,
        `대본 스키마 위반:\n${parsed.success ? "" : JSON.stringify(schemas.toIssues(parsed.error), null, 2)}`,
      );
      const total = script.narration_script.reduce((a, s) => a + s.estimated_duration_sec, 0);
      assert(total >= 300 && total <= 600, `예상 분량이 범위를 벗어났습니다: ${total}초`);
      return `씬 ${script.narration_script.length}개 / 예상 ${Math.round(total)}초`;
    },
    repair: async () => {
      await rm(paths.artifactPath(SERIES_ID, EPISODE, "script"), { force: true });
      await runEpisodePipeline({
        seriesId: SERIES_ID,
        episodeNumber: EPISODE,
        force: ["script"],
        stopAfter: "tts",
      });
    },
  },

  {
    name: "3a. 이미지 프롬프트 — 스타일 고정 + 실존 요소 배제",
    run: async () => {
      const bible = await paths.readJsonIfExists<Bible>(paths.biblePath(SERIES_ID));
      const script = await loadArtifact<Script>("script");
      const prompts = await loadArtifact<ImagePrompt[]>("image_prompts");
      assert(bible, "바이블이 없습니다.");

      assert(
        prompts.length === script.narration_script.length,
        `프롬프트 수(${prompts.length})가 씬 수(${script.narration_script.length})와 다릅니다.`,
      );

      const sceneIds = script.narration_script.map((s) => s.scene_id);
      assert(
        prompts.every((p, i) => p.scene_id === sceneIds[i]),
        "프롬프트 순서가 씬 순서와 일치하지 않습니다.",
      );

      for (const p of prompts) {
        assert(
          p.image_prompt.toLowerCase().startsWith(bible.art_style.trim().toLowerCase()),
          `${p.scene_id}: 스타일 고정 접두어가 앞에 없습니다.`,
        );
        const neg = p.negative_prompt.toLowerCase();
        for (const kw of ["flags", "insignia", "logos", "people"]) {
          assert(neg.includes(kw), `${p.scene_id}: negative_prompt에 "${kw}" 가드가 없습니다.`);
        }
      }

      // 보정 함수가 멱등인지 (두 번 적용해도 프롬프트가 늘어나지 않는지)
      const again = enforcePromptInvariants(prompts, bible);
      assert(
        again.every((p, i) => p.image_prompt === prompts[i].image_prompt),
        "enforcePromptInvariants가 멱등하지 않습니다.",
      );

      return `프롬프트 ${prompts.length}개, 스타일·네거티브 가드 통과`;
    },
    repair: async () => {
      await rm(paths.artifactPath(SERIES_ID, EPISODE, "image_prompts"), { force: true });
      await runEpisodePipeline({
        seriesId: SERIES_ID,
        episodeNumber: EPISODE,
        force: ["image_prompts", "images"],
        stopAfter: "tts",
      });
    },
  },

  {
    name: "3b. 이미지 파일 실재 + PNG 유효성",
    run: async () => {
      const images = await loadArtifact<GeneratedImage[]>("images");
      const script = await loadArtifact<Script>("script");
      assert(images.length === script.narration_script.length, "이미지 수가 씬 수와 다릅니다.");

      for (const img of images) {
        const size = await sizeOf(img.image_path);
        assert(size > 1024, `${img.scene_id}: 이미지가 비어 있습니다 (${size}B).`);
        const head = await readFile(img.image_path).then((b) => b.subarray(0, 8));
        assert(
          head.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
          `${img.scene_id}: PNG 시그니처가 아닙니다.`,
        );
      }
      return `${images.length}장 (provider=${images[0]?.provider})`;
    },
    repair: async () => {
      await rm(paths.imagesDir(EP_ID), { recursive: true, force: true });
      await runEpisodePipeline({
        seriesId: SERIES_ID,
        episodeNumber: EPISODE,
        force: ["images"],
        stopAfter: "tts",
      });
    },
  },

  {
    name: "4. TTS 오디오 + 실측 길이 반영",
    run: async () => {
      const tts = await loadArtifact<TtsResult[]>("tts");
      const script = await loadArtifact<Script>("script");
      assert(tts.length === script.narration_script.length, "오디오 수가 씬 수와 다릅니다.");

      for (const r of tts) {
        assert(await sizeOf(r.audio_path) > 512, `${r.scene_id}: 오디오가 비어 있습니다.`);
        const measured = await probeDuration(r.audio_path);
        assert(
          Math.abs(measured - r.duration_actual_sec) < 0.5,
          `${r.scene_id}: 기록된 길이(${r.duration_actual_sec}s)와 실제(${measured}s)가 다릅니다.`,
        );
      }

      // 대본 씬에도 실측 길이가 반영되어야 5단계 타이밍이 맞는다.
      for (const s of script.narration_script) {
        assert(
          typeof s.duration_actual_sec === "number" && s.duration_actual_sec > 0,
          `${s.scene_id}: 대본에 duration_actual_sec이 반영되지 않았습니다.`,
        );
        assert(typeof s.audio_path === "string", `${s.scene_id}: 대본에 audio_path가 없습니다.`);
      }

      const total = tts.reduce((a, r) => a + r.duration_actual_sec, 0);
      return `${tts.length}개 / 실측 총 ${Math.round(total)}초`;
    },
    repair: async () => {
      await rm(paths.audioDir(EP_ID), { recursive: true, force: true });
      await runEpisodePipeline({
        seriesId: SERIES_ID,
        episodeNumber: EPISODE,
        force: ["tts"],
        stopAfter: "tts",
      });
    },
  },

  {
    name: "5a. 타임라인 계산 (크로스페이드 겹침)",
    run: async () => {
      const props = {
        series_title: "T",
        episode_title: "E",
        episode_number: 1,
        cliffhanger_summary: "C",
        title_seconds: 2,
        outro_seconds: 2,
        crossfade_seconds: 0.5,
        bgm_volume: 0.1,
        scenes: [
          { scene_id: "a", image_src: "a.png", audio_src: "a.mp3", narration_text: "a", duration_actual_sec: 5, mood_tag: "전환" as const },
          { scene_id: "b", image_src: "b.png", audio_src: "b.mp3", narration_text: "b", duration_actual_sec: 5, mood_tag: "전투" as const },
        ],
      };
      const fps = 30;
      const t = buildTimeline(props, fps);

      assert(t.titleFrames === 60, `타이틀 프레임 오류: ${t.titleFrames}`);
      assert(t.scenes[0].from === 60, `첫 씬 시작 오류: ${t.scenes[0].from}`);
      // 두 번째 씬은 앞 씬과 crossfade(15프레임)만큼 겹쳐 시작해야 한다.
      assert(t.scenes[1].from === 60 + 150 - 15, `크로스페이드 겹침 오류: ${t.scenes[1].from}`);
      assert(t.outroFrom === t.scenes[1].from + 150, `아웃트로 시작 오류: ${t.outroFrom}`);
      assert(t.totalFrames === t.outroFrom + 60, `전체 길이 오류: ${t.totalFrames}`);

      // 씬이 없어도 최소 1프레임 이상이어야 컴포지션이 성립한다.
      assert(buildTimeline({ ...props, scenes: [] }, fps).totalFrames > 0, "빈 씬 타임라인 오류");
      return `총 ${t.totalFrames}프레임`;
    },
  },

  {
    name: "5b. ffmpeg 렌더러 (초안)",
    run: async () => {
      const result = await renderDraft("ffmpeg");
      return `${result.video_path} (${result.duration_sec.toFixed(1)}초)`;
    },
    repair: async () => {
      await rm(paths.videoPath(EP_ID), { force: true });
    },
  },

  {
    name: "5c. Remotion 렌더러 (초안)",
    run: async () => {
      const result = await renderDraft("remotion");
      assert(result.renderer === "remotion", "Remotion 렌더러가 쓰이지 않았습니다.");
      return `${result.video_path} (${result.duration_sec.toFixed(1)}초)`;
    },
    repair: async () => {
      await rm(paths.videoPath(EP_ID), { force: true });
    },
  },

  {
    name: "6. 업로드 메타데이터 + dry-run 로그",
    run: async () => {
      const bible = await paths.readJsonIfExists<Bible>(paths.biblePath(SERIES_ID));
      const script = await loadArtifact<Script>("script");
      assert(bible, "바이블이 없습니다.");

      const meta = buildVideoMetadata({ bible, script });
      assert(meta.title.length > 0 && meta.title.length <= 100, `제목 길이 오류: ${meta.title.length}`);
      assert(meta.description.length <= 5000, "설명이 5000자를 넘습니다.");
      assert(meta.tags.length > 0 && meta.tags.length <= 25, `태그 수 오류: ${meta.tags.length}`);
      assert(meta.privacyStatus === "private", "기본 공개 상태는 private이어야 합니다.");
      assert(
        meta.description.includes("가상"),
        "설명에 가상 창작물 고지가 없습니다.",
      );

      await rm(paths.uploadLogPath(), { force: true });
      const run = await runEpisodePipeline({
        seriesId: SERIES_ID,
        episodeNumber: EPISODE,
        upload: true,
        dryRunUpload: true,
        force: ["upload"],
        render: DRAFT_RENDER,
      });
      assert(run.ok, `업로드 단계 실패: ${run.logs.find((l) => l.status === "failed")?.error}`);
      assert(run.upload, "업로드 결과가 없습니다.");
      assert(run.upload.privacy_status === "private", "기본 privacyStatus가 private이 아닙니다.");

      const log = await paths.readJsonIfExists<UploadLogEntry[]>(paths.uploadLogPath());
      assert(log && log.length === 1, "upload_log.json 기록이 없습니다.");
      assert(log[0].video_id === run.upload.video_id, "로그의 video_id가 일치하지 않습니다.");
      assert(typeof log[0].timestamp === "string", "로그에 timestamp가 없습니다.");

      return `${meta.title} / 태그 ${meta.tags.length}개 / 로그 1건`;
    },
    repair: async () => {
      await rm(paths.artifactPath(SERIES_ID, EPISODE, "upload"), { force: true });
      await rm(paths.uploadLogPath(), { force: true });
    },
  },

  {
    name: "7a. 단계 캐시 재사용 + force 재실행",
    run: async () => {
      const cachedRun = await runEpisodePipeline({
        seriesId: SERIES_ID,
        episodeNumber: EPISODE,
        stopAfter: "tts",
      });
      assert(cachedRun.ok, "캐시 재사용 실행이 실패했습니다.");
      const reused = cachedRun.logs.filter((l) => l.status === "skipped_cached").map((l) => l.step);
      for (const step of ["script", "image_prompts", "images", "tts"]) {
        assert(reused.includes(step as never), `${step}가 캐시되지 않고 다시 실행됐습니다.`);
      }

      const forced = await runEpisodePipeline({
        seriesId: SERIES_ID,
        episodeNumber: EPISODE,
        force: ["script"],
        stopAfter: "script",
      });
      assert(forced.ok, "force 재실행이 실패했습니다.");
      assert(
        forced.logs.find((l) => l.step === "script")?.status === "ok",
        "force를 줬는데도 캐시가 쓰였습니다.",
      );

      return `캐시 ${reused.length}단계 재사용, force 동작 확인`;
    },
  },

  {
    name: "7b. run.log.json — 실패 지점 기록",
    run: async () => {
      const logPath = join(paths.episodeDir(SERIES_ID, EPISODE), "run.log.json");
      const log = await paths.readJsonIfExists<{ ok: boolean; logs: unknown[] }>(logPath);
      assert(log, "run.log.json이 없습니다.");
      assert(Array.isArray(log.logs) && log.logs.length > 0, "단계 로그가 비어 있습니다.");

      // 존재하지 않는 시리즈로 강제 실패시켜 failed_step이 기록되는지 확인한다.
      const prevKey = process.env.ANTHROPIC_API_KEY;
      const prevMock = process.env.PIPELINE_MOCK;
      process.env.PIPELINE_MOCK = "0";
      delete process.env.ANTHROPIC_API_KEY;
      try {
        const failing = await runEpisodePipeline({
          seriesId: "verify-failure-series",
          episodeNumber: 1,
        });
        assert(!failing.ok, "키 없이도 성공했습니다 — 실패 경로가 동작하지 않습니다.");
        assert(failing.failed_step === "bible", `실패 단계 기록 오류: ${failing.failed_step}`);
        assert(
          failing.logs.some((l) => l.status === "failed" && l.error),
          "실패 로그에 오류 메시지가 없습니다.",
        );
      } finally {
        if (prevKey) process.env.ANTHROPIC_API_KEY = prevKey;
        if (prevMock) process.env.PIPELINE_MOCK = prevMock;
        await rm(paths.seriesDir("verify-failure-series"), { recursive: true, force: true });
      }
      return "성공·실패 양쪽 모두 기록됨";
    },
  },

  {
    name: "7c. API route — 입력 검증 + 실행 로그 조회",
    run: async () => {
      const route = await import("../app/api/generate-episode/route");

      const bad = await route.POST(
        new Request("http://localhost/api/generate-episode", {
          method: "POST",
          body: JSON.stringify({ episode_number: 1 }),
        }),
      );
      assert(bad.status === 400, `series_id 누락인데 ${bad.status}를 반환했습니다.`);

      const badEpisode = await route.POST(
        new Request("http://localhost/api/generate-episode", {
          method: "POST",
          body: JSON.stringify({ series_id: SERIES_ID, episode_number: 0 }),
        }),
      );
      assert(badEpisode.status === 400, `episode_number=0인데 ${badEpisode.status}를 반환했습니다.`);

      const ok = await route.POST(
        new Request("http://localhost/api/generate-episode", {
          method: "POST",
          body: JSON.stringify({
            series_id: SERIES_ID,
            episode_number: EPISODE,
            stop_after: "tts",
          }),
        }),
      );
      assert(ok.status === 200, `정상 요청인데 ${ok.status}를 반환했습니다.`);
      const okBody = (await ok.json()) as { ok: boolean; episode_id: string };
      assert(okBody.ok, "API 응답의 ok가 false입니다.");
      assert(okBody.episode_id === EP_ID, `episode_id 오류: ${okBody.episode_id}`);

      const got = await route.GET(
        new Request(
          `http://localhost/api/generate-episode?series_id=${SERIES_ID}&episode_number=${EPISODE}`,
        ),
      );
      assert(got.status === 200, `GET이 ${got.status}를 반환했습니다.`);

      const missing = await route.GET(
        new Request("http://localhost/api/generate-episode?series_id=nope&episode_number=99"),
      );
      assert(missing.status === 404, `없는 기록인데 ${missing.status}를 반환했습니다.`);

      return "400 / 200 / 404 응답 정상";
    },
  },

  {
    name: "7d. 다음 화 컨텍스트 연결 (2화가 1화 요약을 받는지)",
    run: async () => {
      const { loadPreviousSummary } = await import("../lib/pipeline/script");
      const first = await loadArtifact<Script>("script");

      const summary = await loadPreviousSummary(SERIES_ID, 2);
      assert(summary === first.episode_summary_for_next, "2화가 1화 요약을 받지 못했습니다.");
      assert((await loadPreviousSummary(SERIES_ID, 1)) === null, "1화인데 직전 요약이 있습니다.");

      const run = await runEpisodePipeline({
        seriesId: SERIES_ID,
        episodeNumber: 2,
        stopAfter: "script",
      });
      assert(run.ok, "2화 대본 생성이 실패했습니다.");
      const second = await paths.readJsonIfExists<Script>(
        paths.artifactPath(SERIES_ID, 2, "script"),
      );
      assert(second?.episode_number === 2, "2화 산출물의 episode_number가 잘못됐습니다.");
      assert(second.series_id === SERIES_ID, "2화 산출물의 series_id가 잘못됐습니다.");

      return "1화 → 2화 요약 전달 확인";
    },
    repair: async () => {
      await rm(paths.episodeDir(SERIES_ID, 2), { recursive: true, force: true });
    },
  },

  {
    name: "8. 경로 안전성 (경로 조작 차단)",
    run: async () => {
      const id = paths.safeId("../../etc/passwd");
      assert(!id.includes("/") && !id.includes(".."), `safeId가 경로 조각을 남겼습니다: ${id}`);
      assert(paths.seriesDir("a/../b").startsWith(join(paths.DATA_DIR, "series")), "seriesDir 탈출");

      let threw = false;
      try {
        paths.safeId("///");
      } catch {
        threw = true;
      }
      assert(threw, "빈 식별자를 거르지 못했습니다.");
      return `safeId("../../etc/passwd") = ${id}`;
    },
  },
];

async function renderDraft(renderer: "ffmpeg" | "remotion"): Promise<AssembleResult> {
  const bible = await paths.readJsonIfExists<Bible>(paths.biblePath(SERIES_ID));
  assert(bible, "바이블이 없습니다.");
  const script = await loadArtifact<Script>("script");
  const images = await loadArtifact<GeneratedImage[]>("images");
  const tts = await loadArtifact<TtsResult[]>("tts");

  const input = buildAssembleInput({
    script,
    images,
    tts,
    seriesTitle: bible.series_title,
    episodeId: EP_ID,
  });

  const result = await assembleEpisode(input, { ...DRAFT_RENDER, renderer });

  assert(result.renderer === renderer, `요청한 렌더러(${renderer})가 쓰이지 않았습니다.`);
  assert(await sizeOf(result.video_path) > 4096, "영상 파일이 너무 작습니다.");

  const scenes = input.scenes.slice(0, DRAFT_RENDER.maxScenes);
  const expected =
    DRAFT_RENDER.titleSeconds +
    DRAFT_RENDER.outroSeconds +
    scenes.reduce((a, s) => a + Math.min(s.duration_actual_sec, DRAFT_RENDER.maxSceneSeconds), 0);
  // Remotion은 크로스페이드만큼 겹치므로 기대값보다 짧다. 폭넓게만 확인한다.
  assert(
    result.duration_sec > expected * 0.6 && result.duration_sec < expected * 1.4,
    `영상 길이(${result.duration_sec.toFixed(1)}초)가 기대치(${expected.toFixed(1)}초)와 크게 다릅니다.`,
  );
  return result;
}

/* ── 정적 검사 ──────────────────────────────────────────────────── */

const staticChecks: Check[] = [
  {
    name: "S1. 타입 검사 (tsc --noEmit)",
    run: async () => {
      await exec("npx", ["tsc", "--noEmit"], { maxBuffer: 16 * 1024 * 1024 });
      return "타입 오류 없음";
    },
  },
  {
    name: "S2. 단위 테스트 (vitest)",
    run: async () => {
      const { stdout, stderr } = await exec("npx", ["vitest", "run", "--reporter=dot"], {
        maxBuffer: 16 * 1024 * 1024,
        env: { ...process.env, CI: "1" },
      });
      const out = `${stdout}${stderr}`;
      const match = out.match(/Tests\s+(\d+) passed/);
      return match ? `${match[1]}개 통과` : "통과";
    },
  },
  {
    name: "S3. 린트 (eslint — 파이프라인 코드)",
    run: async () => {
      // 저장소 전체(`npm run lint`)에는 이 작업 이전부터 있던 위반이 남아 있어,
      // 여기서는 파이프라인이 추가한 코드만 검사한다.
      await exec(
        "npx",
        ["eslint", "lib/pipeline", "lib/prompts", "remotion", "scripts", "tests", "app/api/generate-episode"],
        { maxBuffer: 16 * 1024 * 1024 },
      );
      return "린트 통과";
    },
  },
  {
    name: "S4. 빌드 (next build)",
    run: async () => {
      await exec("npx", ["next", "build"], {
        maxBuffer: 64 * 1024 * 1024,
        timeout: 600_000,
        env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      });
      return "빌드 성공";
    },
  },
];

/* ── 실행 루프 ──────────────────────────────────────────────────── */

function errorText(err: unknown): string {
  if (err instanceof Error) {
    const withOutput = err as Error & { stdout?: string; stderr?: string };
    const extra = [withOutput.stdout, withOutput.stderr].filter(Boolean).join("\n").trim();
    return extra ? `${err.message}\n${extra.slice(-4000)}` : err.message;
  }
  return String(err);
}

const all = QUICK ? checks : [...checks, ...staticChecks];
const selected = ONLY ? all.filter((c) => c.name.toLowerCase().includes(ONLY.toLowerCase())) : all;

if (selected.length === 0) {
  console.error(`--only "${ONLY}"에 해당하는 체크가 없습니다.`);
  process.exit(1);
}

console.log(
  `\n검증 시작 — 체크 ${selected.length}개 / 최대 ${MAX_ATTEMPTS}회 자동 재시도 ` +
    `(PIPELINE_MOCK=${process.env.PIPELINE_MOCK})\n`,
);

// 매 실행이 깨끗한 상태에서 시작하도록 이전 검증 산출물을 지운다.
if (!ONLY) await wipeSeries();

const failures: { name: string; error: string }[] = [];
let passed = 0;

for (const check of selected) {
  const started = Date.now();
  let lastError: unknown;
  let ok = false;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const detail = await check.run();
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      const retry = attempt > 1 ? ` (자동 복구 ${attempt - 1}회 후)` : "";
      console.log(`✓ ${check.name} — ${detail ?? "통과"}${retry}  [${seconds}s]`);
      ok = true;
      passed++;
      break;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS && check.repair) {
        console.log(
          `  ↻ ${check.name} 실패(${attempt}/${MAX_ATTEMPTS}) — 자동 복구 후 재시도\n` +
            `    ${errorText(err).split("\n")[0]}`,
        );
        try {
          await check.repair(err instanceof Error ? err : new Error(String(err)), attempt);
        } catch (repairErr) {
          console.log(`    복구 실패: ${errorText(repairErr).split("\n")[0]}`);
          break;
        }
      } else {
        break;
      }
    }
  }

  if (!ok) {
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`✗ ${check.name}  [${seconds}s]\n${indent(errorText(lastError))}`);
    failures.push({ name: check.name, error: errorText(lastError) });
  }
}

function indent(text: string): string {
  return text
    .split("\n")
    .map((l) => `    ${l}`)
    .join("\n");
}

console.log(`\n${"─".repeat(60)}`);
console.log(`통과 ${passed}/${selected.length}`);

if (failures.length) {
  console.log(`\n실패한 체크:`);
  for (const f of failures) console.log(`  ✗ ${f.name}`);
  process.exit(1);
}

console.log("모든 체크 통과\n");
