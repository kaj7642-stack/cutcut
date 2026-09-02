import { describe, expect, it } from "vitest";
import { buildVideoMetadata, uploadToYouTube, youtubeConfigured } from "../lib/pipeline/upload";
import { getMockJson } from "../lib/pipeline/providers/mock";
import type { EpisodeScript, SeriesBible } from "../lib/pipeline/types";

const bible = getMockJson("series_bible", { seriesId: "t" }) as SeriesBible;
const script = getMockJson("episode_script", { bible, episodeNumber: 3 }) as EpisodeScript;

describe("buildVideoMetadata", () => {
  it("제목에 시리즈명과 화수를 넣고 100자를 넘기지 않는다", () => {
    const meta = buildVideoMetadata({ bible, script });
    expect(meta.title).toContain(bible.series_title);
    expect(meta.title).toContain("3화");
    expect(meta.title.length).toBeLessThanOrEqual(100);
  });

  it("아주 긴 제목도 100자로 자른다", () => {
    const meta = buildVideoMetadata({
      bible: { ...bible, series_title: "가".repeat(200) },
      script,
    });
    expect(meta.title.length).toBe(100);
  });

  it("설명에 다음 화 예고와 가상 창작물 고지를 넣는다", () => {
    const meta = buildVideoMetadata({ bible, script });
    expect(meta.description).toContain(script.cliffhanger_summary);
    expect(meta.description).toContain("가상");
    expect(meta.description.length).toBeLessThanOrEqual(5000);
  });

  it("세력명을 태그에 넣고 중복 없이 25개 이하로 유지한다", () => {
    const meta = buildVideoMetadata({
      bible,
      script,
      extraTags: [...Array(40)].map((_, i) => `tag${i}`),
    });
    expect(meta.tags).toContain(bible.factions[0].name);
    expect(meta.tags.length).toBeLessThanOrEqual(25);
    expect(new Set(meta.tags).size).toBe(meta.tags.length);
  });

  it("기본 공개 상태는 private다", () => {
    expect(buildVideoMetadata({ bible, script }).privacyStatus).toBe("private");
  });

  it("privacyStatus를 명시하면 그 값을 쓴다", () => {
    expect(buildVideoMetadata({ bible, script, privacyStatus: "unlisted" }).privacyStatus).toBe(
      "unlisted",
    );
  });
});

describe("uploadToYouTube dry-run", () => {
  it("외부 호출 없이 결과 형태를 지킨다", async () => {
    const result = await uploadToYouTube({
      videoPath: "/tmp/does-not-exist.mp4",
      metadata: buildVideoMetadata({ bible, script }),
      dryRun: true,
    });
    expect(result.video_id).toBeTruthy();
    expect(result.url).toContain(result.video_id);
    expect(result.privacy_status).toBe("private");
    expect(result.upload_status).toBe("complete");
    expect(new Date(result.timestamp).toString()).not.toBe("Invalid Date");
  });
});

describe("youtubeConfigured", () => {
  it("자격 증명이 없으면 false", () => {
    const saved = {
      id: process.env.YOUTUBE_CLIENT_ID,
      secret: process.env.YOUTUBE_CLIENT_SECRET,
      token: process.env.YOUTUBE_REFRESH_TOKEN,
    };
    delete process.env.YOUTUBE_CLIENT_ID;
    delete process.env.YOUTUBE_CLIENT_SECRET;
    delete process.env.YOUTUBE_REFRESH_TOKEN;
    try {
      expect(youtubeConfigured()).toBe(false);
    } finally {
      if (saved.id) process.env.YOUTUBE_CLIENT_ID = saved.id;
      if (saved.secret) process.env.YOUTUBE_CLIENT_SECRET = saved.secret;
      if (saved.token) process.env.YOUTUBE_REFRESH_TOKEN = saved.token;
    }
  });
});
