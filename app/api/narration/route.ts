import { NextResponse } from "next/server";
import { generateNarrations } from "@/lib/narration";

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json();
  const { clips, tone } = body;

  if (!clips || !tone) {
    return NextResponse.json({ error: "clips와 tone이 필요합니다." }, { status: 400 });
  }

  const drafts = await generateNarrations(clips, tone);

  return NextResponse.json({ drafts });
}
