#!/usr/bin/env node
/**
 * 전체 파이프라인 CLI.
 *
 *   npx tsx scripts/run-episode.ts --series my-series --episode 1
 *   npx tsx scripts/run-episode.ts --series my-series --episode 2 --force script,images
 *   npx tsx scripts/run-episode.ts --series my-series --episode 1 --stop-after tts
 *   npx tsx scripts/run-episode.ts --series my-series --episode 1 --upload --privacy unlisted
 */
import { runEpisodePipeline } from "../lib/pipeline/orchestrator";
import { PIPELINE_STEPS, type PipelineStep, type PrivacyStatus } from "../lib/pipeline/types";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function asSteps(value: string | undefined): PipelineStep[] | undefined {
  if (!value) return undefined;
  const steps = value
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is PipelineStep => PIPELINE_STEPS.includes(s as PipelineStep));
  return steps.length ? steps : undefined;
}

const seriesId = arg("series");
const episodeNumber = Number(arg("episode") ?? "1");

if (!seriesId) {
  console.error("사용법: npx tsx scripts/run-episode.ts --series <series_id> --episode <n>");
  process.exit(1);
}

const result = await runEpisodePipeline({
  seriesId,
  episodeNumber,
  seriesBrief: arg("brief"),
  toneAndManner: arg("tone"),
  extraDirection: arg("direction"),
  force: asSteps(arg("force")),
  stopAfter: asSteps(arg("stop-after"))?.[0],
  upload: flag("upload"),
  privacyStatus: arg("privacy") as PrivacyStatus | undefined,
  dryRunUpload: flag("dry-run-upload"),
  render: {
    renderer: arg("renderer") as "remotion" | "ffmpeg" | "auto" | undefined,
    width: arg("width") ? Number(arg("width")) : undefined,
    height: arg("height") ? Number(arg("height")) : undefined,
    fps: arg("fps") ? Number(arg("fps")) : undefined,
    maxScenes: arg("max-scenes") ? Number(arg("max-scenes")) : undefined,
    maxSceneSeconds: arg("max-scene-seconds") ? Number(arg("max-scene-seconds")) : undefined,
  },
});

for (const log of result.logs) {
  const mark = log.status === "failed" ? "✗" : log.status === "skipped_cached" ? "·" : "✓";
  const suffix = log.error ?? log.detail ?? "";
  console.log(
    `${mark} ${log.step.padEnd(14)} ${String(log.duration_ms).padStart(7)}ms  ${suffix}`,
  );
}

if (result.video_path) console.log(`\n영상: ${result.video_path}`);
if (result.upload) console.log(`업로드: ${result.upload.url} (${result.upload.privacy_status})`);

if (!result.ok) {
  console.error(`\n실패 단계: ${result.failed_step ?? "(알 수 없음)"}`);
  process.exit(1);
}
