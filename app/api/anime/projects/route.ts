import { NextRequest, NextResponse } from "next/server";
import { all, run, get } from "@/lib/anime/db";
import { v4 as uuid } from "uuid";
import type { AnimeProject } from "@/lib/anime/types";

export async function GET() {
  const projects = all<AnimeProject>("SELECT * FROM projects ORDER BY updated_at DESC");
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = uuid();
  const now = new Date().toISOString();
  run(
    `INSERT INTO projects (id, name, description, style_mode, aspect_ratio, created_at, updated_at)
     VALUES ($id, $name, $description, $style_mode, $aspect_ratio, $created_at, $updated_at)`,
    {
      id,
      name: body.name || "새 프로젝트",
      description: body.description || "",
      style_mode: body.style_mode || "2d",
      aspect_ratio: body.aspect_ratio || "16:9",
      created_at: now,
      updated_at: now,
    }
  );
  const project = get<AnimeProject>("SELECT * FROM projects WHERE id = $id", { id });
  return NextResponse.json(project, { status: 201 });
}
