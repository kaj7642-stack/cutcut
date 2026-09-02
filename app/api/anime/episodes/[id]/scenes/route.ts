import { NextRequest, NextResponse } from "next/server";
import { all } from "@/lib/anime/db";
import type { Scene } from "@/lib/anime/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const scenes = all<Scene>(
    "SELECT * FROM scenes WHERE episode_id = $id ORDER BY scene_number ASC",
    { id }
  );
  return NextResponse.json(scenes);
}
