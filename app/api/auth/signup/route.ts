import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, hashPassword, createSession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { email, password, nickname } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "이메일과 비밀번호를 입력하세요." }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "비밀번호는 6자 이상이어야 합니다." }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "올바른 이메일 형식이 아닙니다." }, { status: 400 });
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
  }

  const passwordHash = hashPassword(password);
  const rows = await query<{ id: number }>(
    "INSERT INTO users (email, password_hash, nickname) VALUES ($1, $2, $3) RETURNING id",
    [email.trim().toLowerCase(), passwordHash, nickname?.trim() || null],
  );

  const token = await createSession(rows[0].id);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}
