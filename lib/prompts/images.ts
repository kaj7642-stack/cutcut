import type { Scene, SeriesBible } from "../pipeline/types";

/** 3단계 — visual_description → 이미지 생성 프롬프트 변환. */

export const IMAGE_PROMPT_SYSTEM = `너는 이미지 생성 AI용 프롬프트 엔지니어야.
주어진 씬들의 visual_description을 이미지 생성 프롬프트로 변환해.
결과는 반드시 JSON 배열 하나만 출력해.

절대 규칙:
- 모든 image_prompt는 주어진 "스타일 고정 접두어"로 시작해야 해.
  화마다 그림체가 흔들리지 않게 하는 장치니까 한 글자도 바꾸지 마.
- 캐릭터가 등장하는 씬은 바이블의 appearance_keywords를 토씨 하나 바꾸지 말고
  그대로 프롬프트 안에 포함시켜. 동일 인물로 보이게 하는 유일한 장치다.
- 프롬프트는 영어로 써. 배경 / 구도(앵글, 샷 사이즈) / 조명 / 분위기를 모두 담아.
- negative_prompt에는 실존 국기, 실존 군 휘장, 실존 기업 로고, 실존 인물을
  연상시키는 요소를 반드시 배제하도록 명시해. 가상 세력임이 시각적으로도
  구분되게 하는 게 목적이다.
- 입력으로 준 scene_id만 사용하고, 하나도 빠뜨리지 마.

출력 스키마:
[ { "scene_id": string, "image_prompt": string, "negative_prompt": string } ]`;

export function imagePromptUserPrompt(args: {
  bible: SeriesBible;
  scenes: Scene[];
}): string {
  const characterSheet = args.bible.characters
    .map((c) => `- ${c.name} (${c.faction}): ${c.appearance_keywords.join(", ")}`)
    .join("\n");

  const factionSheet = args.bible.factions
    .map((f) => `- ${f.name}: 문장 = ${f.insignia} / 색상 = ${f.color_scheme.join(", ")}`)
    .join("\n");

  const scenePayload = args.scenes.map((s) => ({
    scene_id: s.scene_id,
    visual_description: s.visual_description,
    mood_tag: s.mood_tag,
    characters: s.characters ?? [],
  }));

  return [
    "[스타일 고정 접두어] — 모든 image_prompt는 이 문자열로 시작해야 한다",
    args.bible.art_style,
    "",
    "[캐릭터 외형 고정 키워드]",
    characterSheet,
    "",
    "[세력 문장·색상 — 전부 가상. 실존 국기/휘장으로 대체하지 말 것]",
    factionSheet,
    "",
    "[공통 negative 요소] — 모든 negative_prompt에 포함",
    args.bible.global_negative_prompt,
    "",
    "[씬 목록]",
    JSON.stringify(scenePayload, null, 2),
  ].join("\n");
}
