import { NextRequest, NextResponse } from "next/server";
import { all, run, get } from "@/lib/anime/db";
import { v4 as uuid } from "uuid";
import type { Episode } from "@/lib/anime/types";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const episodes = all<Episode>(
    "SELECT * FROM episodes WHERE project_id = $projectId ORDER BY episode_number ASC",
    { projectId }
  );
  return NextResponse.json(episodes);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.project_id) return NextResponse.json({ error: "project_id required" }, { status: 400 });
  const id = uuid();
  const now = new Date().toISOString();

  // Auto-increment episode number
  const last = get<{ max_num: number }>(
    "SELECT COALESCE(MAX(episode_number), 0) as max_num FROM episodes WHERE project_id = $pid",
    { pid: body.project_id }
  );

  run(
    `INSERT INTO episodes (id, project_id, title, episode_number, status, created_at, updated_at)
     VALUES ($id, $project_id, $title, $episode_number, $status, $created_at, $updated_at)`,
    {
      id,
      project_id: body.project_id,
      title: body.title || "새 에피소드",
      episode_number: (last?.max_num ?? 0) + 1,
      status: "draft",
      created_at: now,
      updated_at: now,
    }
  );
  const episode = get<Episode>("SELECT * FROM episodes WHERE id = $id", { id });
  return NextResponse.json(episode, { status: 201 });
}
