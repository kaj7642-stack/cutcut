import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { fadeOpacity } from "./fade";

const BASE: React.CSSProperties = {
  backgroundColor: "#0b0e13",
  color: "#f2ede4",
  fontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
  justifyContent: "center",
  alignItems: "center",
  textAlign: "center",
  padding: "0 10%",
};

/** 오프닝 타이틀 카드. */
export const TitleCard: React.FC<{
  seriesTitle: string;
  episodeNumber: number;
  episodeTitle: string;
}> = ({ seriesTitle, episodeNumber, episodeTitle }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const opacity = fadeOpacity({ frame, durationInFrames, fadeIn: 15, fadeOut: 15 });
  const letterSpacing = interpolate(frame, [0, durationInFrames], [18, 6], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ ...BASE, opacity }}>
      <div style={{ fontSize: 30, letterSpacing: 8, color: "#8fa3b8", marginBottom: 26 }}>
        {seriesTitle}
      </div>
      <div style={{ fontSize: 84, fontWeight: 800, letterSpacing }}>{episodeTitle}</div>
      <div style={{ fontSize: 26, letterSpacing: 6, color: "#8fa3b8", marginTop: 30 }}>
        EPISODE {String(episodeNumber).padStart(2, "0")}
      </div>
    </AbsoluteFill>
  );
};

/** 엔딩 다음화 예고 카드. */
export const CliffhangerCard: React.FC<{ summary: string }> = ({ summary }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const opacity = fadeOpacity({ frame, durationInFrames, fadeIn: 20, fadeOut: 20 });

  return (
    <AbsoluteFill style={{ ...BASE, opacity, flexDirection: "column" }}>
      <div style={{ fontSize: 28, letterSpacing: 10, color: "#c2543f", marginBottom: 34 }}>
        NEXT EPISODE
      </div>
      <div style={{ fontSize: 54, fontWeight: 700, lineHeight: 1.5, maxWidth: "80%" }}>
        {summary}
      </div>
    </AbsoluteFill>
  );
};
