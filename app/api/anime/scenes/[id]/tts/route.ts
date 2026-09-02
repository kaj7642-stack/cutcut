import { NextRequest, NextResponse } from "next/server";
import { get, run, all } from "@/lib/anime/db";
import type { Scene, Character } from "@/lib/anime/types";
import { getTtsAdapter } from "@/lib/anime/adapters";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();

  const scene = get<Scene>("SELECT * FROM scenes WHERE id = $id", { id });
  if (!scene) return NextResponse.json({ error: "Scene not found" }, { status: 404 });

  const text = body.text || scene.dialogue || scene.subtitle_text || scene.description;
  if (!text) return NextResponse.json({ error: "No text for TTS" }, { status: 400 });

  // Get character voice preset
  const charIds: string[] = JSON.parse(scene.character_ids || "[]");
  let voiceId = body.voice_id || "default";
  if (charIds.length > 0) {
    const char = get<Character>("SELECT * FROM characters WHERE id = $cid", { cid: charIds[0] });
    if (char) {
      try {
        const preset = JSON.parse(char.voice_preset || "{}");
        if (preset.voice_id) voiceId = preset.voice_id;
      } catch {}
    }
  }

  try {
    run("UPDATE scenes SET status = 'generating_tts', updated_at = $now WHERE id = $id", {
      id, now: new Date().toISOString(),
    });

    const adapter = getTtsAdapter();
    const result = await adapter.synthesize({
      text,
      voice_id: voiceId,
      speed: body.speed || 1.0,
      language: body.language || "ko-KR",
    });

    const now = new Date().toISOString();
    run(
      "UPDATE scenes SET tts_audio_url = $url, duration_seconds = $dur, status = 'completed', updated_at = $now WHERE id = $id",
      { id, url: result.audio_url, dur: result.duration || scene.duration_seconds, now }
    );

    const updated = get<Scene>("SELECT * FROM scenes WHERE id = $id", { id });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    run("UPDATE scenes SET status = 'failed', api_log = $log, updated_at = $now WHERE id = $id", {
      id, log: JSON.stringify({ error: msg }), now: new Date().toISOString(),
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
