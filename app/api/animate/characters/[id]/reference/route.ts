import { NextRequest, NextResponse } from "next/server";
import { getCharacter, updateCharacter } from "@/lib/animate/db";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const c = getCharacter(id);
  if (!c) return NextResponse.json({ error: "캐릭터를 찾을 수 없습니다" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "파일이 필요합니다" }, { status: 400 });

  const ext = file.name.split(".").pop() || "png";
  const dir = join(process.cwd(), "data", "animate-files", "references", id);
  mkdirSync(dir, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  writeFileSync(join(dir, filename), buf);

  const url = `/api/animate/files/references/${id}/${filename}`;
  const images = [...c.reference_images, url];
  updateCharacter(id, { reference_images: images });
  return NextResponse.json({ url, images });
}
