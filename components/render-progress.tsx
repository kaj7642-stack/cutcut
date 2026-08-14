"use client";

import type { ProjectStatus } from "@/lib/types";

interface RenderProgressProps {
  status: ProjectStatus;
  progress: number;
  renderPhase: string;
  estimatedTime?: string;
  onCancel?: () => void;
}

const STEPS: { key: ProjectStatus | string; label: string; icon: string }[] = [
  { key: "uploading", label: "영상 업로드", icon: "📤" },
  { key: "detecting_spikes", label: "편집점 감지", icon: "🔍" },
  { key: "generating_scripts", label: "나레이션 생성", icon: "✍️" },
  { key: "generating_tts", label: "음성 합성", icon: "🎙️" },
  { key: "rendering", label: "영상 렌더링", icon: "🎬" },
];

const STATUS_ORDER: Record<string, number> = {
  uploading: 0,
  downloading: 0,
  detecting_spikes: 1,
  cutting_clips: 1,
  generating_scripts: 2,
  generating_tts: 3,
  rendering: 4,
};

export function RenderProgress({ status, progress, renderPhase, estimatedTime, onCancel }: RenderProgressProps) {
  const currentIdx = STATUS_ORDER[status] ?? -1;

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-6">
        <div className="text-3xl animate-pulse">
          {status === "downloading" ? "⬇️" : STEPS[currentIdx]?.icon ?? "⚡"}
        </div>
        <div>
          <div className="font-semibold">
            {status === "uploading" && `업로드 중... ${progress}%`}
            {status === "downloading" && "유튜브 영상 다운로드 중..."}
            {status === "detecting_spikes" && "AI가 편집점을 찾고 있습니다..."}
            {status === "cutting_clips" && "클립을 추출하고 있습니다..."}
            {status === "generating_scripts" && "나레이션을 작성하고 있습니다..."}
            {status === "generating_tts" && "음성을 합성하고 있습니다..."}
            {status === "rendering" && (renderPhase || "영상을 렌더링하고 있습니다...")}
          </div>
          {estimatedTime && (
            <div className="text-xs mt-1" style={{ color: "var(--fg-muted)" }}>
              예상 소요 시간: {estimatedTime}
            </div>
          )}
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-1 mb-4">
        {STEPS.map((step, i) => {
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full h-1.5 rounded-full transition-all"
                style={{
                  background: isDone
                    ? "var(--accent)"
                    : isCurrent
                      ? `linear-gradient(90deg, var(--accent) ${progress}%, var(--border) ${progress}%)`
                      : "var(--border)",
                }}
              />
              <span
                className="text-xs"
                style={{
                  color: isDone || isCurrent ? "var(--accent)" : "var(--fg-muted)",
                  fontWeight: isCurrent ? 600 : 400,
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Overall progress bar */}
      <div className="max-w-md mx-auto">
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {onCancel && status === "rendering" && (
        <div className="text-center mt-4">
          <button className="btn-ghost text-sm" onClick={onCancel}>
            취소
          </button>
        </div>
      )}
    </div>
  );
}
