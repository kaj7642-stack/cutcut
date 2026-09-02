// ─────────────────────────────────────────
// CutCut Anime Generator – FFmpeg Operations
// ─────────────────────────────────────────
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs";
import type { AspectRatio } from "./types";

const exec = promisify(execFile);
const OUTPUT_DIR = path.join(process.cwd(), "public", "anime-uploads", "renders");

function ensureDir() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

interface SceneAsset {
  scene_number: number;
  video_url?: string;   // path relative to public/
  image_url?: string;   // path relative to public/
  audio_url?: string;   // path relative to public/
  subtitle_text: string;
  subtitle_color: string;
  subtitle_font: string;
  duration_seconds: number;
}

function toAbsPath(relativeUrl: string): string {
  if (!relativeUrl) return "";
  return path.join(process.cwd(), "public", relativeUrl);
}

// Get resolution for aspect ratio
function getResolution(ar: AspectRatio): { w: number; h: number } {
  return ar === "9:16" ? { w: 1080, h: 1920 } : { w: 1920, h: 1080 };
}

/**
 * Render individual scene: image + audio → video segment with subtitle overlay
 */
export async function renderSceneSegment(
  scene: SceneAsset,
  aspectRatio: AspectRatio,
  outputId: string
): Promise<string> {
  ensureDir();
  const { w, h } = getResolution(aspectRatio);
  const outFile = path.join(OUTPUT_DIR, `scene_${outputId}_${scene.scene_number}.mp4`);

  const imageFile = toAbsPath(scene.image_url ?? "");
  const audioFile = toAbsPath(scene.audio_url ?? "");
  const dur = scene.duration_seconds || 3;

  const args: string[] = [];

  if (imageFile && fs.existsSync(imageFile)) {
    // Use image as input, loop for duration
    args.push("-loop", "1", "-i", imageFile, "-t", String(dur));
  } else {
    // Generate a solid color background
    args.push(
      "-f", "lavfi", "-i",
      `color=c=0x1a1a2e:s=${w}x${h}:d=${dur}:r=24`
    );
  }

  if (audioFile && fs.existsSync(audioFile)) {
    args.push("-i", audioFile);
    args.push("-shortest");
  }

  // Video filter: scale, overlay subtitle
  const filters: string[] = [`scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`];

  if (scene.subtitle_text) {
    const escaped = scene.subtitle_text.replace(/'/g, "'\\''").replace(/:/g, "\\:");
    const color = scene.subtitle_color || "white";
    filters.push(
      `drawtext=text='${escaped}':fontsize=42:fontcolor=${color}:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-th-80:font='Noto Sans KR'`
    );
  }

  args.push("-vf", filters.join(","));
  args.push("-c:v", "libx264", "-preset", "fast", "-crf", "23");
  args.push("-pix_fmt", "yuv420p");

  if (audioFile && fs.existsSync(audioFile)) {
    args.push("-c:a", "aac", "-b:a", "128k");
  } else {
    // Add silent audio track
    args.push("-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-t", String(dur));
    args.push("-c:a", "aac", "-b:a", "128k", "-shortest");
  }

  args.push("-y", outFile);

  try {
    await exec("ffmpeg", args, { timeout: 120_000 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`FFmpeg scene render failed: ${msg}`);
  }
  return outFile;
}

/**
 * Concatenate scene segments into final video
 */
export async function concatScenes(
  segmentPaths: string[],
  outputName: string
): Promise<string> {
  ensureDir();
  const listFile = path.join(OUTPUT_DIR, `${outputName}_list.txt`);
  const outFile = path.join(OUTPUT_DIR, `${outputName}.mp4`);

  // Write concat list
  const lines = segmentPaths.map(p => `file '${p}'`).join("\n");
  fs.writeFileSync(listFile, lines);

  try {
    await exec("ffmpeg", [
      "-f", "concat", "-safe", "0", "-i", listFile,
      "-c:v", "libx264", "-preset", "fast", "-crf", "23",
      "-c:a", "aac", "-b:a", "128k",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-y", outFile,
    ], { timeout: 600_000 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`FFmpeg concat failed: ${msg}`);
  }

  // Clean up segment files
  try { fs.unlinkSync(listFile); } catch {}
  for (const seg of segmentPaths) {
    try { fs.unlinkSync(seg); } catch {}
  }

  return `/anime-uploads/renders/${outputName}.mp4`;
}

/**
 * Get audio/video duration using ffprobe
 */
export async function probeDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await exec("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "csv=p=0",
      filePath,
    ]);
    return parseFloat(stdout.trim()) || 0;
  } catch {
    return 0;
  }
}
