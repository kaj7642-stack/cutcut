import { NextRequest, NextResponse } from "next/server";
import { get, run } from "@/lib/anime/db";
import type { Scene } from "@/lib/anime/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const scene = get<Scene>("SELECT * FROM scenes WHERE id = $id", { id });
  if (!scene) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(scene);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();
  const now = new Date().toISOString();
  const allowed = [
    "description", "dialogue", "character_ids", "camera_direction",
    "duration_seconds", "subtitle_text", "status", "scene_number",
    "generated_image_url", "generated_video_url", "tts_audio_url",
    "prompt_used", "api_log",
  ];
  const fields: string[] = [];
  const params: Record<string, unknown> = { id, updated_at: now };

  for (const key of allowed) {
    if (body[key] !== undefined) {
      let val = body[key];
      if (key === "character_ids" && Array.isArray(val)) val = JSON.stringify(val);
      if (key === "api_log" && typeof val === "object") val = JSON.stringify(val);
      fields.push(`${key} = $${key}`);
      params[key] = val;
    }
  }
  fields.push("updated_at = $updated_at");

  run(`UPDATE scenes SET ${fields.join(", ")} WHERE id = $id`, params);
  const scene = get<Scene>("SELECT * FROM scenes WHERE id = $id", { id });
  return NextResponse.json(scene);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  run("DELETE FROM scenes WHERE id = $id", { id });
  return NextResponse.json({ ok: true });
}
