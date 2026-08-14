import { NextRequest, NextResponse } from "next/server";
import { getUserBySession, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserBySession(token);
  if (!user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({ user });
}
