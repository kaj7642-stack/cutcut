import { NextResponse } from "next/server";
import { isLlmConfigured } from "@/lib/animate/claude";

export async function GET() {
  return NextResponse.json({ configured: isLlmConfigured() });
}
