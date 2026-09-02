import { describe, expect, it } from "vitest";
import {
  episodeScriptSchema,
  imagePromptListSchema,
  listValidatorCovering,
  seriesBibleSchema,
  validatorFor,
} from "../lib/pipeline/schemas";
import { getMockJson } from "../lib/pipeline/providers/mock";
import type { EpisodeScript, SeriesBible } from "../lib/pipeline/types";

const bible = getMockJson("series_bible", { seriesId: "t" }) as SeriesBible;
const script = getMockJson("episode_script", { bible, episodeNumber: 1 }) as EpisodeScript;

describe("seriesBibleSchema", () => {
  it("mock 픽스처를 통과시킨다", () => {
    expect(seriesBibleSchema.safeParse(bible).success).toBe(true);
  });

  it("factions에 없는 소속을 가진 인물을 거른다", () => {
    const broken = {
      ...bible,
      characters: [{ ...bible.characters[0], faction: "없는 세력" }, ...bible.characters.slice(1)],
    };
    const parsed = seriesBibleSchema.safeParse(broken);
    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.error?.issues)).toContain("factions에 없는 소속");
  });

  it("story_arc가 10개가 아니면 거른다", () => {
    expect(seriesBibleSchema.safeParse({ ...bible, story_arc: [] }).success).toBe(false);
  });

  it("외형 키워드가 3개 미만이면 거른다", () => {
    const broken = {
      ...bible,
      characters: [
        { ...bible.characters[0], appearance_keywords: ["a"] },
        ...bible.characters.slice(1),
      ],
    };
    expect(seriesBibleSchema.safeParse(broken).success).toBe(false);
  });
});

describe("episodeScriptSchema", () => {
  it("mock 픽스처를 통과시킨다", () => {
    expect(episodeScriptSchema.safeParse(script).success).toBe(true);
  });

  it("씬이 8개 미만이면 거른다", () => {
    const broken = { ...script, narration_script: script.narration_script.slice(0, 3) };
    expect(episodeScriptSchema.safeParse(broken).success).toBe(false);
  });

  it("scene_id 중복을 거른다", () => {
    const dup = [...script.narration_script];
    dup[1] = { ...dup[1], scene_id: dup[0].scene_id };
    const parsed = episodeScriptSchema.safeParse({ ...script, narration_script: dup });
    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.error?.issues)).toContain("중복");
  });

  it("전체 분량이 6~8분 범위를 크게 벗어나면 거른다", () => {
    const tooShort = {
      ...script,
      narration_script: script.narration_script.map((s) => ({ ...s, estimated_duration_sec: 2 })),
    };
    const parsed = episodeScriptSchema.safeParse(tooShort);
    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.error?.issues)).toContain("6~8분");
  });

  it("알 수 없는 mood_tag를 거른다", () => {
    const broken = {
      ...script,
      narration_script: script.narration_script.map((s, i) =>
        i === 0 ? { ...s, mood_tag: "코미디" } : s,
      ),
    };
    expect(episodeScriptSchema.safeParse(broken).success).toBe(false);
  });
});

describe("listValidatorCovering", () => {
  const ids = ["s01", "s02"];
  const validate = listValidatorCovering(imagePromptListSchema, ids);
  const item = (id: string) => ({
    scene_id: id,
    image_prompt: "cinematic war illustration, a very long prompt body here",
    negative_prompt: "real flags",
  });

  it("모든 씬을 덮으면 통과한다", () => {
    expect(validate(ids.map(item)).ok).toBe(true);
  });

  it("누락된 씬을 잡아낸다", () => {
    const result = validate([item("s01")]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(JSON.stringify(result.issues)).toContain("s02");
  });

  it("존재하지 않는 씬을 잡아낸다", () => {
    const result = validate([...ids.map(item), item("s99")]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(JSON.stringify(result.issues)).toContain("s99");
  });
});

describe("validatorFor", () => {
  it("zod 오류를 파이프라인 이슈로 변환한다", () => {
    const result = validatorFor(seriesBibleSchema)({ series_id: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toHaveProperty("path");
      expect(result.issues[0]).toHaveProperty("message");
    }
  });
});
