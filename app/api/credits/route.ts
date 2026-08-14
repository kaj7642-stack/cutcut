import { NextRequest, NextResponse } from "next/server";
import { getUserBySession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getRemainingCredits } from "@/lib/payment";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserBySession(token);
  if (!user) {
    return NextResponse.json({ credits: 0 });
  }

  const credits = await getRemainingCredits(user.id);
  return NextResponse.json({ credits });
}
