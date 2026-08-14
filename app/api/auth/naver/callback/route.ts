import { NextRequest, NextResponse } from "next/server";
import { findOrCreateNaverUser, createSession, SESSION_COOKIE_NAME } from "@/lib/auth";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const state = request.nextUrl.searchParams.get("state") ?? "";

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";

  if (error || !code) {
    return NextResponse.redirect(`${baseUrl}/login?error=naver_denied`);
  }

  const clientId = process.env.NAVER_CLIENT_ID!.trim();
  const clientSecret = process.env.NAVER_CLIENT_SECRET!.trim();

  try {
    const tokenRes = await fetch(
      `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${clientId}&client_secret=${clientSecret}&code=${code}&state=${encodeURIComponent(state)}`,
    );

    if (!tokenRes.ok) {
      console.error("[naver] token error:", await tokenRes.text());
      return NextResponse.redirect(`${baseUrl}/login?error=naver_token`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const userRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      console.error("[naver] user info error:", await userRes.text());
      return NextResponse.redirect(`${baseUrl}/login?error=naver_user`);
    }

    const naverData = await userRes.json();
    const profile = naverData.response;
    const naverId = String(profile.id);
    const email = profile.email ?? null;
    const nickname = profile.nickname ?? profile.name ?? null;

    const user = await findOrCreateNaverUser(naverId, email, nickname);
    const sessionToken = await createSession(user.id);

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
    console.error("[naver] callback error:", msg);
    return NextResponse.redirect(`${baseUrl}/login?error=naver_error`);
  }
}
