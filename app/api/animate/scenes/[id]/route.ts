import { NextRequest, NextResponse } from "next/server";
import { getScene, updateScene, deleteScene } from "@/lib/animate/db";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const s = getScene(id);
  if (!s) return NextResponse.json({ error: "씬을 찾을 수 없습니다" }, { status: 404 });
  return NextResponse.json(s);
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json();
  const s = updateScene(id, body);
  if (!s) return NextResponse.json({ error: "씬을 찾을 수 없습니다" }, { status: 404 });
  return NextResponse.json(s);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!deleteScene(id)) return NextResponse.json({ error: "씬을 찾을 수 없습니다" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
