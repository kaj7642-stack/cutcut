import { NextRequest, NextResponse } from "next/server";
import { getCharacter, updateCharacter, deleteCharacter } from "@/lib/animate/db";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const c = getCharacter(id);
  if (!c) return NextResponse.json({ error: "캐릭터를 찾을 수 없습니다" }, { status: 404 });
  return NextResponse.json(c);
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json();
  const c = updateCharacter(id, body);
  if (!c) return NextResponse.json({ error: "캐릭터를 찾을 수 없습니다" }, { status: 404 });
  return NextResponse.json(c);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!deleteCharacter(id)) return NextResponse.json({ error: "캐릭터를 찾을 수 없습니다" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
