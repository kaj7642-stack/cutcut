import { NextRequest, NextResponse } from "next/server";
import { getEpisode, updateEpisode, deleteEpisode } from "@/lib/animate/db";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const ep = getEpisode(id);
  if (!ep) return NextResponse.json({ error: "에피소드를 찾을 수 없습니다" }, { status: 404 });
  return NextResponse.json(ep);
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json();
  const ep = updateEpisode(id, body);
  if (!ep) return NextResponse.json({ error: "에피소드를 찾을 수 없습니다" }, { status: 404 });
  return NextResponse.json(ep);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!deleteEpisode(id)) return NextResponse.json({ error: "에피소드를 찾을 수 없습니다" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
