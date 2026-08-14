import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  const checks: Record<string, string> = { status: "ok" };

  try {
    const start = Date.now();
    await query("SELECT 1");
    checks.database = `ok (${Date.now() - start}ms)`;
  } catch {
    checks.database = "error";
    checks.status = "degraded";
  }

  checks.timestamp = new Date().toISOString();

  return NextResponse.json(checks, {
    status: checks.status === "ok" ? 200 : 503,
  });
}
