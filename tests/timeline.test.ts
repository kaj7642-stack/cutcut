import { describe, expect, it } from "vitest";
import { buildTimeline, type EpisodeProps, type RemotionScene } from "../remotion/schema";

function scene(id: string, seconds: number, mood: RemotionScene["mood_tag"] = "전환"): RemotionScene {
  return {
    scene_id: id,
    image_src: `images/${id}.png`,
    audio_src: `audio/${id}.mp3`,
    narration_text: id,
    duration_actual_sec: seconds,
    mood_tag: mood,
  };
}

const base: EpisodeProps = {
  series_title: "S",
  episode_title: "E",
  episode_number: 1,
  cliffhanger_summary: "C",
  scenes: [scene("a", 5), scene("b", 5, "전투"), scene("c", 4)],
  title_seconds: 2,
  outro_seconds: 3,
  crossfade_seconds: 0.5,
  bgm_volume: 0.14,
};

describe("buildTimeline", () => {
  it("타이틀 카드 뒤에서 첫 씬이 시작한다", () => {
    const t = buildTimeline(base, 30);
    expect(t.titleFrames).toBe(60);
    expect(t.scenes[0].from).toBe(60);
  });

  it("두 번째 씬부터 크로스페이드만큼 앞 씬과 겹친다", () => {
    const t = buildTimeline(base, 30);
    expect(t.overlap).toBe(15);
    expect(t.scenes[1].from).toBe(60 + 150 - 15);
    expect(t.scenes[2].from).toBe(t.scenes[1].from + 150 - 15);
  });

  it("아웃트로는 마지막 씬 직후에 온다", () => {
    const t = buildTimeline(base, 30);
    const last = t.scenes[t.scenes.length - 1];
    expect(t.outroFrom).toBe(last.from + last.durationInFrames);
    expect(t.totalFrames).toBe(t.outroFrom + 90);
  });

  it("crossfade가 0이면 씬이 이어붙는다", () => {
    const t = buildTimeline({ ...base, crossfade_seconds: 0 }, 30);
    expect(t.scenes[1].from).toBe(t.scenes[0].from + t.scenes[0].durationInFrames);
  });

  it("씬이 없어도 최소 길이를 보장한다", () => {
    const t = buildTimeline({ ...base, scenes: [] }, 30);
    expect(t.scenes).toHaveLength(0);
    expect(t.totalFrames).toBeGreaterThan(0);
  });

  it("아주 짧은 씬도 2프레임 이상을 갖는다", () => {
    const t = buildTimeline({ ...base, scenes: [scene("x", 0.01)] }, 30);
    expect(t.scenes[0].durationInFrames).toBeGreaterThanOrEqual(2);
  });

  it("fps가 바뀌면 프레임 수도 비례해 바뀐다", () => {
    expect(buildTimeline(base, 60).totalFrames).toBeGreaterThan(
      buildTimeline(base, 30).totalFrames,
    );
  });
});
