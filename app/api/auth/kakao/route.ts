import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const clientId = process.env.KAKAO_REST_API_KEY?.replace(/﻿/g, "").trim();
  if (!clientId) {
    return NextResponse.json({ error: "KAKAO_REST_API_KEY 미설정" }, { status: 500 });
  }

  const redirect = request.nextUrl.searchParams.get("redirect") ?? "";
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";
  const redirectUri = `${baseUrl}/api/auth/kakao/callback`;
  let url = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
  if (redirect) {
    url += `&state=${encodeURIComponent(redirect)}`;
  }

  return NextResponse.redirect(url);
}
