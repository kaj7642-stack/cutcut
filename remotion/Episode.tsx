import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { SceneClip } from "./components/SceneClip";
import { CliffhangerCard, TitleCard } from "./components/Cards";
import { buildTimeline, type EpisodeProps } from "./schema";

export const Episode: React.FC<EpisodeProps> = (props) => {
  const { fps } = useVideoConfig();
  const timeline = buildTimeline(props, fps);

  return (
    <AbsoluteFill style={{ backgroundColor: "#05070a" }}>
      <Sequence durationInFrames={timeline.titleFrames} name="title">
        <TitleCard
          seriesTitle={props.series_title}
          episodeNumber={props.episode_number}
          episodeTitle={props.episode_title}
        />
      </Sequence>

      {timeline.scenes.map(({ scene, from, durationInFrames, index }) => (
        <Sequence
          key={scene.scene_id}
          from={from}
          durationInFrames={durationInFrames}
          name={`scene-${scene.scene_id}`}
        >
          <SceneClip
            scene={scene}
            index={index}
            overlap={timeline.overlap}
            isFirst={index === 0}
            isLast={index === timeline.scenes.length - 1}
            bgmVolume={props.bgm_volume}
          />
        </Sequence>
      ))}

      <Sequence
        from={timeline.outroFrom}
        durationInFrames={timeline.outroFrames}
        name="cliffhanger"
      >
        <CliffhangerCard summary={props.cliffhanger_summary} />
      </Sequence>
    </AbsoluteFill>
  );
};
