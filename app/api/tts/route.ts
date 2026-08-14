import { NextResponse } from "next/server";
import { synthesize, ttsAvailable } from "@/lib/tts";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!ttsAvailable()) {
    return NextResponse.json({ error: "TTS 서비스를 사용할 수 없습니다." }, { status: 503 });
  }

  const body = await req.json();
  const { text, voice, tone, rate } = body;

  if (!text || !voice) {
    return NextResponse.json({ error: "text와 voice가 필요합니다." }, { status: 400 });
  }

  const audioBuffer = await synthesize({ text, voice, tone, rate });

  return new Response(audioBuffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(audioBuffer.byteLength),
    },
  });
}
