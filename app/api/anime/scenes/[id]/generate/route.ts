import { NextRequest, NextResponse } from "next/server";
import { get, run, all } from "@/lib/anime/db";
import type { Scene, Character, AnimeProject, Episode } from "@/lib/anime/types";
import { STYLE_SUFFIXES } from "@/lib/anime/types";
import { getImageAdapter, getVideoAdapter } from "@/lib/anime/adapters";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();
  const mode = body.mode || "image"; // "image" | "video"

  const scene = get<Scene>("SELECT * FROM scenes WHERE id = $id", { id });
  if (!scene) return NextResponse.json({ error: "Scene not found" }, { status: 404 });

  const episode = get<Episode>("SELECT * FROM episodes WHERE id = $eid", { eid: scene.episode_id });
  if (!episode) return NextResponse.json({ error: "Episode not found" }, { status: 404 });

  const project = get<AnimeProject>("SELECT * FROM projects WHERE id = $pid", { pid: episode.project_id });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Get characters for this scene
  const charIds: string[] = JSON.parse(scene.character_ids || "[]");
  const characters: Character[] = [];
  for (const cid of charIds) {
    const c = get<Character>("SELECT * FROM characters WHERE id = $cid", { cid });
    if (c) characters.push(c);
  }

  // Build prompt
  const styleSuffix = STYLE_SUFFIXES[project.style_mode];
  const charDescriptions = characters.map(c => {
    const customStyle = c.style_prompt ? `, ${c.style_prompt}` : "";
    return `${c.name}${customStyle}`;
  }).join(", ");

  const prompt = [
    scene.description,
    charDescriptions ? `Characters: ${charDescriptions}` : "",
    scene.dialogue ? `Scene dialogue: "${scene.dialogue}"` : "",
    `Camera: ${scene.camera_direction}`,
    styleSuffix,
  ].filter(Boolean).join(". ");

  // Determine resolution from aspect ratio
  const isVertical = project.aspect_ratio === "9:16";
  const width = isVertical ? 720 : 1280;
  const height = isVertical ? 1280 : 720;

  const refImages = characters.flatMap(c => {
    try { return JSON.parse(c.reference_images || "[]"); } catch { return []; }
  });

  try {
    // Update status
    run("UPDATE scenes SET status = $status, prompt_used = $prompt, updated_at = $now WHERE id = $id", {
      id,
      status: mode === "video" ? "generating_video" : "generating_image",
      prompt,
      now: new Date().toISOString(),
    });

    if (mode === "image" || mode === "both") {
      const adapter = getImageAdapter();
      const seed = characters[0]?.seed_value || 0;
      const result = await adapter.generate({
        prompt,
        reference_images: refImages,
        width,
        height,
        seed: seed || undefined,
      });

      run("UPDATE scenes SET generated_image_url = $url, api_log = $log, updated_at = $now WHERE id = $id", {
        id, url: result.image_url, log: JSON.stringify(result.raw_response), now: new Date().toISOString(),
      });

      // If both, also generate video from the image
      if (mode === "both") {
        run("UPDATE scenes SET status = 'generating_video', updated_at = $now WHERE id = $id", { id, now: new Date().toISOString() });
        const videoAdapter = getVideoAdapter();
        const videoResult = await videoAdapter.generate({
          prompt,
          image_url: result.image_url,
          reference_images: refImages,
          duration_seconds: scene.duration_seconds,
          width,
          height,
          seed: seed || undefined,
        });

        run("UPDATE scenes SET generated_video_url = $url, status = 'completed', updated_at = $now WHERE id = $id", {
          id, url: videoResult.video_url, now: new Date().toISOString(),
        });
      } else {
        run("UPDATE scenes SET status = 'completed', updated_at = $now WHERE id = $id", { id, now: new Date().toISOString() });
      }
    } else if (mode === "video") {
      const videoAdapter = getVideoAdapter();
      const videoResult = await videoAdapter.generate({
        prompt,
        image_url: scene.generated_image_url || undefined,
        reference_images: refImages,
        duration_seconds: scene.duration_seconds,
        width,
        height,
      });

      run("UPDATE scenes SET generated_video_url = $url, status = 'completed', updated_at = $now WHERE id = $id", {
        id, url: videoResult.video_url, now: new Date().toISOString(),
      });
    }

    const updated = get<Scene>("SELECT * FROM scenes WHERE id = $id", { id });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    run("UPDATE scenes SET status = 'failed', api_log = $log, updated_at = $now WHERE id = $id", {
      id, log: JSON.stringify({ error: msg }), now: new Date().toISOString(),
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
