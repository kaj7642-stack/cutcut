import { NextRequest, NextResponse } from "next/server";
import { getUserBySession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { query } from "@/lib/db";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

async function isAdmin(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserBySession(token);
  if (!user) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("q") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  let users;
  let total;

  if (search) {
    const pattern = `%${search}%`;
    [users, total] = await Promise.all([
      query<{ id: number; email: string; nickname: string | null; created_at: string }>(
        `SELECT id, email, nickname, created_at FROM users
         WHERE email ILIKE $1 OR nickname ILIKE $1
         ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [pattern, limit, offset],
      ),
      query<{ count: string }>(
        "SELECT COUNT(*) as count FROM users WHERE email ILIKE $1 OR nickname ILIKE $1",
        [pattern],
      ),
    ]);
  } else {
    [users, total] = await Promise.all([
      query<{ id: number; email: string; nickname: string | null; created_at: string }>(
        "SELECT id, email, nickname, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        [limit, offset],
      ),
      query<{ count: string }>("SELECT COUNT(*) as count FROM users"),
    ]);
  }

  const userIds = users.map((u) => u.id);

  let creditMap: Record<number, number> = {};
  let renderMap: Record<number, number> = {};

  if (userIds.length > 0) {
    const placeholders = userIds.map((_, i) => `$${i + 1}`).join(",");

    try {
      const creditRows = await query<{ user_id: number; total: string }>(
        `SELECT user_id, COALESCE(SUM(remaining), 0) as total FROM credits WHERE user_id IN (${placeholders}) GROUP BY user_id`,
        userIds,
      );
      creditMap = Object.fromEntries(creditRows.map((r) => [r.user_id, parseInt(r.total, 10)]));
    } catch { /* credits table might not exist */ }

    const renderRows = await query<{ user_id: number; count: string }>(
      `SELECT user_id, COUNT(*) as count FROM usage_log WHERE action = 'render' AND user_id IN (${placeholders}) GROUP BY user_id`,
      userIds,
    );
    renderMap = Object.fromEntries(renderRows.map((r) => [r.user_id, parseInt(r.count, 10)]));
  }

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      nickname: u.nickname,
      createdAt: u.created_at,
      credits: creditMap[u.id] || 0,
      renders: renderMap[u.id] || 0,
    })),
    total: parseInt(total[0].count, 10),
    page,
    pages: Math.ceil(parseInt(total[0].count, 10) / limit),
  });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { userId, credits } = await request.json();
  if (!userId || typeof credits !== "number" || credits <= 0) {
    return NextResponse.json({ error: "userId와 양수 credits가 필요합니다." }, { status: 400 });
  }

  try {
    await query(
      "INSERT INTO credits (user_id, remaining, plan_id) VALUES ($1, $2, 'admin_grant')",
      [userId, credits],
    );
    return NextResponse.json({ ok: true, added: credits });
  } catch {
    return NextResponse.json({ error: "크레딧 추가에 실패했습니다." }, { status: 500 });
  }
}
