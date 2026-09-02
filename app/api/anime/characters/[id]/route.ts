import { NextRequest, NextResponse } from "next/server";
import { get, run } from "@/lib/anime/db";
import type { Character } from "@/lib/anime/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const char = get<Character>("SELECT * FROM characters WHERE id = $id", { id });
  if (!char) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(char);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();
  const now = new Date().toISOString();
  const fields: string[] = [];
  const params: Record<string, unknown> = { id, updated_at: now };

  for (const key of ["name", "style_mode", "style_prompt", "subtitle_color", "subtitle_font"] as const) {
    if (body[key] !== undefined) {
      fields.push(`${key} = $${key}`);
      params[key] = body[key];
    }
  }
  if (body.voice_preset !== undefined) {
    fields.push("voice_preset = $voice_preset");
    params.voice_preset = JSON.stringify(body.voice_preset);
  }
  if (body.seed_value !== undefined) {
    fields.push("seed_value = $seed_value");
    params.seed_value = body.seed_value;
  }
  if (body.reference_images !== undefined) {
    fields.push("reference_images = $reference_images");
    params.reference_images = JSON.stringify(body.reference_images);
  }
  fields.push("updated_at = $updated_at");

  run(`UPDATE characters SET ${fields.join(", ")} WHERE id = $id`, params);
  const char = get<Character>("SELECT * FROM characters WHERE id = $id", { id });
  return NextResponse.json(char);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  run("DELETE FROM characters WHERE id = $id", { id });
  return NextResponse.json({ ok: true });
}
