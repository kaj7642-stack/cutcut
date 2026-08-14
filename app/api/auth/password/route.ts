import { NextRequest, NextResponse } from "next/server";
import { getUserBySession, SESSION_COOKIE_NAME, verifyPassword, hashPassword, findUserByEmail } from "@/lib/auth";
import { query } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserBySession(token);
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { currentPassword, newPassword } = await request.json();

  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: "새 비밀번호는 6자 이상이어야 합니다." }, { status: 400 });
  }

  const dbUser = await findUserByEmail(user.email);
  if (dbUser?.passwordHash) {
    if (!currentPassword) {
      return NextResponse.json({ error: "현재 비밀번호를 입력하세요." }, { status: 400 });
    }
    if (!verifyPassword(currentPassword, dbUser.passwordHash)) {
      return NextResponse.json({ error: "현재 비밀번호가 올바르지 않습니다." }, { status: 401 });
    }
  }

  const newHash = hashPassword(newPassword);
  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, user.id]);

  return NextResponse.json({ ok: true });
}
