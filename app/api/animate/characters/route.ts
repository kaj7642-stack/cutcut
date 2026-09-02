import { NextRequest, NextResponse } from "next/server";
import { listCharacters, createCharacter } from "@/lib/animate/db";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId 필요" }, { status: 400 });
  return NextResponse.json(listCharacters(projectId));
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { project_id?: string; name?: string; description?: string; style_prompt?: string; voice_preset?: string; seed_value?: number | null };
  if (!body.project_id || !body.name?.trim()) return NextResponse.json({ error: "project_id와 이름 필요" }, { status: 400 });
  const c = createCharacter({ ...body, name: body.name.trim(), project_id: body.project_id });
  return NextResponse.json(c, { status: 201 });
}
