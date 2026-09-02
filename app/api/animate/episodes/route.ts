import { NextRequest, NextResponse } from "next/server";
import { listEpisodes, createEpisode } from "@/lib/animate/db";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId 필요" }, { status: 400 });
  return NextResponse.json(listEpisodes(projectId));
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { project_id?: string; title?: string; description?: string };
  if (!body.project_id || !body.title?.trim()) return NextResponse.json({ error: "project_id와 제목 필요" }, { status: 400 });
  const ep = createEpisode({ project_id: body.project_id, title: body.title.trim(), description: body.description });
  return NextResponse.json(ep, { status: 201 });
}
