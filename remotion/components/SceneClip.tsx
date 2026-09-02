import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  random,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Subtitle } from "./Subtitle";
import { fadeOpacity } from "./fade";
import type { RemotionScene } from "../schema";

/** 씬 인덱스에 따라 Ken Burns 방향을 번갈아 준다. */
function kenBurns(frame: number, durationInFrames: number, index: number) {
  const zoomIn = index % 2 === 0;
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = zoomIn ? 1.06 + progress * 0.12 : 1.18 - progress * 0.12;
  const driftX = interpolate(progress, [0, 1], index % 4 < 2 ? [-2.5, 2.5] : [2.5, -2.5]);
  const driftY = interpolate(progress, [0, 1], index % 3 === 0 ? [1.5, -1.5] : [-1.5, 1.5]);

  return { scale, driftX, driftY };
}

/** mood_tag가 "전투"인 씬의 화면 흔들림. */
function combatShake(frame: number, sceneId: string) {
  const t = Math.floor(frame / 2);
  const x = (random(`${sceneId}-x-${t}`) - 0.5) * 16;
  const y = (random(`${sceneId}-y-${t}`) - 0.5) * 16;
  const rotate = (random(`${sceneId}-r-${t}`) - 0.5) * 0.5;
  return { x, y, rotate };
}

export const SceneClip: React.FC<{
  scene: RemotionScene;
  index: number;
  /** 크로스페이드 길이(프레임) */
  overlap: number;
  isFirst: boolean;
  isLast: boolean;
  bgmVolume: number;
}> = ({ scene, index, overlap, isFirst, isLast, bgmVolume }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const isCombat = scene.mood_tag === "전투";
  const { scale, driftX, driftY } = kenBurns(frame, durationInFrames, index);
  const shake = isCombat ? combatShake(frame, scene.scene_id) : { x: 0, y: 0, rotate: 0 };

  // 크로스페이드: 앞 씬과 겹치는 구간에서 이 씬이 서서히 나타나고,
  // 마지막 씬은 뒤쪽 예고 카드로 넘어가며 사라진다.
  const fadeIn = isFirst ? 0 : overlap;
  const fadeOut = isLast ? overlap : 0;
  const opacity = fadeOpacity({ frame, durationInFrames, fadeIn, fadeOut });

  // 전투 씬은 컷이 빨라 보이도록 짧은 주기의 밝기 펄스를 준다.
  const pulse = isCombat
    ? 1 + 0.06 * Math.sin((frame / Math.max(1, Math.round(durationInFrames / 12))) * Math.PI * 2)
    : 1;

  return (
    <AbsoluteFill style={{ opacity, backgroundColor: "#05070a" }}>
      <AbsoluteFill
        style={{
          transform:
            `translate(${driftX + shake.x}px, ${driftY + shake.y}px) ` +
            `scale(${scale}) rotate(${shake.rotate}deg)`,
          filter: `brightness(${pulse})`,
        }}
      >
        <Img
          src={staticFile(scene.image_src)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>

      {/* 자막 가독성을 위한 하단 그라디언트 */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 35%, " +
            "rgba(0,0,0,0) 55%, rgba(0,0,0,0.75) 100%)",
        }}
      />

      <Audio src={staticFile(scene.audio_src)} />
      {scene.bgm_src ? (
        <Audio src={staticFile(scene.bgm_src)} volume={bgmVolume} loop />
      ) : null}

      <Subtitle text={scene.narration_text} durationInFrames={durationInFrames} />
    </AbsoluteFill>
  );
};
