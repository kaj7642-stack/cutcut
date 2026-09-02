import type { Scene, SeriesBible } from "../pipeline/types";

/** 4단계 — 씬별 narration_text → TTS 입력 변환. */

export const TTS_SYSTEM = `너는 TTS 엔진에 넣을 나레이션 스크립트를 정리하는 편집자야.
결과는 반드시 JSON 배열 하나만 출력해.

규칙:
- speaker_id: 내레이터면 "narrator", 캐릭터 대사면 "character:{인물명}".
  같은 인물은 매 화 같은 speaker_id를 써야 한다.
- tts_text: 읽기 좋게 다듬되 내용은 바꾸지 마. 숫자·약어는 읽는 대로 풀어써.
  괄호 지문, 이모지, 마크다운 기호는 제거해.
- ssml_or_params.ssml: 문장 사이 자연스러운 호흡 자리에 <break time="..."/>를 넣은
  SSML. 루트는 <speak>. XML 특수문자는 이스케이프해.
- ssml_or_params.rate: 0.5~2.0. mood_tag가 "전투"/"긴장"이면 빠르게(1.1~1.25),
  "드라마"면 느리게(0.85~0.95), "전환"이면 보통(0.95~1.05).
- ssml_or_params.style: 해당 씬을 어떤 톤으로 읽어야 하는지 한 문장 지시.
- 입력으로 준 scene_id만 사용하고, 하나도 빠뜨리지 마.

출력 스키마:
[ { "scene_id": string, "speaker_id": string, "tts_text": string,
    "ssml_or_params": { "rate": number, "style": string, "ssml": string } } ]`;

export function ttsUserPrompt(args: { bible: SeriesBible; scenes: Scene[] }): string {
  const scenePayload = args.scenes.map((s) => ({
    scene_id: s.scene_id,
    narration_text: s.narration_text,
    mood_tag: s.mood_tag,
    speaker: s.speaker ?? null,
  }));

  return [
    `[시리즈 톤앤매너] ${args.bible.tone_and_manner}`,
    `[등장인물] ${args.bible.characters.map((c) => c.name).join(", ")}`,
    "",
    "[씬 목록]",
    JSON.stringify(scenePayload, null, 2),
  ].join("\n");
}
