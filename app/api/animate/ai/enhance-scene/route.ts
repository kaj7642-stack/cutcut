import { NextRequest, NextResponse } from "next/server";
import { enhanceScenePrompt, enhanceDialogue, isLlmConfigured } from "@/lib/animate/claude";
import { getScene, getProject, listCharacters } from "@/lib/animate/db";
import { getEpisode } from "@/lib/animate/db";
import type { StyleMode } from "@/lib/animate/types";

export async function POST(req: NextRequest) {
  if (!isLlmConfigured()) {
    return NextResponse.json({ error: "LLM API 키가 설정되지 않았습니다." }, { status: 400 });
  }

  const body = await req.json() as {
    scene_id?: string;
    type?: "prompt" | "dialogue";
    description?: string;
    dialogue?: string;
    project_id?: string;
  };

  try {
    if (body.scene_id) {
      const scene = getScene(body.scene_id);
      if (!scene) return NextResponse.json({ error: "씬을 찾을 수 없습니다" }, { status: 404 });

      const episode = getEpisode(scene.episode_id);
      if (!episode) return NextResponse.json({ error: "에피소드를 찾을 수 없습니다" }, { status: 404 });

      const project = getProject(episode.project_id);
      const characters = listCharacters(episode.project_id)
        .filter(c => scene.character_ids.includes(c.id));

      if (body.type === "dialogue" && scene.dialogue) {
        const enhanced = await enhanceDialogue({
          dialogue: scene.dialogue,
          description: scene.description,
          characters,
        });
        return NextResponse.json({ dialogue: enhanced });
      }

      const prompt = await enhanceScenePrompt({
        description: scene.description,
        dialogue: scene.dialogue,
        characters,
        styleMode: (project?.style_mode ?? "2d") as StyleMode,
      });
      return NextResponse.json({ prompt });
    }

    if (body.description) {
      const characters = body.project_id ? listCharacters(body.project_id) : [];
      const project = body.project_id ? getProject(body.project_id) : undefined;

      const prompt = await enhanceScenePrompt({
        description: body.description,
        dialogue: body.dialogue,
        characters,
        styleMode: (project?.style_mode ?? "2d") as StyleMode,
      });
      return NextResponse.json({ prompt });
    }

    return NextResponse.json({ error: "scene_id 또는 description이 필요합니다" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "프롬프트 보강 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
