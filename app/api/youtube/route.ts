import { NextResponse } from "next/server";
import { mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuid } from "uuid";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const WORK_DIR = process.env.WORK_DIR || join(process.cwd(), "workdir");
const MAX_DURATION = 3600;

export const maxDuration = 120;

const YT_URL_RE = /^https?:\/\/(www\.)?(youtube\.com\/(watch|shorts)|youtu\.be\/)/;

export async function POST(req: Request) {
  const { url } = await req.json();

  if (!url || !YT_URL_RE.test(url)) {
    return NextResponse.json(
      { error: "올바른 유튜브 URL을 입력하세요." },
      { status: 400 },
    );
  }

  const projectId = uuid();
  const projectDir = join(WORK_DIR, projectId);
  await mkdir(projectDir, { recursive: true });

  const outputPath = join(projectDir, "input.mp4");

  try {
    const infoResult = await execFileAsync("yt-dlp", [
      "--no-download",
      "--print", "duration",
      "--no-warnings",
      url,
    ], { timeout: 15000 });

    const duration = parseFloat(infoResult.stdout.trim());
    if (duration > MAX_DURATION) {
      return NextResponse.json(
        { error: `영상이 너무 깁니다 (${Math.round(duration / 60)}분). 최대 60분까지 지원합니다.` },
        { status: 400 },
      );
    }

    await execFileAsync("yt-dlp", [
      "-f", "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best",
      "--merge-output-format", "mp4",
      "-o", outputPath,
      "--no-playlist",
      "--no-warnings",
      url,
    ], { timeout: 300000 });

    const titleResult = await execFileAsync("yt-dlp", [
      "--no-download",
      "--print", "title",
      "--no-warnings",
      url,
    ], { timeout: 10000 });

    const title = titleResult.stdout.trim() || "youtube_video";

    return NextResponse.json({
      projectId,
      filename: `${title}.mp4`,
      videoPath: outputPath,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "다운로드 실패";
    if (message.includes("Private video") || message.includes("Sign in")) {
      return NextResponse.json(
        { error: "비공개 또는 연령 제한 영상은 다운로드할 수 없습니다." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "유튜브 영상 다운로드에 실패했습니다." },
      { status: 500 },
    );
  }
}
