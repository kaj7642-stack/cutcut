import React from "react";
import { useCurrentFrame } from "remotion";
import { fadeOpacity } from "./fade";

/** 하단 자막. 씬 시작에 페이드 인, 끝에 페이드 아웃. */
export const Subtitle: React.FC<{ text: string; durationInFrames: number }> = ({
  text,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const opacity = fadeOpacity({ frame, durationInFrames, fadeIn: 12, fadeOut: 12 });

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: "7%",
        display: "flex",
        justifyContent: "center",
        padding: "0 8%",
        opacity,
      }}
    >
      <span
        style={{
          fontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
          fontSize: 46,
          lineHeight: 1.45,
          fontWeight: 600,
          color: "#f5f2ec",
          textAlign: "center",
          textShadow: "0 2px 12px rgba(0,0,0,0.9), 0 0 3px rgba(0,0,0,0.9)",
          background: "rgba(8,10,14,0.45)",
          padding: "14px 28px",
          borderRadius: 10,
        }}
      >
        {text}
      </span>
    </div>
  );
};
