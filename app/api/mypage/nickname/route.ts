import { NextRequest, NextResponse } from "next/server";
import { getUserBySession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { query } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserBySession(token);
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { nickname } = await request.json();
  const trimmed = (nickname ?? "").trim();

  if (trimmed.length > 20) {
    return NextResponse.json({ error: "닉네임은 20자 이하여야 합니다." }, { status: 400 });
  }

  await query("UPDATE users SET nickname = $1 WHERE id = $2", [trimmed || null, user.id]);

  return NextResponse.json({ ok: true, nickname: trimmed || null });
}
