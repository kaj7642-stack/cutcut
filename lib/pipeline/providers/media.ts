import { execFile } from "child_process";
import { promisify } from "util";

const exec = promisify(execFile);

export const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
export const FFPROBE = process.env.FFPROBE_PATH || "ffprobe";

export async function runFfmpeg(args: string[], timeoutMs = 300_000): Promise<void> {
  await exec(FFMPEG, ["-hide_banner", "-loglevel", "error", ...args], {
    timeout: timeoutMs,
    maxBuffer: 32 * 1024 * 1024,
  });
}

/** 미디어 파일의 실제 재생 길이(초). 5단계 타이밍 동기화의 기준값. */
export async function probeDuration(path: string): Promise<number> {
  const { stdout } = await exec(
    FFPROBE,
    [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      path,
    ],
    { timeout: 30_000 },
  );
  const value = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`오디오 길이를 측정하지 못했습니다: ${path}`);
  }
  return Math.round(value * 1000) / 1000;
}

export async function ffmpegAvailable(): Promise<boolean> {
  try {
    await exec(FFMPEG, ["-version"], { timeout: 10_000 });
    await exec(FFPROBE, ["-version"], { timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}
