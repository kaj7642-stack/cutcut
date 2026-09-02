import { NextRequest, NextResponse } from "next/server";
import { getScene, updateScene, getActiveSetting } from "@/lib/animate/db";
import { createTTSAdapter } from "@/lib/animate/adapters";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json() as { voice?: string; speed?: number };

  const scene = getScene(id);
  if (!scene) return NextResponse.json({ error: "씬을 찾을 수 없습니다" }, { status: 404 });

  const text = scene.dialogue || scene.subtitle_text;
  if (!text.trim()) return NextResponse.json({ error: "대사/자막 텍스트가 없습니다" }, { status: 400 });

  try {
    const adapter = createTTSAdapter(getActiveSetting("tts") ?? undefined);
    const result = await adapter.synthesize(text, { voice: body.voice, speed: body.speed, language: "ko" });
    updateScene(id, { tts_audio_url: result.audioUrl });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
