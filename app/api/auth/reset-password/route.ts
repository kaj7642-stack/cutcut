import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { email } = await request.json();
  if (!email) {
    return NextResponse.json({ error: "이메일을 입력해주세요." }, { status: 400 });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await query(
    `INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    [user.id, token, expiresAt],
  );

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100";
  const resetUrl = `${siteUrl}/reset-password?token=${token}`;

  console.log(`[Password Reset] User ${email}: ${resetUrl}`);

  return NextResponse.json({ ok: true });
}
