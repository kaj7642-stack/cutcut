import { describe, expect, it } from "vitest";
import { enforcePromptInvariants } from "../lib/pipeline/images";
import { getMockJson } from "../lib/pipeline/providers/mock";
import { placeholderImage, encodePng } from "../lib/pipeline/providers/png";
import type { SeriesBible } from "../lib/pipeline/types";

const bible = getMockJson("series_bible", { seriesId: "t" }) as SeriesBible;

describe("enforcePromptInvariants", () => {
  it("스타일 접두어가 없으면 앞에 붙인다", () => {
    const [out] = enforcePromptInvariants(
      [{ scene_id: "s01", image_prompt: "a foggy dock", negative_prompt: "blurry" }],
      bible,
    );
    expect(out.image_prompt.startsWith(bible.art_style)).toBe(true);
    expect(out.image_prompt).toContain("a foggy dock");
  });

  it("이미 접두어가 있으면 중복해서 붙이지 않는다", () => {
    const prompt = `${bible.art_style}, a foggy dock`;
    const [out] = enforcePromptInvariants(
      [{ scene_id: "s01", image_prompt: prompt, negative_prompt: "blurry" }],
      bible,
    );
    expect(out.image_prompt).toBe(prompt);
  });

  it("실존 요소 배제 키워드를 negative_prompt에 보강한다", () => {
    const [out] = enforcePromptInvariants(
      [{ scene_id: "s01", image_prompt: "x", negative_prompt: "blurry" }],
      bible,
    );
    const neg = out.negative_prompt.toLowerCase();
    expect(neg).toContain("flags");
    expect(neg).toContain("insignia");
    expect(neg).toContain("logos");
    expect(neg).toContain("people");
  });

  it("멱등하다 — 두 번 적용해도 결과가 같다", () => {
    const input = [{ scene_id: "s01", image_prompt: "a dock", negative_prompt: "blurry" }];
    const once = enforcePromptInvariants(input, bible);
    const twice = enforcePromptInvariants(once, bible);
    expect(twice).toEqual(once);
  });
});

describe("placeholderImage", () => {
  it("유효한 PNG 시그니처로 시작한다", () => {
    const png = placeholderImage("seed");
    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  });

  it("IHDR에 요청한 크기를 기록한다", () => {
    const png = placeholderImage("seed", 320, 180);
    expect(png.readUInt32BE(16)).toBe(320);
    expect(png.readUInt32BE(20)).toBe(180);
  });

  it("같은 시드는 같은 이미지를, 다른 시드는 다른 이미지를 만든다", () => {
    expect(placeholderImage("a", 64, 36)).toEqual(placeholderImage("a", 64, 36));
    expect(placeholderImage("a", 64, 36)).not.toEqual(placeholderImage("b", 64, 36));
  });

  it("IEND 청크로 끝난다", () => {
    const png = encodePng(2, 2, Buffer.alloc(2 * 2 * 3));
    expect(png.subarray(png.length - 8, png.length - 4).toString("ascii")).toBe("IEND");
  });
});
