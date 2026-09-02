import { describe, expect, it } from "vitest";
import { join } from "path";
import {
  artifactPath,
  audioDir,
  biblePath,
  DATA_DIR,
  episodeDir,
  episodeId,
  imagesDir,
  safeId,
  seriesDir,
  videoPath,
} from "../lib/pipeline/paths";

describe("safeId", () => {
  it("경로 구분자와 상대경로 요소를 제거한다", () => {
    const id = safeId("../../etc/passwd");
    expect(id).not.toContain("/");
    expect(id).not.toContain("..");
  });

  it("한글 식별자는 결정론적 슬러그로 바꾼다", () => {
    const id = safeId("전쟁 시리즈");
    expect(id).toMatch(/^[a-zA-Z0-9_-]+$/);
    expect(safeId("전쟁 시리즈")).toBe(id);
    expect(safeId("다른 시리즈")).not.toBe(id);
  });

  it("영문·한글이 섞이면 영문 부분을 살린다", () => {
    expect(safeId("war-시리즈")).toBe("war");
  });

  it("정상 식별자는 그대로 둔다", () => {
    expect(safeId("my-series_01")).toBe("my-series_01");
  });

  it("남는 문자가 없으면 던진다", () => {
    expect(() => safeId("///")).toThrow();
    expect(() => safeId("")).toThrow();
  });

  it("80자로 자른다", () => {
    expect(safeId("a".repeat(200)).length).toBe(80);
  });
});

describe("경로 규칙", () => {
  it("episodeId는 0패딩된 화 번호를 쓴다", () => {
    expect(episodeId("s", 1)).toBe("s_ep001");
    expect(episodeId("s", 42)).toBe("s_ep042");
  });

  it("모든 데이터 경로는 DATA_DIR 안에 있다", () => {
    const root = join(DATA_DIR, "series");
    for (const p of [
      seriesDir("a/../b"),
      biblePath("a/../b"),
      episodeDir("a/../b", 1),
      artifactPath("a/../b", 1, "script"),
    ]) {
      expect(p.startsWith(root)).toBe(true);
    }
  });

  it("산출물 경로는 화 디렉터리 아래 JSON이다", () => {
    expect(artifactPath("s", 2, "script")).toBe(join(episodeDir("s", 2), "script.json"));
  });

  it("미디어 경로는 episodeId로 분리된다", () => {
    expect(imagesDir("s_ep001")).toContain("s_ep001");
    expect(audioDir("s_ep001")).toContain("s_ep001");
    expect(videoPath("s_ep001").endsWith("s_ep001.mp4")).toBe(true);
  });
});
