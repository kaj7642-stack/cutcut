import { describe, expect, it } from "vitest";
import { fadeOpacity } from "../remotion/components/fade";

describe("fadeOpacity", () => {
  it("페이드 인 구간에서 0 → 1로 오른다", () => {
    const opts = { durationInFrames: 100, fadeIn: 10, fadeOut: 10 };
    expect(fadeOpacity({ ...opts, frame: 0 })).toBe(0);
    expect(fadeOpacity({ ...opts, frame: 5 })).toBeCloseTo(0.5);
    expect(fadeOpacity({ ...opts, frame: 10 })).toBe(1);
  });

  it("페이드 아웃 구간에서 1 → 0으로 내린다", () => {
    const opts = { durationInFrames: 100, fadeIn: 10, fadeOut: 10 };
    expect(fadeOpacity({ ...opts, frame: 90 })).toBe(1);
    expect(fadeOpacity({ ...opts, frame: 95 })).toBeCloseTo(0.5);
    expect(fadeOpacity({ ...opts, frame: 100 })).toBe(0);
  });

  it("fadeIn이 0이면 처음부터 완전히 보인다", () => {
    expect(fadeOpacity({ frame: 0, durationInFrames: 100, fadeIn: 0, fadeOut: 10 })).toBe(1);
  });

  it("fadeOut이 0이면 끝까지 보인다", () => {
    expect(fadeOpacity({ frame: 100, durationInFrames: 100, fadeIn: 10, fadeOut: 0 })).toBe(1);
  });

  it("페이드가 컴포지션보다 길어도 0~1 범위를 지킨다", () => {
    // 초안 렌더(18프레임 타이틀 카드에 15프레임 페이드)에서 터지던 조건.
    for (let frame = 0; frame <= 18; frame++) {
      const v = fadeOpacity({ frame, durationInFrames: 18, fadeIn: 15, fadeOut: 15 });
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it("1프레임짜리 컴포지션에서도 유한한 값을 준다", () => {
    const v = fadeOpacity({ frame: 0, durationInFrames: 1, fadeIn: 30, fadeOut: 30 });
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeGreaterThanOrEqual(0);
  });

  it("범위 밖 프레임도 클램프한다", () => {
    expect(fadeOpacity({ frame: -5, durationInFrames: 100, fadeIn: 10, fadeOut: 10 })).toBe(0);
    expect(fadeOpacity({ frame: 500, durationInFrames: 100, fadeIn: 10, fadeOut: 10 })).toBe(0);
  });
});
