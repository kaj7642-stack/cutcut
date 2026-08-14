import { NextRequest, NextResponse } from "next/server";
import { getUserBySession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getRemainingCredits } from "@/lib/payment";
import { query } from "@/lib/db";

interface UsageRow {
  action: string;
  created_at: string;
}

interface PaymentRow {
  plan_id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface UserRow {
  created_at: string;
  kakao_id: string | null;
  naver_id: string | null;
  password_hash: string;
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserBySession(token);
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const [credits, usageRows, userRows] = await Promise.all([
    getRemainingCredits(user.id),
    query<UsageRow>(
      `SELECT action, created_at FROM usage_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [user.id],
    ),
    query<UserRow>(
      `SELECT created_at, kakao_id, naver_id, password_hash FROM users WHERE id = $1`,
      [user.id],
    ),
  ]);

  let payments: PaymentRow[] = [];
  try {
    payments = await query<PaymentRow>(
      `SELECT plan_id, amount, status, created_at FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [user.id],
    );
  } catch {
    // payments table may not exist yet
  }

  let renderHistoryCount = 0;
  try {
    const histRows = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM render_history WHERE user_id = $1`,
      [user.id],
    );
    renderHistoryCount = parseInt(histRows[0].count, 10);
  } catch {
    // render_history table may not exist yet
  }

  const renders = Math.max(
    usageRows.filter((r) => r.action === "render").length,
    renderHistoryCount,
  );

  const loginMethods: string[] = [];
  if (userRows[0]?.kakao_id) loginMethods.push("kakao");
  if (userRows[0]?.naver_id) loginMethods.push("naver");
  if (userRows[0]?.password_hash) loginMethods.push("email");

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      createdAt: userRows[0]?.created_at,
      loginMethods,
    },
    credits,
    totalRenders: renders,
    recentUsage: usageRows.slice(0, 20).map((r) => ({
      action: r.action,
      createdAt: r.created_at,
    })),
    payments: payments.map((p) => ({
      planId: p.plan_id,
      amount: p.amount,
      status: p.status,
      createdAt: p.created_at,
    })),
  });
}
