import { NextRequest, NextResponse } from "next/server";
import { listScenes, createScene } from "@/lib/animate/db";

export async function GET(req: NextRequest) {
  const episodeId = req.nextUrl.searchParams.get("episodeId");
  if (!episodeId) return NextResponse.json({ error: "episodeId 필요" }, { status: 400 });
  return NextResponse.json(listScenes(episodeId));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.episode_id) return NextResponse.json({ error: "episode_id 필요" }, { status: 400 });
  const scene = createScene(body);
  return NextResponse.json(scene, { status: 201 });
}
