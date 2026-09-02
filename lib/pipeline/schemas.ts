import { z } from "zod";
import type { Validator, ValidationIssue } from "./providers/llm";
import { MOOD_TAGS, TONE_AND_MANNERS } from "./types";

/* ── 1단계 ──────────────────────────────────────────────────────── */

export const bibleFactionSchema = z.object({
  name: z.string().min(1),
  ideology: z.string().min(1),
  military_traits: z.string().min(1),
  insignia: z.string().min(1),
  color_scheme: z.array(z.string().min(1)).min(1),
});

export const bibleCharacterSchema = z.object({
  name: z.string().min(1),
  faction: z.string().min(1),
  role: z.string().min(1),
  personality: z.string().min(1),
  appearance_keywords: z
    .array(z.string().min(1))
    .min(3, "이미지 재현용 외형 키워드는 3개 이상이어야 합니다."),
});

export const seriesBibleSchema = z
  .object({
    series_id: z.string().min(1),
    series_title: z.string().min(1),
    setting: z.string().min(1),
    genre_mix: z.string().min(1),
    factions: z.array(bibleFactionSchema).min(2, "대립 세력은 2개 이상이어야 합니다."),
    characters: z.array(bibleCharacterSchema).min(3).max(5),
    core_conflict: z.string().min(1),
    story_arc: z
      .array(z.object({ episode: z.number().int().positive(), beat: z.string().min(1) }))
      .length(10, "전개 아크는 10화 기준으로 10개여야 합니다."),
    tone_and_manner: z.enum(TONE_AND_MANNERS),
    art_style: z.string().min(1),
    global_negative_prompt: z.string().min(1),
    created_at: z.string().min(1),
  })
  .superRefine((bible, ctx) => {
    const factionNames = new Set(bible.factions.map((f) => f.name));
    bible.characters.forEach((c, i) => {
      if (!factionNames.has(c.faction)) {
        ctx.addIssue({
          code: "custom",
          path: ["characters", i, "faction"],
          message: `factions에 없는 소속입니다. 허용: ${[...factionNames].join(" / ")}`,
        });
      }
    });
  });

/* ── 2단계 ──────────────────────────────────────────────────────── */

export const sceneSchema = z.object({
  scene_id: z.string().min(1),
  narration_text: z.string().min(1),
  estimated_duration_sec: z.number().positive(),
  visual_description: z.string().min(20, "visual_description이 너무 짧습니다."),
  mood_tag: z.enum(MOOD_TAGS),
  characters: z.array(z.string().min(1)).optional(),
  speaker: z.string().min(1).optional(),
  image_path: z.string().optional(),
  audio_path: z.string().optional(),
  duration_actual_sec: z.number().positive().optional(),
});

export const episodeScriptSchema = z
  .object({
    series_id: z.string().min(1),
    episode_number: z.number().int().positive(),
    episode_title: z.string().min(1),
    narration_script: z
      .array(sceneSchema)
      .min(8, "씬은 8개 이상이어야 합니다.")
      .max(15, "씬은 15개 이하여야 합니다."),
    cliffhanger_summary: z.string().min(1),
    episode_summary_for_next: z.string().min(1),
  })
  .superRefine((script, ctx) => {
    const seen = new Set<string>();
    script.narration_script.forEach((s, i) => {
      if (seen.has(s.scene_id)) {
        ctx.addIssue({
          code: "custom",
          path: ["narration_script", i, "scene_id"],
          message: `scene_id가 중복됩니다: ${s.scene_id}`,
        });
      }
      seen.add(s.scene_id);
    });

    const total = script.narration_script.reduce((a, s) => a + s.estimated_duration_sec, 0);
    // 영상 기준 6~8분 분량. 생성 편차를 감안해 5~10분까지 허용한다.
    if (total < 300 || total > 600) {
      ctx.addIssue({
        code: "custom",
        path: ["narration_script"],
        message:
          `전체 예상 길이가 ${Math.round(total)}초입니다. ` +
          "6~8분(360~480초)에 맞춰 씬별 estimated_duration_sec을 조정하세요.",
      });
    }
  });

/* ── 3단계 ──────────────────────────────────────────────────────── */

export const imagePromptSchema = z.object({
  scene_id: z.string().min(1),
  image_prompt: z.string().min(20),
  negative_prompt: z.string().min(1),
});

export const imagePromptListSchema = z.array(imagePromptSchema).min(1);

/* ── 4단계 ──────────────────────────────────────────────────────── */

export const ttsParamsSchema = z.object({
  rate: z.number().min(0.5).max(2),
  style: z.string().min(1),
  ssml: z.string().optional(),
});

export const ttsLineSchema = z.object({
  scene_id: z.string().min(1),
  speaker_id: z.string().min(1),
  tts_text: z.string().min(1),
  ssml_or_params: ttsParamsSchema,
});

export const ttsLineListSchema = z.array(ttsLineSchema).min(1);

/* ── zod ↔ 파이프라인 Validator 어댑터 ─────────────────────────── */

export function toIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((i) => ({
    path: i.path.length ? i.path.join(".") : "(root)",
    message: i.message,
  }));
}

/** zod 스키마를 generateJson()이 받는 Validator로 감싼다. */
export function validatorFor<T>(schema: z.ZodType<T>): (raw: unknown) => Validator<T> {
  return (raw) => {
    const parsed = schema.safeParse(raw);
    return parsed.success
      ? { ok: true, value: parsed.data }
      : { ok: false, issues: toIssues(parsed.error) };
  };
}

/**
 * 목록형 응답에서 "씬 집합이 정확히 일치하는지"까지 검증하는 Validator.
 * 3·4단계에서 씬 누락/유령 씬을 걸러 재생성을 유도한다.
 */
export function listValidatorCovering<T extends { scene_id: string }>(
  schema: z.ZodType<T[]>,
  expectedSceneIds: string[],
): (raw: unknown) => Validator<T[]> {
  const base = validatorFor(schema);
  return (raw) => {
    const parsed = base(raw);
    if (!parsed.ok) return parsed;

    const got = new Set(parsed.value.map((v) => v.scene_id));
    const issues: ValidationIssue[] = [];

    const missing = expectedSceneIds.filter((id) => !got.has(id));
    if (missing.length) {
      issues.push({
        path: "(root)",
        message: `누락된 scene_id: ${missing.join(", ")}. 모든 씬을 빠짐없이 포함하세요.`,
      });
    }
    const extra = [...got].filter((id) => !expectedSceneIds.includes(id));
    if (extra.length) {
      issues.push({
        path: "(root)",
        message: `존재하지 않는 scene_id: ${extra.join(", ")}. 주어진 씬만 사용하세요.`,
      });
    }

    return issues.length ? { ok: false, issues } : parsed;
  };
}
