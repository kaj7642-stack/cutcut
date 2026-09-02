import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join, relative, sep } from "path";
import { bgmPathFor, ensureBgmTracks } from "./bgm";
import {
  artifactPath,
  ensureDir,
  fileExists,
  OUTPUT_DIR,
  videoPath,
  writeJson,
} from "./paths";
import { probeDuration, runFfmpeg } from "./providers/media";
import { buildTimeline, FPS, type EpisodeProps, type RemotionScene } from "../../remotion/schema";
import type {
  AssembleInput,
  AssembleResult,
  AssembleScene,
  EpisodeScript,
  GeneratedImage,
  TtsResult,
} from "./types";

export interface RenderOptions {
  /** 기본값은 PIPELINE_RENDERER 환경변수, 그다음 "remotion" */
  renderer?: "remotion" | "ffmpeg" | "auto";
  width?: number;
  height?: number;
  fps?: number;
  /** 검증용 초안 렌더: 앞에서 N개 씬만 사용 */
  maxScenes?: number;
  /** 씬 길이 상한(초). 검증용 초안에서 렌더 시간을 줄일 때 쓴다. */
  maxSceneSeconds?: number;
  concurrency?: number;
  crf?: number;
  titleSeconds?: number;
  outroSeconds?: number;
  crossfadeSeconds?: number;
  bgmVolume?: number;
  onProgress?: (progress: number) => void;
}

/** 3·4단계 산출물을 조립 입력으로 합친다. */
export function buildAssembleInput(args: {
  script: EpisodeScript;
  images: GeneratedImage[];
  tts: TtsResult[];
  seriesTitle: string;
  episodeId: string;
}): AssembleInput {
  const imageById = new Map(args.images.map((i) => [i.scene_id, i]));
  const ttsById = new Map(args.tts.map((t) => [t.scene_id, t]));

  const scenes: AssembleScene[] = args.script.narration_script.map((s) => {
    const image = imageById.get(s.scene_id);
    const audio = ttsById.get(s.scene_id);
    if (!image) throw new Error(`씬 ${s.scene_id}의 이미지가 없습니다.`);
    if (!audio) throw new Error(`씬 ${s.scene_id}의 오디오가 없습니다.`);
    return {
      scene_id: s.scene_id,
      image_path: image.image_path,
      audio_path: audio.audio_path,
      narration_text: s.narration_text,
      duration_actual_sec: audio.duration_actual_sec,
      mood_tag: s.mood_tag,
    };
  });

  return {
    series_id: args.script.series_id,
    episode_id: args.episodeId,
    series_title: args.seriesTitle,
    episode_title: args.script.episode_title,
    episode_number: args.script.episode_number,
    cliffhanger_summary: args.script.cliffhanger_summary,
    scenes,
  };
}

/** OUTPUT_DIR 기준 상대 경로 (Remotion staticFile()용, 항상 POSIX 구분자). */
function toPublicPath(absolute: string): string {
  const rel = relative(OUTPUT_DIR, absolute);
  if (rel.startsWith("..")) {
    throw new Error(
      `조립 대상 파일이 출력 디렉터리 밖에 있습니다: ${absolute} (OUTPUT_DIR=${OUTPUT_DIR})`,
    );
  }
  return rel.split(sep).join("/");
}

function applyLimits(input: AssembleInput, options: RenderOptions): AssembleScene[] {
  let scenes = input.scenes;
  if (options.maxScenes && options.maxScenes > 0) scenes = scenes.slice(0, options.maxScenes);
  if (options.maxSceneSeconds && options.maxSceneSeconds > 0) {
    scenes = scenes.map((s) => ({
      ...s,
      duration_actual_sec: Math.min(s.duration_actual_sec, options.maxSceneSeconds!),
    }));
  }
  return scenes;
}

export async function buildEpisodeProps(
  input: AssembleInput,
  options: RenderOptions = {},
): Promise<EpisodeProps> {
  await ensureBgmTracks();
  const scenes = applyLimits(input, options);

  const remotionScenes: RemotionScene[] = scenes.map((s) => ({
    scene_id: s.scene_id,
    image_src: toPublicPath(s.image_path),
    audio_src: toPublicPath(s.audio_path),
    bgm_src: toPublicPath(bgmPathFor(s.mood_tag)),
    narration_text: s.narration_text,
    duration_actual_sec: s.duration_actual_sec,
    mood_tag: s.mood_tag,
  }));

  return {
    series_title: input.series_title,
    episode_title: input.episode_title,
    episode_number: input.episode_number,
    cliffhanger_summary: input.cliffhanger_summary,
    scenes: remotionScenes,
    title_seconds: options.titleSeconds ?? 4,
    outro_seconds: options.outroSeconds ?? 5,
    crossfade_seconds: options.crossfadeSeconds ?? 0.6,
    bgm_volume: options.bgmVolume ?? 0.14,
  };
}

