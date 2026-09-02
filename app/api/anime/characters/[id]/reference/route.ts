import { NextRequest, NextResponse } from "next/server";
import { get, run } from "@/lib/anime/db";
import type { Character } from "@/lib/anime/types";
import fs from "node:fs";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "anime-uploads", "characters");

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const char = get<Character>("SELECT * FROM characters WHERE id = $id", { id });
  if (!char) return NextResponse.json({ error: "Character not found" }, { status: 404 });

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const ext = path.extname(file.name) || ".png";
  const filename = `${id}_${Date.now()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);

  const images: string[] = JSON.parse(char.reference_images || "[]");
  const url = `/anime-uploads/characters/${filename}`;
  images.push(url);
  run(
    "UPDATE characters SET reference_images = $images, updated_at = $now WHERE id = $id",
    { id, images: JSON.stringify(images), now: new Date().toISOString() }
  );
  return NextResponse.json({ url, images });
}
