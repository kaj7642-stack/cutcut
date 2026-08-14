import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuid } from "uuid";

const WORK_DIR = process.env.WORK_DIR || join(process.cwd(), "workdir");
const MAX_SIZE = 500 * 1024 * 1024; // 500MB

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("video") as File | null;

  if (!file) {
    return NextResponse.json({ error: "영상 파일이 없습니다." }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "파일이 너무 큽니다 (최대 500MB)." }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  if (!["mp4", "mkv", "avi", "mov", "webm"].includes(ext)) {
    return NextResponse.json({ error: "지원하지 않는 형식입니다." }, { status: 400 });
  }

  const projectId = uuid();
  const projectDir = join(WORK_DIR, projectId);
  await mkdir(projectDir, { recursive: true });

  const videoPath = join(projectDir, `input.${ext}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(videoPath, buffer);

  return NextResponse.json({
    projectId,
    filename: file.name,
    size: file.size,
    videoPath,
  });
}
