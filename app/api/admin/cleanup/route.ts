import { NextRequest, NextResponse } from "next/server";
import { getUserBySession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { readdir, stat, rm } from "fs/promises";
import { join } from "path";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
const WORK_DIR = process.env.WORK_DIR || join(process.cwd(), "workdir");
const MAX_AGE_HOURS = 24;

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserBySession(token);
  if (!user || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  let dirs: string[];
  try {
    dirs = await readdir(WORK_DIR);
  } catch {
    return NextResponse.json({ cleaned: 0, message: "작업 디렉토리가 없습니다." });
  }

  const cutoff = Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000;
  let cleaned = 0;
  let freedBytes = 0;

  for (const dir of dirs) {
    const dirPath = join(WORK_DIR, dir);
    try {
      const info = await stat(dirPath);
      if (!info.isDirectory()) continue;
      if (info.mtimeMs < cutoff) {
        const size = await getDirSize(dirPath);
        await rm(dirPath, { recursive: true, force: true });
        cleaned++;
        freedBytes += size;
      }
    } catch {
      continue;
    }
  }

  return NextResponse.json({
    cleaned,
    freedMB: Math.round(freedBytes / 1024 / 1024),
    remaining: dirs.length - cleaned,
  });
}

async function getDirSize(dirPath: string): Promise<number> {
  let size = 0;
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = join(dirPath, entry.name);
      if (entry.isFile()) {
        const info = await stat(entryPath);
        size += info.size;
      } else if (entry.isDirectory()) {
        size += await getDirSize(entryPath);
      }
    }
  } catch { /* ignore */ }
  return size;
}
