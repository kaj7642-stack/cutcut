import { NextRequest, NextResponse } from "next/server";
import { getUserBySession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { query } from "@/lib/db";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserBySession(token);
  if (!user || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const days = Math.min(90, Math.max(1, parseInt(searchParams.get("days") || "7", 10)));

  try {
    const [eventCounts, dailyCounts] = await Promise.all([
      query<{ event: string; count: string }>(
        `SELECT event, COUNT(*) as count FROM analytics_events
         WHERE created_at > now() - interval '1 day' * $1
         GROUP BY event ORDER BY count DESC`,
        [days],
      ),
      query<{ day: string; count: string }>(
        `SELECT DATE(created_at) as day, COUNT(*) as count FROM analytics_events
         WHERE created_at > now() - interval '1 day' * $1
         GROUP BY DATE(created_at) ORDER BY day DESC`,
        [days],
      ),
    ]);

    return NextResponse.json({
      events: eventCounts.map((r) => ({ event: r.event, count: parseInt(r.count, 10) })),
      daily: dailyCounts.map((r) => ({ day: r.day, count: parseInt(r.count, 10) })),
      days,
    });
  } catch {
    return NextResponse.json({ events: [], daily: [], days });
  }
}
