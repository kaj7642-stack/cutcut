import { NextResponse } from "next/server";
import { getClipPath } from "@/lib/pipeline";
import { readFile } from "fs/promises";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string; filename: string }> },
) {
  const { projectId, filename } = await params;

  if (filename.includes("..") || projectId.includes("..")) {
    return NextResponse.json({ error: "잘못된 경로" }, { status: 400 });
  }

  const filePath = getClipPath(projectId, filename);

  const buffer = await readFile(filePath).catch(() => null);
  if (!buffer) {
    return NextResponse.json({ error: "클립을 찾을 수 없습니다." }, { status: 404 });
  }

  return new Response(buffer, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(buffer.length),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
