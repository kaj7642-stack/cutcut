import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const MIME: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".mp4": "video/mp4", ".webm": "video/webm", ".mp3": "audio/mpeg",
  ".wav": "audio/wav", ".ogg": "audio/ogg",
};

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { path: segments } = await params;
  if (segments.some(s => s === ".." || s.startsWith("."))) {
    return NextResponse.json({ error: "잘못된 경로" }, { status: 400 });
  }

  const filePath = join(process.cwd(), "data", "animate-files", ...segments);
  if (!existsSync(filePath)) return NextResponse.json({ error: "파일 없음" }, { status: 404 });

  const ext = extname(filePath).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";
  const buf = readFileSync(filePath);

  return new NextResponse(buf, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
