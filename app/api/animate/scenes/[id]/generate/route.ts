import { NextRequest, NextResponse } from "next/server";
import { getScene, updateScene, getActiveSetting, listCharacters, getEpisode, getProject } from "@/lib/animate/db";
import { createImageAdapter, createVideoAdapter } from "@/lib/animate/adapters";
import { buildImagePrompt, buildVideoPrompt } from "@/lib/animate/prompt-builder";
import type { StyleMode } from "@/lib/animate/types";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json() as { type?: "image" | "video" };
  const genType = body.type ?? "image";

  const scene = getScene(id);
  if (!scene) return NextResponse.json({ error: "씬을 찾을 수 없습니다" }, { status: 404 });

  const episode = getEpisode(scene.episode_id);
  if (!episode) return NextResponse.json({ error: "에피소드를 찾을 수 없습니다" }, { status: 404 });

  const project = getProject(episode.project_id);
  if (!project) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다" }, { status: 404 });

  const characters = listCharacters(project.id);
  const styleMode = project.style_mode as StyleMode;
  const isWide = project.default_aspect_ratio === "16:9";
  const w = isWide ? 1280 : 720;
  const h = isWide ? 720 : 1280;

  updateScene(id, { status: "generating", api_log: null });

  try {
    if (genType === "image") {
      const adapter = createImageAdapter(getActiveSetting("image") ?? undefined);
      const prompt = buildImagePrompt(scene, characters, styleMode);
      const result = await adapter.generate(prompt, { width: w, height: h, seed: characters[0]?.seed_value ?? undefined });
      updateScene(id, { generated_image_url: result.imageUrl, status: "completed", api_log: JSON.stringify({ type: "image", adapter: adapter.name, prompt, result }) });
      return NextResponse.json({ type: "image", ...result });
    } else {
      const adapter = createVideoAdapter(getActiveSetting("video") ?? undefined);
      const prompt = buildVideoPrompt(scene, characters, styleMode);
      const result = await adapter.generate(prompt, { imageUrl: scene.generated_image_url ?? undefined, duration: scene.duration, width: w, height: h });
      updateScene(id, { generated_video_url: result.videoUrl, status: "completed", api_log: JSON.stringify({ type: "video", adapter: adapter.name, prompt, result }) });
      return NextResponse.json({ type: "video", ...result });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    updateScene(id, { status: "failed", api_log: JSON.stringify({ error: msg }) });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
