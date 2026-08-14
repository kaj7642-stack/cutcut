import { NextRequest, NextResponse } from "next/server";
import { getUserBySession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(request: NextRequest) {
  let body: { event?: string; data?: Record<string, unknown>; url?: string };
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  if (!body.event || typeof body.event !== "string") {
    return new NextResponse(null, { status: 204 });
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserBySession(token);

  try {
    await query(
      `INSERT INTO analytics_events (user_id, event, url, data) VALUES ($1, $2, $3, $4)`,
      [user?.id ?? null, body.event, body.url ?? null, body.data ? JSON.stringify(body.data) : null],
    );
  } catch {
    // table might not exist yet — silently ignore
  }

  return new NextResponse(null, { status: 204 });
}
