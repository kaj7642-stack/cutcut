import { NextRequest, NextResponse } from "next/server";
import { all, run, get } from "@/lib/anime/db";
import { v4 as uuid } from "uuid";
import type { Character } from "@/lib/anime/types";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const chars = all<Character>(
    "SELECT * FROM characters WHERE project_id = $projectId ORDER BY created_at ASC",
    { projectId }
  );
  return NextResponse.json(chars);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.project_id) return NextResponse.json({ error: "project_id required" }, { status: 400 });
  const id = uuid();
  const now = new Date().toISOString();
  run(
    `INSERT INTO characters (id, project_id, name, style_mode, style_prompt, voice_preset, seed_value, reference_images, subtitle_color, subtitle_font, created_at, updated_at)
     VALUES ($id, $project_id, $name, $style_mode, $style_prompt, $voice_preset, $seed_value, $reference_images, $subtitle_color, $subtitle_font, $created_at, $updated_at)`,
    {
      id,
      project_id: body.project_id,
      name: body.name || "새 캐릭터",
      style_mode: body.style_mode || "2d",
      style_prompt: body.style_prompt || "",
      voice_preset: JSON.stringify(body.voice_preset || {}),
      seed_value: body.seed_value || 0,
      reference_images: JSON.stringify(body.reference_images || []),
      subtitle_color: body.subtitle_color || "#FFFFFF",
      subtitle_font: body.subtitle_font || "Noto Sans KR",
      created_at: now,
      updated_at: now,
    }
  );
  const char = get<Character>("SELECT * FROM characters WHERE id = $id", { id });
  return NextResponse.json(char, { status: 201 });
}
