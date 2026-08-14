import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const clientId = process.env.NAVER_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json({ error: "NAVER_CLIENT_ID 미설정" }, { status: 500 });
  }

  const redirect = request.nextUrl.searchParams.get("redirect") ?? "";
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";
  const redirectUri = `${baseUrl}/api/auth/naver/callback`;
  const state = redirect || crypto.randomBytes(8).toString("hex");
  const url = `https://nid.naver.com/oauth2.0/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${encodeURIComponent(state)}`;

  return NextResponse.redirect(url);
}
