import { mkdir, readFile, writeFile, access } from "fs/promises";
import { dirname, join, resolve } from "path";

/**
 * 파이프라인 산출물 경로 규칙.
 *
 *   data/series/{seriesId}/series_bible.json
 *   data/series/{seriesId}/episodes/{n}/script.json
 *   data/series/{seriesId}/episodes/{n}/image_prompts.json
 *   data/series/{seriesId}/episodes/{n}/images.json
 *   data/series/{seriesId}/episodes/{n}/tts.json
 *   data/series/{seriesId}/episodes/{n}/assemble.json
 *   data/series/{seriesId}/episodes/{n}/upload.json
 *   data/series/{seriesId}/episodes/{n}/run.log.json
 *   data/upload_log.json
 *
 *   output/images/{episodeId}/{sceneId}.png
 *   output/audio/{episodeId}/{sceneId}.mp3
 *   output/video/{episodeId}.mp4
 */

export const DATA_DIR = process.env.PIPELINE_DATA_DIR
  ? resolve(process.env.PIPELINE_DATA_DIR)
  : join(process.cwd(), "data");

export const OUTPUT_DIR = process.env.PIPELINE_OUTPUT_DIR
  ? resolve(process.env.PIPELINE_OUTPUT_DIR)
  : join(process.cwd(), "output");

function slugHash(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(36);
}

/**
 * 경로 조각으로 쓰이는 식별자에서 구분자·상대경로 요소를 제거한다.
 * 한글 등 ASCII 밖 식별자는 결정론적 해시 슬러그로 바꾼다
 * (같은 입력은 항상 같은 디렉터리를 가리킨다).
 */
export function safeId(raw: string): string {
  const trimmed = String(raw).trim();

  const cleaned = trimmed
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^[_-]+|[_-]+$/g, "");
  if (cleaned) return cleaned.slice(0, 80);

  // 문자나 숫자가 하나도 없으면 식별자로 쓸 수 없다.
  if (!/[\p{L}\p{N}]/u.test(trimmed)) {
    throw new Error(`사용할 수 없는 식별자입니다: ${JSON.stringify(raw)}`);
  }
  return `s_${slugHash(trimmed)}`;
}

export function episodeId(seriesId: string, episodeNumber: number): string {
  return `${safeId(seriesId)}_ep${String(episodeNumber).padStart(3, "0")}`;
}

export function seriesDir(seriesId: string): string {
  return join(DATA_DIR, "series", safeId(seriesId));
}

export function biblePath(seriesId: string): string {
  return join(seriesDir(seriesId), "series_bible.json");
}

export function episodeDir(seriesId: string, episodeNumber: number): string {
  return join(seriesDir(seriesId), "episodes", String(episodeNumber));
}

export function artifactPath(
  seriesId: string,
  episodeNumber: number,
  name: string,
): string {
  return join(episodeDir(seriesId, episodeNumber), `${name}.json`);
}

export function imagesDir(epId: string): string {
  return join(OUTPUT_DIR, "images", safeId(epId));
}

export function audioDir(epId: string): string {
  return join(OUTPUT_DIR, "audio", safeId(epId));
}

export function videoPath(epId: string): string {
  return join(OUTPUT_DIR, "video", `${safeId(epId)}.mp4`);
}

export function uploadLogPath(): string {
  return join(DATA_DIR, "upload_log.json");
}

/* ── JSON 입출력 헬퍼 ───────────────────────────────────────────── */

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

export async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

export async function readJsonIfExists<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function ensureDir(path: string): Promise<string> {
  await mkdir(path, { recursive: true });
  return path;
}
