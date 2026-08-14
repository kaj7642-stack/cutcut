import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { token, newPassword } = await request.json();

  if (!token || !newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: "유효하지 않은 요청입니다." }, { status: 400 });
  }

  const rows = await query<{ id: number; user_id: number; expires_at: string; used: boolean }>(
    `SELECT id, user_id, expires_at, used FROM password_resets WHERE token = $1`,
    [token],
  );

  const reset = rows[0];
  if (!reset) {
    return NextResponse.json({ error: "유효하지 않은 링크입니다." }, { status: 400 });
  }

  if (reset.used) {
    return NextResponse.json({ error: "이미 사용된 링크입니다." }, { status: 400 });
  }

  if (new Date(reset.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "만료된 링크입니다. 다시 요청해주세요." }, { status: 400 });
  }

  const passwordHash = hashPassword(newPassword);

  await Promise.all([
    query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, reset.user_id]),
    query(`UPDATE password_resets SET used = true WHERE id = $1`, [reset.id]),
  ]);

  return NextResponse.json({ ok: true });
}