/* ── Remotion 렌더러 ────────────────────────────────────────────── */

/** REMOTION_BROWSER_EXECUTABLE, 없으면 컨테이너에 설치된 Playwright Chromium을 재사용한다. */
async function findLocalChromium(): Promise<string | undefined> {
  const explicit = process.env.REMOTION_BROWSER_EXECUTABLE;
  if (explicit) return explicit;

  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root) return undefined;

  const { readdir } = await import("fs/promises");
  const entries = await readdir(root).catch(() => [] as string[]);
  const candidates = entries
    .filter((e) => e.startsWith("chromium"))
    .sort()
    .reverse()
    .flatMap((e) => [
      join(root, e, "chrome-linux", "chrome"),
      join(root, e, "chrome-linux", "headless_shell"),
    ]);

  for (const c of candidates) {
    if (await fileExists(c)) return c;
  }
  return undefined;
}

async function renderWithRemotion(
  input: AssembleInput,
  outPath: string,
  options: RenderOptions,
): Promise<AssembleResult> {
  const { bundle } = await import("@remotion/bundler");
  const { renderMedia, selectComposition } = await import("@remotion/renderer");

  const props = await buildEpisodeProps(input, options);
  const fps = options.fps ?? FPS;
  const inputProps = props as unknown as Record<string, unknown>;

  const logLevel = (process.env.REMOTION_LOG_LEVEL as "error" | "warn" | "info") ?? "error";

  const serveUrl = await bundle({
    entryPoint: join(process.cwd(), "remotion", "index.ts"),
    publicDir: OUTPUT_DIR,
    onProgress: () => undefined,
  });

  const browserExecutable = await findLocalChromium();

  const composition = await selectComposition({
    serveUrl,
    id: "Episode",
    inputProps,
    browserExecutable,
    logLevel,
  });

  await renderMedia({
    composition: {
      ...composition,
      fps,
      width: options.width ?? composition.width,
      height: options.height ?? composition.height,
      durationInFrames: buildTimeline(props, fps).totalFrames,
    },
    serveUrl,
    codec: "h264",
    outputLocation: outPath,
    inputProps,
    browserExecutable,
    concurrency: options.concurrency,
    crf: options.crf ?? 20,
    logLevel,
    chromiumOptions: { gl: "swangle" },
    onProgress: options.onProgress
      ? ({ progress }: { progress: number }) => options.onProgress!(progress)
      : undefined,
  });

  return {
    video_path: outPath,
    duration_sec: await probeDuration(outPath),
    renderer: "remotion",
  };
}

/* ── ffmpeg 폴백 렌더러 ─────────────────────────────────────────── */

/** drawtext textfile용 줄바꿈. 한글은 글자 폭이 넓어 보수적으로 끊는다. */
function wrapText(text: string, perLine = 26): string {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > perLine && current) {
      lines.push(current.trim());
      current = w;
    } else {
      current = `${current} ${w}`.trim();
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4).join("\n");
}

