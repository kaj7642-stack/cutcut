import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [userRows, renderRows] = await Promise.all([
      query<{ count: string }>(`SELECT COUNT(*) as count FROM users`),
      query<{ count: string }>(`SELECT COUNT(*) as count FROM usage_log WHERE action = 'render'`),
    ]);

    const users = parseInt(userRows[0].count, 10);
    const renders = parseInt(renderRows[0].count, 10);

    return NextResponse.json({
      users: Math.max(users, 100),
      renders: Math.max(renders, 500),
      games: 7,
    });
  } catch {
    return NextResponse.json({ users: 100, renders: 500, games: 7 });
  }
}
