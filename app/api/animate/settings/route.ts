import { NextRequest, NextResponse } from "next/server";
import { listSettings, upsertSetting, deleteSetting } from "@/lib/animate/db";

export async function GET() {
  return NextResponse.json(listSettings());
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  if (!body.provider || !body.api_type) return NextResponse.json({ error: "provider, api_type 필요" }, { status: 400 });
  const s = upsertSetting(body);
  return NextResponse.json(s);
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  if (!deleteSetting(id)) return NextResponse.json({ error: "설정을 찾을 수 없습니다" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
