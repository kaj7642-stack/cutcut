import { NextRequest, NextResponse } from "next/server";
import { generateScript, isLlmConfigured } from "@/lib/animate/claude";
import { getProject, listCharacters } from "@/lib/animate/db";
import type { StyleMode } from "@/lib/animate/types";

export async function POST(req: NextRequest) {
  if (!isLlmConfigured()) {
    return NextResponse.json({ error: "LLM API 키가 설정되지 않았습니다. 설정 → LLM에서 Anthropic API 키를 등록해주세요." }, { status: 400 });
  }

  const body = await req.json() as {
    concept?: string;
    project_id?: string;
    scene_count?: number;
  };

  if (!body.concept?.trim()) {
    return NextResponse.json({ error: "컨셉을 입력해주세요" }, { status: 400 });
  }

  const project = body.project_id ? getProject(body.project_id) : undefined;
  const characters = body.project_id ? listCharacters(body.project_id) : [];

  try {
    const script = await generateScript({
      concept: body.concept,
      characterNames: characters.map(c => c.name),
      sceneCount: body.scene_count ?? 5,
      styleMode: (project?.style_mode ?? "2d") as StyleMode,
    });

    return NextResponse.json({ script });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "대본 생성 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
