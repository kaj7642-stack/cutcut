import type {
  EpisodeScript,
  ImagePrompt,
  Scene,
  SeriesBible,
  TtsLine,
  MoodTag,
} from "../types";

/**
 * mock 모드: 외부 API 키 없이 파이프라인 전 구간을 실제로 돌려보기 위한
 * 결정론적 픽스처. 검증 스크립트(scripts/verify-pipeline.mjs)가 이 모드를 쓴다.
 */
export function isMockMode(): boolean {
  return process.env.PIPELINE_MOCK === "1" || process.env.PIPELINE_MOCK === "true";
}

const MOODS: MoodTag[] = ["전환", "긴장", "전투", "드라마"];

function mockBible(ctx: { seriesId?: string; brief?: string } = {}): SeriesBible {
  const seriesId = ctx.seriesId || "mock-series";
  return {
    series_id: seriesId,
    series_title: "잿빛 해협 전쟁기",
    setting:
      "가상 근현대. 1930년대 수준의 기계화 보병과 소규모 초전도 병기가 공존하는 대체 역사 세계. " +
      "무대는 실존하지 않는 대륙 '베르나크'와 그 사이의 잿빛 해협.",
    genre_mix: "대체 역사 + 저강도 SF (초전도 병기 한정)",
    factions: [
      {
        name: "카렌 동맹",
        ideology: "해상 교역의 자유와 도시국가 연방제를 신봉한다. 징집보다 계약 복무를 택한다.",
        military_traits: "경량 상륙정과 연안 포함 중심. 기동전과 야간 침투에 강하다.",
        insignia: "세 갈래 파도 위에 놓인 은빛 닻 — 실존 국기·군장과 무관한 가상 문장",
        color_scheme: ["deep teal", "pale silver", "off-white"],
      },
      {
        name: "베르나크 제국군",
        ideology: "대륙 통합과 중앙 계획 경제. 개인보다 국가의 존속을 앞세운다.",
        military_traits: "중장갑 열차포와 대규모 참호전. 보급선이 길고 화력 집중이 강하다.",
        insignia: "맞물린 두 개의 톱니와 곧은 창 한 자루 — 가상 문장",
        color_scheme: ["oxblood red", "gunmetal grey", "brass"],
      },
    ],
    characters: [
      {
        name: "이레네 볼크",
        faction: "카렌 동맹",
        role: "제3상륙전단 지휘관",
        personality: "말수가 적고 계산이 빠르다. 부하의 목숨을 숫자로 부르지 않으려 애쓴다.",
        appearance_keywords: [
          "woman in her thirties",
          "short cropped ash-blonde hair",
          "deep teal naval greatcoat with pale silver piping",
          "scar across left eyebrow",
          "brass telescope tucked in belt",
        ],
      },
      {
        name: "하르만 도이체",
        faction: "베르나크 제국군",
        role: "제7열차포대 대령",
        personality: "규율에 집착하지만 명령의 정당성을 홀로 되묻는다.",
        appearance_keywords: [
          "man in his fifties",
          "slicked-back greying dark hair",
          "oxblood red officer coat with gunmetal shoulder plates",
          "wire-rimmed round glasses",
          "worn leather map case",
        ],
      },
      {
        name: "시엔 마로",
        faction: "카렌 동맹",
        role: "통신병",
        personality: "겁이 많지만 끝내 자리를 뜨지 않는다.",
        appearance_keywords: [
          "young man, early twenties",
          "curly black hair under an oversized field cap",
          "off-white signal corps jacket",
          "freckles",
          "portable field radio strapped to back",
        ],
      },
    ],
    core_conflict:
      "잿빛 해협의 유일한 심해 항로를 두고 카렌 동맹과 베르나크 제국군이 충돌한다. " +
      "항로를 잃으면 동맹은 굶고, 뺏지 못하면 제국은 내부에서 무너진다.",
    story_arc: Array.from({ length: 10 }, (_, i) => ({
      episode: i + 1,
      beat: `${i + 1}화 전개 비트 — 해협을 둘러싼 국면이 한 단계 뒤집힌다.`,
    })),
    tone_and_manner: "다큐 재연풍",
    art_style:
      "cinematic war illustration, muted desaturated palette, dramatic volumetric lighting, " +
      "painterly matte texture, 16:9 wide composition",
    global_negative_prompt:
      "real-world national flags, real military insignia, real corporate logos, " +
      "recognizable real people, modern text overlays, watermark, photo-realistic gore",
    created_at: "2024-01-01T00:00:00.000Z",
  };
}

