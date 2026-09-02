import { NextRequest, NextResponse } from "next/server";
import { get, run } from "@/lib/anime/db";
import type { AnimeProject } from "@/lib/anime/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const project = get<AnimeProject>("SELECT * FROM projects WHERE id = $id", { id });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();
  const now = new Date().toISOString();
  const fields: string[] = [];
  const params: Record<string, unknown> = { id, updated_at: now };

  for (const key of ["name", "description", "style_mode", "aspect_ratio"] as const) {
    if (body[key] !== undefined) {
      fields.push(`${key} = $${key}`);
      params[key] = body[key];
    }
  }
  fields.push("updated_at = $updated_at");

  run(`UPDATE projects SET ${fields.join(", ")} WHERE id = $id`, params);
  const project = get<AnimeProject>("SELECT * FROM projects WHERE id = $id", { id });
  return NextResponse.json(project);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  run("DELETE FROM projects WHERE id = $id", { id });
  return NextResponse.json({ ok: true });
}
