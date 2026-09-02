import { join } from "path";
import { ensureSeriesBible, loadSeriesBible } from "./bible";
import {
  generateEpisodeScript,
  loadPreviousSummary,
  saveEpisodeScript,
} from "./script";
import {
  generateImagePrompts,
  renderSceneImages,
  saveGeneratedImages,
  saveImagePrompts,
} from "./images";
import {
  applyTtsResults,
  generateTtsLines,
  saveTtsLines,
  saveTtsResults,
  synthesizeEpisodeAudio,
} from "./tts";
import {
  assembleEpisode,
  buildAssembleInput,
  saveAssembleResult,
  type RenderOptions,
} from "./assemble";
import {
  appendUploadLog,
  buildVideoMetadata,
  saveUploadResult,
  uploadToYouTube,
  youtubeConfigured,
} from "./upload";
import {
  artifactPath,
  episodeDir,
  episodeId as makeEpisodeId,
  fileExists,
  imagesDir,
  readJsonIfExists,
  writeJson,
} from "./paths";
import type {
  AssembleResult,
  EpisodeRunResult,
  EpisodeScript,
  GeneratedImage,
  ImagePrompt,
  PipelineStep,
  PrivacyStatus,
  SeriesBible,
  StepLog,
  TtsLine,
  TtsResult,
  UploadResult,
} from "./types";

export interface RunEpisodeOptions {
  seriesId: string;
  episodeNumber: number;
  /** 바이블이 없을 때 생성에 쓸 방향 */
  seriesBrief?: string;
  toneAndManner?: string;
  extraDirection?: string;
  /** 이 단계들은 캐시를 무시하고 다시 실행한다 */
  force?: PipelineStep[];
  /** 여기까지만 실행하고 멈춘다 */
  stopAfter?: PipelineStep;
  upload?: boolean;
  privacyStatus?: PrivacyStatus;
  /** 썸네일로 쓸 씬 id. 미지정 시 첫 씬 이미지 */
  thumbnailSceneId?: string;
  render?: RenderOptions;
  dryRunUpload?: boolean;
}

const STEP_ORDER: PipelineStep[] = [
  "bible",
  "script",
  "image_prompts",
  "images",
  "tts",
  "assemble",
  "upload",
];

function shouldStop(stopAfter: PipelineStep | undefined, current: PipelineStep): boolean {
  if (!stopAfter) return false;
  return STEP_ORDER.indexOf(current) > STEP_ORDER.indexOf(stopAfter);
}

class StepRecorder {
  readonly logs: StepLog[] = [];

  async run<T>(
    step: PipelineStep,
    load: () => Promise<T | null>,
    produce: () => Promise<{ value: T; detail?: string }>,
  ): Promise<T> {
    const started = Date.now();
    const started_at = new Date(started).toISOString();

    const finish = (status: StepLog["status"], extra: Partial<StepLog> = {}) => {
      const finished = Date.now();
      this.logs.push({
        step,
        status,
        started_at,
        finished_at: new Date(finished).toISOString(),
        duration_ms: finished - started,
        ...extra,
      });
    };

    try {
      const cached = await load();
      if (cached !== null) {
        finish("skipped_cached", { detail: "기존 산출물 재사용" });
        return cached;
      }

      const { value, detail } = await produce();
      finish("ok", { detail });
      return value;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      finish("failed", { error: message });
      throw new PipelineStepError(step, message, { cause: err });
    }
  }
}

export class PipelineStepError extends Error {
  constructor(
    readonly step: PipelineStep,
    message: string,
    options?: ErrorOptions,
  ) {
    super(`[${step}] ${message}`, options);
    this.name = "PipelineStepError";
  }
}

/**
 * 7단계 — 1~6단계를 순서대로 실행한다.
 *
 * 각 단계 산출물은 data/series/{seriesId}/episodes/{n}/ 아래에 남고,
 * 이미 있으면 재사용하므로 특정 단계만 다시 돌릴 수 있다(force로 무효화).
 */
