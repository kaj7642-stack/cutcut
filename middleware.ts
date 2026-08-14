import { NextRequest, NextResponse } from "next/server";

const buckets = new Map<string, { count: number; resetAt: number }>();

function checkRate(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count++;
  return bucket.count <= limit;
}

const HEAVY_ROUTES = ["/api/upload", "/api/youtube", "/api/analyze", "/api/stt", "/api/narration", "/api/tts"];
const AUTH_ROUTES = ["/api/auth/login", "/api/auth/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/")) return NextResponse.next();

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";

  if (AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!checkRate(`auth:${ip}`, 10, 60_000)) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 },
      );
    }
  }

  if (HEAVY_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!checkRate(`heavy:${ip}`, 20, 60_000)) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 },
      );
    }
  }

  if (!checkRate(`global:${ip}`, 120, 60_000)) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
