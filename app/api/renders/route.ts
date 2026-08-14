import { NextRequest, NextResponse } from "next/server";
import { getUserBySession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserBySession(token);
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json();
  const { projectId, filename, mode, quality, clipsCount, totalDuration } = body;

  if (!projectId || !filename) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  await query(
    `INSERT INTO render_history (user_id, project_id, filename, mode, quality, clips_count, total_duration)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [user.id, projectId, filename, mode || "shorts", quality || "high", clipsCount || 1, totalDuration || 0],
  );

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserBySession(token);
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const rows = await query<{
    id: number;
    project_id: string;
    filename: string;
    mode: string;
    quality: string;
    clips_count: number;
    total_duration: number;
    created_at: string;
  }>(
    `SELECT id, project_id, filename, mode, quality, clips_count, total_duration, created_at
     FROM render_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`,
    [user.id],
  );

  return NextResponse.json({
    renders: rows.map((r) => ({
      id: r.id,
      projectId: r.project_id,
      filename: r.filename,
      mode: r.mode,
      quality: r.quality,
      clipsCount: r.clips_count,
      totalDuration: r.total_duration,
      createdAt: r.created_at,
    })),
  });
}