export async function runEpisodePipeline(
  options: RunEpisodeOptions,
): Promise<EpisodeRunResult> {
  const { seriesId, episodeNumber } = options;
  const epId = makeEpisodeId(seriesId, episodeNumber);
  const force = new Set(options.force ?? []);
  const recorder = new StepRecorder();
  const artifacts: Partial<Record<PipelineStep, string>> = {};

  const cached = <T>(step: PipelineStep, name: string) => async (): Promise<T | null> =>
    force.has(step) ? null : readJsonIfExists<T>(artifactPath(seriesId, episodeNumber, name));

  try {
    /* 1단계 — 시리즈 바이블 */
    const bible = await recorder.run<SeriesBible>(
      "bible",
      async () => (force.has("bible") ? null : loadSeriesBible(seriesId)),
      async () => {
        const { bible, path } = await ensureSeriesBible({
          seriesId,
          brief: options.seriesBrief,
          toneAndManner: options.toneAndManner,
        });
        artifacts.bible = path;
        return { value: bible, detail: `세력 ${bible.factions.length} / 인물 ${bible.characters.length}` };
      },
    );
    if (shouldStop(options.stopAfter, "script")) {
      return finalize({ seriesId, episodeNumber, epId, recorder, artifacts, ok: true });
    }

    /* 2단계 — 대본 */
    const script = await recorder.run<EpisodeScript>(
      "script",
      cached<EpisodeScript>("script", "script"),
      async () => {
        const previousSummary = await loadPreviousSummary(seriesId, episodeNumber);
        const value = await generateEpisodeScript({
          bible,
          episodeNumber,
          previousSummary,
          extraDirection: options.extraDirection,
        });
        artifacts.script = await saveEpisodeScript(value);
        return { value, detail: `씬 ${value.narration_script.length}개` };
      },
    );
    artifacts.script ??= artifactPath(seriesId, episodeNumber, "script");
    if (shouldStop(options.stopAfter, "image_prompts")) {
      return finalize({ seriesId, episodeNumber, epId, recorder, artifacts, ok: true });
    }

    /* 3단계-a — 이미지 프롬프트 */
    const prompts = await recorder.run<ImagePrompt[]>(
      "image_prompts",
      cached<ImagePrompt[]>("image_prompts", "image_prompts"),
      async () => {
        const value = await generateImagePrompts({ bible, scenes: script.narration_script });
        artifacts.image_prompts = await saveImagePrompts(seriesId, episodeNumber, value);
        return { value, detail: `프롬프트 ${value.length}개` };
      },
    );
    artifacts.image_prompts ??= artifactPath(seriesId, episodeNumber, "image_prompts");
    if (shouldStop(options.stopAfter, "images")) {
      return finalize({ seriesId, episodeNumber, epId, recorder, artifacts, ok: true });
    }

    /* 3단계-b — 이미지 생성 */
    const images = await recorder.run<GeneratedImage[]>(
      "images",
      async () => {
        if (force.has("images")) return null;
        const saved = await readJsonIfExists<GeneratedImage[]>(
          artifactPath(seriesId, episodeNumber, "images"),
        );
        if (!saved) return null;
        // 산출물 JSON은 있는데 실제 파일이 지워졌으면 다시 만든다.
        for (const img of saved) {
          if (!(await fileExists(img.image_path))) return null;
        }
        return saved;
      },
      async () => {
        const value = await renderSceneImages({ episodeId: epId, prompts });
        artifacts.images = await saveGeneratedImages(seriesId, episodeNumber, value);
        return { value, detail: `이미지 ${value.length}장 (${value[0]?.provider ?? "-"})` };
      },
    );
    artifacts.images ??= artifactPath(seriesId, episodeNumber, "images");
    if (shouldStop(options.stopAfter, "tts")) {
      return finalize({ seriesId, episodeNumber, epId, recorder, artifacts, ok: true });
    }

    /* 4단계 — TTS */
    const tts = await recorder.run<TtsResult[]>(
      "tts",
      async () => {
        if (force.has("tts")) return null;
        const saved = await readJsonIfExists<TtsResult[]>(
          artifactPath(seriesId, episodeNumber, "tts"),
        );
        if (!saved) return null;
        for (const r of saved) {
          if (!(await fileExists(r.audio_path))) return null;
        }
        return saved;
      },
      async () => {
        const lines =
          (!force.has("tts") &&
            (await readJsonIfExists<TtsLine[]>(
              artifactPath(seriesId, episodeNumber, "tts_lines"),
            ))) ||
          (await generateTtsLines({ bible, scenes: script.narration_script }));
        await saveTtsLines(seriesId, episodeNumber, lines);

        const value = await synthesizeEpisodeAudio({ episodeId: epId, lines });
        artifacts.tts = await saveTtsResults(seriesId, episodeNumber, value);

        // 실측 길이를 대본 씬 메타데이터에 반영해 둔다.
        const updated: EpisodeScript = {
          ...script,
          narration_script: applyTtsResults(script.narration_script, value),
        };
        await saveEpisodeScript(updated);

        const total = value.reduce((a, r) => a + r.duration_actual_sec, 0);
        return { value, detail: `총 ${Math.round(total)}초` };
      },
    );
    artifacts.tts ??= artifactPath(seriesId, episodeNumber, "tts");
    if (shouldStop(options.stopAfter, "assemble")) {
      return finalize({ seriesId, episodeNumber, epId, recorder, artifacts, ok: true });
    }

    /* 5단계 — 조립 */
    const assembled = await recorder.run<AssembleResult>(
      "assemble",
      async () => {
        if (force.has("assemble")) return null;
        const saved = await readJsonIfExists<AssembleResult>(
          artifactPath(seriesId, episodeNumber, "assemble"),
        );
        if (!saved || !(await fileExists(saved.video_path))) return null;
        return saved;
      },
      async () => {
        const input = buildAssembleInput({
          script,
          images,
          tts,
          seriesTitle: bible.series_title,
          episodeId: epId,
        });
        const value = await assembleEpisode(input, options.render ?? {});
        artifacts.assemble = await saveAssembleResult(seriesId, episodeNumber, value);
        return { value, detail: `${value.renderer} / ${Math.round(value.duration_sec)}초` };
      },
    );
    artifacts.assemble ??= artifactPath(seriesId, episodeNumber, "assemble");

    /* 6단계 — 업로드 (선택) */
    let upload: UploadResult | undefined;
    const wantUpload = options.upload === true && !shouldStop(options.stopAfter, "upload");

    if (wantUpload) {
      upload = await recorder.run<UploadResult>(
        "upload",
        async () => {
          if (force.has("upload")) return null;
          return readJsonIfExists<UploadResult>(artifactPath(seriesId, episodeNumber, "upload"));
        },
        async () => {
          const dryRun = options.dryRunUpload ?? !youtubeConfigured();
          const metadata = buildVideoMetadata({
            bible,
            script,
            privacyStatus: options.privacyStatus,
          });
          const thumbSceneId = options.thumbnailSceneId ?? images[0]?.scene_id;
          const thumbnailPath = thumbSceneId
            ? join(imagesDir(epId), `${thumbSceneId}.png`)
            : undefined;

          const value = await uploadToYouTube({
            videoPath: assembled.video_path,
            metadata,
            thumbnailPath:
              thumbnailPath && (await fileExists(thumbnailPath)) ? thumbnailPath : undefined,
            dryRun,
          });

          artifacts.upload = await saveUploadResult(seriesId, episodeNumber, value);
          await appendUploadLog({
            ...value,
            series_id: seriesId,
            episode_number: episodeNumber,
            video_path: assembled.video_path,
          });
          return { value, detail: dryRun ? "dry-run" : value.url };
        },
      );
      artifacts.upload ??= artifactPath(seriesId, episodeNumber, "upload");
    }

    return finalize({
      seriesId,
      episodeNumber,
      epId,
      recorder,
      artifacts,
      ok: true,
      videoPath: assembled.video_path,
      upload,
    });
  } catch (err) {
    const step = err instanceof PipelineStepError ? err.step : undefined;
    return finalize({
      seriesId,
      episodeNumber,
      epId,
      recorder,
      artifacts,
      ok: false,
      failedStep: step,
    });
  }
}

async function finalize(args: {
  seriesId: string;
  episodeNumber: number;
  epId: string;
  recorder: StepRecorder;
  artifacts: Partial<Record<PipelineStep, string>>;
  ok: boolean;
  failedStep?: PipelineStep;
  videoPath?: string;
  upload?: UploadResult;
}): Promise<EpisodeRunResult> {
  const result: EpisodeRunResult = {
    series_id: args.seriesId,
    episode_number: args.episodeNumber,
    episode_id: args.epId,
    ok: args.ok,
    failed_step: args.failedStep,
    logs: args.recorder.logs,
    artifacts: args.artifacts,
    video_path: args.videoPath,
    upload: args.upload,
  };

  // 어디서 멈췄는지 항상 파일로 남긴다.
  await writeJson(join(episodeDir(args.seriesId, args.episodeNumber), "run.log.json"), result);
  return result;
}
