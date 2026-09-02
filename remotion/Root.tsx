import React from "react";
import { Composition } from "remotion";
import { Episode } from "./Episode";
import { buildTimeline, DEFAULT_EPISODE_PROPS, FPS, type EpisodeProps } from "./schema";

// Composition은 props를 Record<string, unknown>으로 다룬다.
// 파이프라인이 inputProps로 넘기는 값의 형태는 EpisodeProps로 고정되어 있으므로
// 경계에서만 좁혀 쓴다.
const EpisodeComponent = Episode as unknown as React.FC<Record<string, unknown>>;

function totalFrames(props: Record<string, unknown>): number {
  return Math.max(1, buildTimeline(props as unknown as EpisodeProps, FPS).totalFrames);
}

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Episode"
    component={EpisodeComponent}
    durationInFrames={totalFrames(DEFAULT_EPISODE_PROPS as unknown as Record<string, unknown>)}
    fps={FPS}
    width={1920}
    height={1080}
    defaultProps={DEFAULT_EPISODE_PROPS as unknown as Record<string, unknown>}
    // 씬별 실측 오디오 길이에 맞춰 전체 길이를 inputProps에서 다시 계산한다.
    calculateMetadata={({ props }) => ({ durationInFrames: totalFrames(props) })}
  />
);