function mockScript(ctx: { bible?: SeriesBible; episodeNumber?: number } = {}): EpisodeScript {
  const bible = ctx.bible ?? mockBible();
  const n = ctx.episodeNumber ?? 1;
  const sceneCount = 10;

  const narration_script: Scene[] = Array.from({ length: sceneCount }, (_, i) => {
    const mood = MOODS[i % MOODS.length];
    const character = bible.characters[i % bible.characters.length];
    return {
      scene_id: `s${String(i + 1).padStart(2, "0")}`,
      narration_text:
        `${n}화 ${i + 1}번째 장면입니다. ${character.name}은 ${character.faction}의 이름으로 ` +
        `잿빛 해협의 다음 국면을 맞이합니다. 바람은 남서쪽에서 불었고, 보고는 늦었습니다.`,
      estimated_duration_sec: 38,
      visual_description:
        `${character.name} (${character.appearance_keywords.join(", ")})가 ` +
        `잿빛 해협의 안개 낀 부두에 서 있다. 뒤로 ${character.faction}의 함선 실루엣. ` +
        `낮은 앵글, 역광, 차가운 회청색 톤.`,
      mood_tag: mood,
      characters: [character.name],
    };
  });

  return {
    series_id: bible.series_id,
    episode_number: n,
    episode_title: `${n}화 — 잿빛 해협의 첫 신호`,
    narration_script,
    cliffhanger_summary: "해협 남단에서 정체불명의 신호가 잡힌다.",
    episode_summary_for_next:
      `${n}화에서 카렌 동맹은 해협 남단 정찰에 성공했다. ` +
      "베르나크 제국군은 열차포대를 전진 배치했다. 양측 모두 아직 결정타를 내지 못했다.",
  };
}

function mockImagePrompts(ctx: { scenes?: Scene[]; bible?: SeriesBible } = {}): ImagePrompt[] {
  const bible = ctx.bible ?? mockBible();
  const scenes = ctx.scenes ?? mockScript({ bible }).narration_script;
  return scenes.map((s) => ({
    scene_id: s.scene_id,
    image_prompt: `${bible.art_style}, ${s.visual_description}`,
    negative_prompt: bible.global_negative_prompt,
  }));
}

function mockTtsLines(ctx: { scenes?: Scene[] } = {}): TtsLine[] {
  const scenes = ctx.scenes ?? mockScript().narration_script;
  return scenes.map((s) => ({
    scene_id: s.scene_id,
    speaker_id: s.speaker ? `character:${s.speaker}` : "narrator",
    tts_text: s.narration_text,
    ssml_or_params: {
      rate: s.mood_tag === "전투" || s.mood_tag === "긴장" ? 1.15 : 0.95,
      style:
        s.mood_tag === "전투"
          ? "긴박하게, 호흡을 짧게 끊어서"
          : "차분한 다큐멘터리 나레이션 톤",
      ssml: `<speak>${s.narration_text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</speak>`,
    },
  }));
}

const MOCKS: Record<string, (ctx: never) => unknown> = {
  series_bible: mockBible as (ctx: never) => unknown,
  episode_script: mockScript as (ctx: never) => unknown,
  image_prompts: mockImagePrompts as (ctx: never) => unknown,
  tts_lines: mockTtsLines as (ctx: never) => unknown,
};

export function getMockJson(task: string, ctx: unknown): unknown {
  const factory = MOCKS[task];
  if (!factory) throw new Error(`mock 픽스처가 없는 작업입니다: ${task}`);
  return (factory as (c: unknown) => unknown)(ctx ?? {});
}
