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

  const [
    userCountRows,
    todaySignupRows,
    totalRenderRows,
    todayRenderRows,
    revenueRows,
    todayRevenueRows,
    creditRows,
    recentUsersRows,
    recentPaymentRows,
    dailyRenderRows,
  ] = await Promise.all([
    query<{ count: string }>("SELECT COUNT(*) as count FROM users"),
    query<{ count: string }>(
      "SELECT COUNT(*) as count FROM users WHERE created_at >= CURRENT_DATE",
    ),
    query<{ count: string }>(
      "SELECT COUNT(*) as count FROM usage_log WHERE action = 'render'",
    ),
    query<{ count: string }>(
      "SELECT COUNT(*) as count FROM usage_log WHERE action = 'render' AND created_at >= CURRENT_DATE",
    ),
    safeQuery<{ total: string }>(
      "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'PAID'",
    ),
    safeQuery<{ total: string }>(
      "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'PAID' AND created_at >= CURRENT_DATE",
    ),
    safeQuery<{ total: string }>(
      "SELECT COALESCE(SUM(remaining), 0) as total FROM credits",
    ),
    query<{ id: number; email: string; nickname: string | null; created_at: string }>(
      "SELECT id, email, nickname, created_at FROM users ORDER BY created_at DESC LIMIT 10",
    ),
    safeQuery<{ payment_id: string; user_id: number; plan_id: string; amount: number; status: string; created_at: string }>(
      "SELECT payment_id, user_id, plan_id, amount, status, created_at FROM payments ORDER BY created_at DESC LIMIT 10",
    ),
    query<{ day: string; count: string }>(
      `SELECT DATE(created_at) as day, COUNT(*) as count
       FROM usage_log WHERE action = 'render' AND created_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY DATE(created_at) ORDER BY day DESC`,
    ),
  ]);

  return NextResponse.json({
    users: {
      total: parseInt(userCountRows[0].count, 10),
      today: parseInt(todaySignupRows[0].count, 10),
    },
    renders: {
      total: parseInt(totalRenderRows[0].count, 10),
      today: parseInt(todayRenderRows[0].count, 10),
    },
    revenue: {
      total: parseInt(revenueRows[0]?.total ?? "0", 10),
      today: parseInt(todayRevenueRows[0]?.total ?? "0", 10),
    },
    creditsOutstanding: parseInt(creditRows[0]?.total ?? "0", 10),
    recentUsers: recentUsersRows.map((u) => ({
      id: u.id,
      email: u.email,
      nickname: u.nickname,
      createdAt: u.created_at,
    })),
    recentPayments: recentPaymentRows.map((p) => ({
      paymentId: p.payment_id,
      userId: p.user_id,
      planId: p.plan_id,
      amount: p.amount,
      status: p.status,
      createdAt: p.created_at,
    })),
    dailyRenders: dailyRenderRows.map((r) => ({
      day: r.day,
      count: parseInt(r.count, 10),
    })),
  });
}

async function safeQuery<T extends Record<string, unknown>>(
  text: string,
): Promise<T[]> {
  try {
    return await query<T>(text);
  } catch {
    return [];
  }
}
