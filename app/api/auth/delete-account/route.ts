import { NextRequest, NextResponse } from "next/server";
import { getUserBySession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { query } from "@/lib/db";

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserBySession(token);
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { confirm } = await request.json();
  if (confirm !== "DELETE") {
    return NextResponse.json({ error: "확인 코드가 올바르지 않습니다." }, { status: 400 });
  }

  await query("DELETE FROM sessions WHERE user_id = $1", [user.id]);
  await query("DELETE FROM usage_log WHERE user_id = $1", [user.id]);

  try {
    await query("DELETE FROM credits WHERE user_id = $1", [user.id]);
  } catch { /* table may not exist */ }

  try {
    await query("DELETE FROM payments WHERE user_id = $1", [user.id]);
  } catch { /* table may not exist */ }

  await query("DELETE FROM users WHERE id = $1", [user.id]);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return res;
}
