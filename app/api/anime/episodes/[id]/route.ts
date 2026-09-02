import { NextRequest, NextResponse } from "next/server";
import { get, run } from "@/lib/anime/db";
import type { Episode } from "@/lib/anime/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const ep = get<Episode>("SELECT * FROM episodes WHERE id = $id", { id });
  if (!ep) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(ep);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();
  const now = new Date().toISOString();
  const fields: string[] = [];
  const params: Record<string, unknown> = { id, updated_at: now };

  for (const key of ["title", "episode_number", "status"] as const) {
    if (body[key] !== undefined) {
      fields.push(`${key} = $${key}`);
      params[key] = body[key];
    }
  }
  fields.push("updated_at = $updated_at");

  run(`UPDATE episodes SET ${fields.join(", ")} WHERE id = $id`, params);
  const ep = get<Episode>("SELECT * FROM episodes WHERE id = $id", { id });
  return NextResponse.json(ep);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  run("DELETE FROM episodes WHERE id = $id", { id });
  return NextResponse.json({ ok: true });
}
