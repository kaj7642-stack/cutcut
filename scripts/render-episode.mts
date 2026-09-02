#!/usr/bin/env node
/**
 * 5단계 렌더링만 다시 트리거하는 CLI.
 * 이미 만들어둔 script/images/tts 산출물을 읽어 영상만 다시 만든다.
 *
 *   npx tsx scripts/render-episode.ts --series my-series --episode 1
 *   npx tsx scripts/render-episode.ts --series my-series --episode 1 --renderer ffmpeg
 *   npx tsx scripts/render-episode.ts --series my-series --episode 1 --max-scenes 2 --width 640 --height 360
 */
import { assembleEpisode, buildAssembleInput, saveAssembleResult } from "../lib/pipeline/assemble";
import { loadSeriesBible } from "../lib/pipeline/bible";
import { artifactPath, episodeId, readJson } from "../lib/pipeline/paths";
import type { EpisodeScript, GeneratedImage, TtsResult } from "../lib/pipeline/types";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const seriesId = arg("series");
const episodeNumber = Number(arg("episode") ?? "1");

if (!seriesId) {
  console.error("사용법: npx tsx scripts/render-episode.ts --series <series_id> --episode <n>");
  process.exit(1);
}

const bible = await loadSeriesBible(seriesId);
if (!bible) {
  console.error(`시리즈 바이블이 없습니다: ${seriesId}`);
  process.exit(1);
}

const [script, images, tts] = await Promise.all([
  readJson<EpisodeScript>(artifactPath(seriesId, episodeNumber, "script")),
  readJson<GeneratedImage[]>(artifactPath(seriesId, episodeNumber, "images")),
  readJson<TtsResult[]>(artifactPath(seriesId, episodeNumber, "tts")),
]);

const input = buildAssembleInput({
  script,
  images,
  tts,
  seriesTitle: bible.series_title,
  episodeId: episodeId(seriesId, episodeNumber),
});

let lastPercent = -1;
const result = await assembleEpisode(input, {
  renderer: arg("renderer") as "remotion" | "ffmpeg" | "auto" | undefined,
  width: arg("width") ? Number(arg("width")) : undefined,
  height: arg("height") ? Number(arg("height")) : undefined,
  fps: arg("fps") ? Number(arg("fps")) : undefined,
  maxScenes: arg("max-scenes") ? Number(arg("max-scenes")) : undefined,
  maxSceneSeconds: arg("max-scene-seconds") ? Number(arg("max-scene-seconds")) : undefined,
  onProgress: (p) => {
    const percent = Math.round(p * 100);
    if (percent !== lastPercent && percent % 5 === 0) {
      lastPercent = percent;
      process.stdout.write(`\r렌더링 ${percent}%   `);
    }
  },
});

await saveAssembleResult(seriesId, episodeNumber, result);
console.log(`\n완료: ${result.video_path} (${result.renderer}, ${Math.round(result.duration_sec)}초)`);
