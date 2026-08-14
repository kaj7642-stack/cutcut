import { NextRequest, NextResponse } from "next/server";
import { getUserBySession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { consumeCredit, getRemainingCredits } from "@/lib/payment";
import { query } from "@/lib/db";

const FREE_RENDER_LIMIT = 3;

async function getFreeRendersUsed(userId: number): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM usage_log WHERE user_id = $1 AND action = 'render'`,
    [userId]
  );
  return parseInt(rows[0].count, 10);
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserBySession(token);
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const freeUsed = await getFreeRendersUsed(user.id);
  if (freeUsed < FREE_RENDER_LIMIT) {
    await query(
      `INSERT INTO usage_log (user_id, action) VALUES ($1, 'render')`,
      [user.id]
    );
    const freeLeft = FREE_RENDER_LIMIT - freeUsed - 1;
    return NextResponse.json({ ok: true, method: "free", freeLeft });
  }

  const credits = await getRemainingCredits(user.id);
  if (credits <= 0) {
    return NextResponse.json(
      { error: "크레딧이 부족합니다.", needCredits: true },
      { status: 402 }
    );
  }

  const consumed = await consumeCredit(user.id);
  if (!consumed) {
    return NextResponse.json(
      { error: "크레딧 차감에 실패했습니다.", needCredits: true },
      { status: 402 }
    );
  }

  await query(
    `INSERT INTO usage_log (user_id, action) VALUES ($1, 'render')`,
    [user.id]
  );

  const remaining = await getRemainingCredits(user.id);
  return NextResponse.json({ ok: true, method: "credit", credits: remaining });
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserBySession(token);
  if (!user) {
    return NextResponse.json({ freeLeft: FREE_RENDER_LIMIT, credits: 0 });
  }

  const freeUsed = await getFreeRendersUsed(user.id);
  const freeLeft = Math.max(0, FREE_RENDER_LIMIT - freeUsed);
  const credits = await getRemainingCredits(user.id);

  return NextResponse.json({ freeLeft, credits });
}
