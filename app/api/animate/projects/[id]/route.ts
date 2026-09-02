import { NextRequest, NextResponse } from "next/server";
import { getProject, updateProject, deleteProject } from "@/lib/animate/db";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const p = getProject(id);
  if (!p) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다" }, { status: 404 });
  return NextResponse.json(p);
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json();
  const p = updateProject(id, body);
  if (!p) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다" }, { status: 404 });
  return NextResponse.json(p);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!deleteProject(id)) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
