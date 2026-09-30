import Anthropic from "@anthropic-ai/sdk";
import { getActiveSetting } from "./db";
import type { AnimCharacter, StyleMode } from "./types";

function getClient(): Anthropic | null {
  const setting = getActiveSetting("llm");
  if (!setting?.api_key) return null;
  return new Anthropic({ apiKey: setting.api_key });
}

function getModel(): string {
  const setting = getActiveSetting("llm");
  return setting?.model_name || "claude-sonnet-5";
}

export async function generateScript(opts: {
  concept: string;
  characterNames: string[];
  sceneCount?: number;
  styleMode: StyleMode;
  language?: string;
}): Promise<string> {
  const client = getClient();
  if (!client) throw new Error("LLM API 키가 설정되지 않았습니다. 설정 페이지에서 Anthropic API 키를 등록해주세요.");

  const lang = opts.language ?? "ko";
  const charList = opts.characterNames.length > 0
    ? `등장인물: ${opts.characterNames.join(", ")}`
    : "등장인물은 자유롭게 생성해주세요";
  const sceneCount = opts.sceneCount ?? 5;

  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    messages: [{
      role: "user",
      content: `당신은 애니메이션 대본 작가입니다. 다음 컨셉으로 ${sceneCount}개 씬의 대본을 작성해주세요.

컨셉: ${opts.concept}
${charList}
스타일: ${opts.styleMode === "2d" ? "2D 애니메이션" : "3D CG 애니메이션"}
씬 수: ${sceneCount}개

규칙:
- 각 씬은 "씬 N:" 으로 시작
- 대사는 "캐릭터명: 대사" 형식
- 지문/배경 설명은 (괄호) 안에
- 카메라 지시는 자연스럽게 포함 (줌인, 팬 등)
- 씬 사이에 "---" 구분선 사용
- ${lang === "ko" ? "한국어로" : "English"} 작성

대본만 출력하세요. 부가 설명 없이.`,
    }],
  });

  for (const block of response.content) {
    if (block.type === "text") return block.text;
  }
  return "";
}

export async function enhanceScenePrompt(opts: {
  description: string;
  dialogue?: string;
  characters: AnimCharacter[];
  styleMode: StyleMode;
}): Promise<string> {
  const client = getClient();
  if (!client) throw new Error("LLM API 키가 설정되지 않았습니다.");

  const charInfo = opts.characters.length > 0
    ? opts.characters.map(c => `- ${c.name}: ${c.description} (외형: ${c.style_prompt})`).join("\n")
    : "캐릭터 정보 없음";

  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `이미지 생성 AI를 위한 영문 프롬프트를 작성해주세요.

씬 설명: ${opts.description}
${opts.dialogue ? `대사 맥락: ${opts.dialogue}` : ""}
캐릭터:
${charInfo}
스타일: ${opts.styleMode === "2d" ? "Japanese 2D anime" : "3D CG Pixar-style"}

규칙:
- 영어로 작성
- 시각적 요소에 집중 (구도, 조명, 색감, 표정, 포즈)
- 캐릭터 외형 묘사 포함
- 스타일 키워드 포함
- 한 문단으로, 150단어 이내
- 프롬프트만 출력, 부가 설명 없이`,
    }],
  });

  for (const block of response.content) {
    if (block.type === "text") return block.text;
  }
  return "";
}

export async function enhanceDialogue(opts: {
  dialogue: string;
  description: string;
  characters: AnimCharacter[];
}): Promise<string> {
  const client = getClient();
  if (!client) throw new Error("LLM API 키가 설정되지 않았습니다.");

  const charInfo = opts.characters.map(c => `- ${c.name}: ${c.description}`).join("\n");

  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `다음 대사를 자연스럽고 감정이 풍부하게 다듬어주세요.

씬 배경: ${opts.description}
캐릭터:
${charInfo}

원본 대사:
${opts.dialogue}

규칙:
- 같은 형식 유지 (캐릭터명: 대사)
- 캐릭터 성격에 맞는 말투
- 감정과 뉘앙스 강화
- 대사만 출력`,
    }],
  });

  for (const block of response.content) {
    if (block.type === "text") return block.text;
  }
  return "";
}

export function isLlmConfigured(): boolean {
  const setting = getActiveSetting("llm");
  return !!(setting?.api_key);
}
