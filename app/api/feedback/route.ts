import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserBySession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  const user = await getUserBySession(token);

  let body: { category?: string; message?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { category = "general", message, email } = body;

  if (!message || message.trim().length < 5) {
    return NextResponse.json({ error: "메시지를 5자 이상 입력해주세요." }, { status: 400 });
  }

  if (message.length > 2000) {
    return NextResponse.json({ error: "메시지는 2000자 이내로 입력해주세요." }, { status: 400 });
  }

  const validCategories = ["general", "bug", "feature", "question"];
  const safeCategory = validCategories.includes(category) ? category : "general";

  await query(
    "INSERT INTO feedback (user_id, category, message, email) VALUES ($1, $2, $3, $4)",
    [user?.id ?? null, safeCategory, message.trim(), email?.trim() || null],
  );

  return NextResponse.json({ ok: true });
}
