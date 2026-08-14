import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { readFile, writeFile, unlink } from "fs/promises";

const execFileAsync = promisify(execFile);

const WORK_DIR = process.env.WORK_DIR || join(process.cwd(), "workdir");
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const maxDuration = 120;

interface WhisperSegment {
  start: number;
  end: number;
  text: string;
}

interface WhisperResponse {
  text: string;
  segments?: WhisperSegment[];
}

export async function POST(request: NextRequest) {
  const { projectId, clipFile } = await request.json();

  if (!projectId || !clipFile) {
    return NextResponse.json(
      { error: "projectId와 clipFile이 필요합니다." },
      { status: 400 },
    );
  }

  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY가 설정되어 있지 않습니다." },
      { status: 500 },
    );
  }

  const clipPath = join(WORK_DIR, projectId, clipFile);
  const audioPath = join(WORK_DIR, projectId, `stt_${clipFile}.wav`);

  try {
    await execFileAsync("ffmpeg", [
      "-y", "-i", clipPath,
      "-vn", "-acodec", "pcm_s16le",
      "-ar", "16000", "-ac", "1",
      audioPath,
    ], { timeout: 30000 });

    const audioData = await readFile(audioPath);

    const formData = new FormData();
    formData.append("file", new Blob([audioData], { type: "audio/wav" }), "audio.wav");
    formData.append("model", "whisper-1");
    formData.append("language", "ko");
    formData.append("response_format", "verbose_json");
    formData.append("timestamp_granularities[]", "segment");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: formData,
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[stt] Whisper API 실패:", res.status, body);
      return NextResponse.json(
        { error: "음성 인식에 실패했습니다." },
        { status: 500 },
      );
    }

    const data: WhisperResponse = await res.json();

    try { await unlink(audioPath); } catch { /* ignore */ }

    return NextResponse.json({
      text: data.text,
      segments: (data.segments || []).map((s) => ({
        start: s.start,
        end: s.end,
        text: s.text.trim(),
      })),
    });
  } catch (err) {
    try { await unlink(audioPath); } catch { /* ignore */ }
    console.error("[stt] error:", err);
    return NextResponse.json(
      { error: "음성 인식 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
