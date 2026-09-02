import { NextRequest, NextResponse } from "next/server";
import { listProjects, createProject } from "@/lib/animate/db";

export async function GET() {
  return NextResponse.json(listProjects());
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { name?: string; description?: string; style_mode?: "2d" | "3d"; default_aspect_ratio?: "9:16" | "16:9" };
  if (!body.name?.trim()) return NextResponse.json({ error: "이름을 입력해주세요" }, { status: 400 });
  const project = createProject({ name: body.name.trim(), description: body.description, style_mode: body.style_mode, default_aspect_ratio: body.default_aspect_ratio });
  return NextResponse.json(project, { status: 201 });
}
