import { NextRequest, NextResponse } from "next/server";
import { findOrCreateKakaoUser, createSession, SESSION_COOKIE_NAME } from "@/lib/auth";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";

  if (error || !code) {
    return NextResponse.redirect(`${baseUrl}/login?error=kakao_denied`);
  }

  const clientId = process.env.KAKAO_REST_API_KEY!.replace(/﻿/g, "").trim();
  const clientSecret = process.env.KAKAO_CLIENT_SECRET!.replace(/﻿/g, "").trim();
  const redirectUri = `${baseUrl}/api/auth/kakao/callback`;

  try {
    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenRes.ok) {
      console.error("[kakao] token error:", await tokenRes.text());
      return NextResponse.redirect(`${baseUrl}/login?error=kakao_token`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const userRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      console.error("[kakao] user info error:", await userRes.text());
      return NextResponse.redirect(`${baseUrl}/login?error=kakao_user`);
    }

    const kakaoUser = await userRes.json();
    const kakaoId = String(kakaoUser.id);
    const email = kakaoUser.kakao_account?.email ?? null;
    const nickname = kakaoUser.kakao_account?.profile?.nickname ?? null;

    const user = await findOrCreateKakaoUser(kakaoId, email, nickname);
    const sessionToken = await createSession(user.id);

    const state = request.nextUrl.searchParams.get("state") ?? "";
    const redirectPath = state && state.startsWith("/") ? state : "/studio";
    const res = NextResponse.redirect(`${baseUrl}${redirectPath}`);
    res.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[kakao] callback error:", msg);
    return NextResponse.redirect(`${baseUrl}/login?error=kakao_error`);
  }
}