function ffPath(p: string): string {
  // filter 인자 안에서 쓰이는 경로 이스케이프
  return p.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

async function renderCard(args: {
  outPath: string;
  lines: { text: string; size: number; color: string; y: string }[];
  seconds: number;
  width: number;
  height: number;
  fps: number;
  tmp: string;
  name: string;
}) {
  const drawtexts: string[] = [];
  for (let i = 0; i < args.lines.length; i++) {
    const file = join(args.tmp, `${args.name}_${i}.txt`);
    await writeFile(file, args.lines[i].text, "utf8");
    drawtexts.push(
      `drawtext=textfile='${ffPath(file)}':fontcolor=${args.lines[i].color}:` +
        `fontsize=${args.lines[i].size}:x=(w-text_w)/2:y=${args.lines[i].y}:` +
        `line_spacing=14:text_align=C`,
    );
  }

  const fadeOut = Math.max(0, args.seconds - 0.6);
  await runFfmpeg([
    "-y",
    "-f", "lavfi",
    "-i", `color=c=0x0b0e13:s=${args.width}x${args.height}:r=${args.fps}:d=${args.seconds}`,
    "-f", "lavfi",
    "-i", `anullsrc=channel_layout=stereo:sample_rate=44100`,
    "-t", String(args.seconds),
    "-vf", `${drawtexts.join(",")},fade=t=in:st=0:d=0.6,fade=t=out:st=${fadeOut}:d=0.6,format=yuv420p`,
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
    "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "2",
    "-shortest",
    args.outPath,
  ]);
}

async function renderSceneSegment(args: {
  scene: AssembleScene;
  index: number;
  outPath: string;
  width: number;
  height: number;
  fps: number;
  crossfade: number;
  bgmVolume: number;
  tmp: string;
}): Promise<void> {
  const { scene, width, height, fps } = args;
  const seconds = Math.max(0.5, scene.duration_actual_sec);
  const frames = Math.max(2, Math.round(seconds * fps));
  const isCombat = scene.mood_tag === "전투";

  // Ken Burns: zoompan으로 천천히 확대/이동. 홀짝으로 방향을 바꾼다.
  const zoomExpr =
    args.index % 2 === 0
      ? `min(1.06+0.0016*on,1.20)`
      : `max(1.20-0.0016*on,1.06)`;
  const panX = args.index % 4 < 2 ? `iw/2-(iw/zoom/2)+on*0.4` : `iw/2-(iw/zoom/2)-on*0.4`;

  const subtitleFile = join(args.tmp, `sub_${scene.scene_id}.txt`);
  await writeFile(subtitleFile, wrapText(scene.narration_text), "utf8");

  const shake = isCombat
    // 전투 씬: 프레임 단위 미세 흔들림 + 밝기 펄스
    ? `,crop=w=iw-24:h=ih-24:x='12+6*sin(n*1.7)':y='12+6*cos(n*2.3)',` +
      `scale=${width}:${height},eq=brightness='0.03*sin(n*0.6)'`
    : "";

  const fadeOut = Math.max(0, seconds - args.crossfade);
  const vf =
    `scale=${width * 2}:-2,` +
    `zoompan=z='${zoomExpr}':x='${panX}':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=${fps}` +
    shake +
    `,drawtext=textfile='${ffPath(subtitleFile)}':fontcolor=0xf5f2ec:fontsize=${Math.round(height / 24)}:` +
    `box=1:boxcolor=0x080a0e@0.45:boxborderw=18:x=(w-text_w)/2:y=h-text_h-${Math.round(height * 0.09)}:` +
    `line_spacing=10:text_align=C,` +
    `fade=t=in:st=0:d=${args.crossfade},fade=t=out:st=${fadeOut}:d=${args.crossfade},format=yuv420p`;

  const bgm = bgmPathFor(scene.mood_tag);
  const hasBgm = await fileExists(bgm);

  const audioFilter = hasBgm
    ? `[1:a]afade=t=in:st=0:d=0.4,afade=t=out:st=${fadeOut}:d=0.6[na];` +
      `[2:a]volume=${args.bgmVolume},afade=t=in:st=0:d=1,afade=t=out:st=${fadeOut}:d=1[bg];` +
      `[na][bg]amix=inputs=2:duration=first:dropout_transition=0,aresample=44100[a]`
    : `[1:a]afade=t=in:st=0:d=0.4,afade=t=out:st=${fadeOut}:d=0.6,aresample=44100[a]`;

  await runFfmpeg([
    "-y",
    "-loop", "1", "-i", scene.image_path,
    "-i", scene.audio_path,
    ...(hasBgm ? ["-stream_loop", "-1", "-i", bgm] : []),
    "-filter_complex", audioFilter,
    "-map", "0:v", "-map", "[a]",
    "-vf", vf,
    "-t", String(seconds),
    "-r", String(fps),
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
    "-c:a", "aac", "-b:a", "160k", "-ac", "2",
    args.outPath,
  ]);
}

/**
 * 브라우저 없이 동작하는 폴백 렌더러.
 * Remotion과 달리 씬 전환은 크로스페이드 대신 페이드 인/아웃으로 처리한다.
 */
async function renderWithFfmpeg(
  input: AssembleInput,
  outPath: string,
  options: RenderOptions,
): Promise<AssembleResult> {
  await ensureBgmTracks();
  const width = options.width ?? 1920;
  const height = options.height ?? 1080;
  const fps = options.fps ?? FPS;
  const crossfade = options.crossfadeSeconds ?? 0.6;
  const bgmVolume = options.bgmVolume ?? 0.14;
  const scenes = applyLimits(input, options);

  const tmp = await mkdtemp(join(tmpdir(), "warpipe-"));
  try {
    const segments: string[] = [];

    const titlePath = join(tmp, "000_title.mp4");
    await renderCard({
      outPath: titlePath,
      seconds: options.titleSeconds ?? 4,
      width,
      height,
      fps,
      tmp,
      name: "title",
      lines: [
        { text: input.series_title, size: Math.round(height / 36), color: "0x8fa3b8", y: "h/2-160" },
        { text: input.episode_title, size: Math.round(height / 14), color: "0xf2ede4", y: "h/2-70" },
        {
          text: `EPISODE ${String(input.episode_number).padStart(2, "0")}`,
          size: Math.round(height / 42),
          color: "0x8fa3b8",
          y: "h/2+70",
        },
      ],
    });
    segments.push(titlePath);

    for (let i = 0; i < scenes.length; i++) {
      const segPath = join(tmp, `${String(i + 1).padStart(3, "0")}_scene.mp4`);
      await renderSceneSegment({
        scene: scenes[i],
        index: i,
        outPath: segPath,
        width,
        height,
        fps,
        crossfade,
        bgmVolume,
        tmp,
      });
      segments.push(segPath);
      options.onProgress?.((i + 1) / (scenes.length + 2));
    }

    const outroPath = join(tmp, "999_outro.mp4");
    await renderCard({
      outPath: outroPath,
      seconds: options.outroSeconds ?? 5,
      width,
      height,
      fps,
      tmp,
      name: "outro",
      lines: [
        { text: "NEXT EPISODE", size: Math.round(height / 38), color: "0xc2543f", y: "h/2-140" },
        {
          text: wrapText(input.cliffhanger_summary, 22),
          size: Math.round(height / 20),
          color: "0xf2ede4",
          y: "h/2-40",
        },
      ],
    });
    segments.push(outroPath);

    const listPath = join(tmp, "concat.txt");
    await writeFile(
      listPath,
      segments.map((s) => `file '${s.replace(/'/g, "'\\''")}'`).join("\n"),
      "utf8",
    );

    await ensureDir(join(outPath, ".."));
    await runFfmpeg([
      "-y",
      "-f", "concat", "-safe", "0", "-i", listPath,
      "-c:v", "libx264", "-preset", "veryfast", "-crf", String(options.crf ?? 22),
      "-c:a", "aac", "-b:a", "192k",
      "-movflags", "+faststart",
      outPath,
    ], 900_000);

    options.onProgress?.(1);

    return {
      video_path: outPath,
      duration_sec: await probeDuration(outPath),
      renderer: "ffmpeg",
    };
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

/* ── 진입점 ─────────────────────────────────────────────────────── */

/**
 * 5단계 — 씬 배열을 하나의 영상으로 조립한다.
 *
 * renderer="auto"(기본)면 Remotion을 먼저 시도하고, 브라우저 부재 등으로
 * 실패하면 ffmpeg 폴백으로 넘어간다.
 */
export async function assembleEpisode(
  input: AssembleInput,
  options: RenderOptions = {},
): Promise<AssembleResult> {
  const outPath = videoPath(input.episode_id);
  await ensureDir(join(outPath, ".."));

  const requested =
    options.renderer ??
    (process.env.PIPELINE_RENDERER as RenderOptions["renderer"]) ??
    "auto";

  if (requested === "ffmpeg") return renderWithFfmpeg(input, outPath, options);
  if (requested === "remotion") return renderWithRemotion(input, outPath, options);

  try {
    return await renderWithRemotion(input, outPath, options);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[assemble] Remotion 렌더 실패, ffmpeg 폴백으로 전환합니다: ${message}`);
    return renderWithFfmpeg(input, outPath, options);
  }
}

export async function saveAssembleResult(
  seriesId: string,
  episodeNumber: number,
  result: AssembleResult,
): Promise<string> {
  const path = artifactPath(seriesId, episodeNumber, "assemble");
  await writeJson(path, result);
  return path;
}
