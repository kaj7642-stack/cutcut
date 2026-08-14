"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Clip } from "@/lib/types";

interface SttSegment {
  start: number;
  end: number;
  text: string;
}

interface ClipPreviewModalProps {
  clip: Clip;
  projectId: string;
  totalClips: number;
  sttSegments?: SttSegment[];
  narrationText?: string;
  onClose: () => void;
  onToggleSelect: (id: string) => void;
  onUpdateMemo: (id: string, memo: string) => void;
  onNavigate: (direction: "prev" | "next") => void;
}

export function ClipPreviewModal({
  clip,
  projectId,
  totalClips,
  sttSegments,
  narrationText,
  onClose,
  onToggleSelect,
  onUpdateMemo,
  onNavigate,
}: ClipPreviewModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onNavigate("prev");
      else if (e.key === "ArrowRight") onNavigate("next");
      else if (e.key === " ") {
        e.preventDefault();
        togglePlayPause();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onNavigate, togglePlayPause]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, [clip.id]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const maxIntensity = Math.max(...clip.spikes.map((s) => s.intensity));
  const currentStt = sttSegments?.find(
    (seg) => currentTime >= seg.start && currentTime < seg.end
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-4xl mx-4 rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", maxHeight: "90vh" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <span className="font-semibold">클립 {clip.index}</span>
            <span className="text-sm" style={{ color: "var(--fg-muted)" }}>
              {clip.start}s ~ {clip.end}s ({clip.duration}초)
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: maxIntensity >= 7 ? "rgba(255,59,48,0.15)" : "var(--accent-glow)",
                color: maxIntensity >= 7 ? "#ff3b30" : "var(--accent)",
              }}
            >
              강도 {maxIntensity}/10
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
              {clip.index} / {totalClips}
            </span>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:opacity-80"
              style={{ color: "var(--fg-muted)" }}
              onClick={onClose}
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Video */}
        <div className="relative" style={{ background: "#000" }}>
          <video
            ref={videoRef}
            src={`/api/clips/${projectId}/${clip.file}`}
            className="w-full"
            style={{ maxHeight: "50vh", objectFit: "contain" }}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            onClick={togglePlayPause}
            playsInline
          />
          {!isPlaying && (
            <button
              className="absolute inset-0 flex items-center justify-center"
              onClick={togglePlayPause}
              aria-label="재생"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
              >
                <span className="text-2xl text-white ml-1">▶</span>
              </div>
            </button>
          )}
          {currentStt && (
            <div className="absolute bottom-4 left-0 right-0 text-center px-4">
              <span
                className="inline-block px-4 py-2 rounded-lg text-sm text-white"
                style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
              >
                {currentStt.text}
              </span>
            </div>
          )}
          {clip.index > 1 && (
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white"
              style={{ background: "rgba(0,0,0,0.5)" }}
              onClick={() => onNavigate("prev")}
              aria-label="이전 클립"
            >
              ◀
            </button>
          )}
          {clip.index < totalClips && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white"
              style={{ background: "rgba(0,0,0,0.5)" }}
              onClick={() => onNavigate("next")}
              aria-label="다음 클립"
            >
              ▶
            </button>
          )}
        </div>

        {/* Seek bar */}
        <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
              onClick={togglePlayPause}
              aria-label={isPlaying ? "일시정지" : "재생"}
            >
              {isPlaying ? "⏸" : "▶"}
            </button>
            <span className="text-xs font-mono w-12 shrink-0" style={{ color: "var(--fg-muted)" }}>
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(90deg, var(--accent) ${(currentTime / (duration || 1)) * 100}%, var(--border) ${(currentTime / (duration || 1)) * 100}%)`,
              }}
            />
            <span className="text-xs font-mono w-12 shrink-0 text-right" style={{ color: "var(--fg-muted)" }}>
              {formatTime(duration)}
            </span>
          </div>
          {clip.spikes.length > 0 && duration > 0 && (
            <div className="relative h-3 mt-1" style={{ marginLeft: "52px", marginRight: "52px" }}>
              {clip.spikes.map((spike, i) => {
                const relativeTime = spike.timestamp - clip.start;
                const pos = (relativeTime / duration) * 100;
                if (pos < 0 || pos > 100) return null;
                return (
                  <div
                    key={i}
                    className="absolute top-0 w-1.5 h-3 rounded-full"
                    style={{
                      left: `${pos}%`,
                      background: spike.intensity >= 7 ? "#ff3b30" : "var(--accent)",
                      opacity: 0.7,
                    }}
                    title={`${spike.timestamp}s (강도 ${spike.intensity})`}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom: memo + info */}
        <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: "30vh" }}>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium mb-2">상황 메모</div>
              <input
                type="text"
                placeholder="무슨 상황이었나요? (예: 1v3 역전 킬)"
                value={clip.memo}
                onChange={(e) => onUpdateMemo(clip.id, e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  color: "var(--fg)",
                }}
              />
              {narrationText && (
                <div className="mt-3">
                  <div className="text-sm font-medium mb-1" style={{ color: "var(--accent)" }}>
                    나레이션 초안
                  </div>
                  <div
                    className="text-sm p-2 rounded-lg"
                    style={{ background: "var(--bg)", color: "var(--fg-muted)" }}
                  >
                    {narrationText}
                  </div>
                </div>
              )}
            </div>
            <div>
              {sttSegments && sttSegments.length > 0 && (
                <>
                  <div className="text-sm font-medium mb-2">원본 음성 자막</div>
                  <div
                    className="space-y-1 p-2 rounded-lg text-sm overflow-y-auto"
                    style={{ background: "var(--bg)", maxHeight: "120px" }}
                  >
                    {sttSegments.map((seg, i) => (
                      <div
                        key={i}
                        className="flex gap-2 text-xs cursor-pointer rounded px-1 py-0.5 transition-colors"
                        style={{
                          background: currentStt === seg ? "var(--accent-glow)" : "transparent",
                        }}
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.currentTime = seg.start;
                            setCurrentTime(seg.start);
                          }
                        }}
                      >
                        <span className="shrink-0 font-mono" style={{ color: "var(--fg-muted)" }}>
                          {seg.start.toFixed(1)}s
                        </span>
                        <span>{seg.text}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div className={sttSegments && sttSegments.length > 0 ? "mt-3" : ""}>
                <div className="text-sm font-medium mb-2">볼륨 스파이크</div>
                <div className="flex gap-1 flex-wrap">
                  {clip.spikes.map((spike, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-1 rounded-full cursor-pointer"
                      style={{
                        background: spike.intensity >= 7 ? "rgba(255,59,48,0.15)" : "var(--accent-glow)",
                        color: spike.intensity >= 7 ? "#ff3b30" : "var(--accent)",
                      }}
                      onClick={() => {
                        if (videoRef.current) {
                          const relativeTime = spike.timestamp - clip.start;
                          videoRef.current.currentTime = Math.max(0, relativeTime);
                          setCurrentTime(Math.max(0, relativeTime));
                        }
                      }}
                    >
                      {spike.timestamp}s (강도 {spike.intensity})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div
            className="flex items-center justify-between mt-4 pt-3"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <button
              className={`px-4 py-2 rounded-lg text-sm ${clip.selected ? "text-white" : ""}`}
              style={{
                background: clip.selected ? "var(--accent)" : "var(--bg)",
                border: "1px solid var(--border)",
              }}
              onClick={() => onToggleSelect(clip.id)}
            >
              {clip.selected ? "선택됨" : "선택 안됨"}
            </button>
            <div className="flex items-center gap-3 text-xs" style={{ color: "var(--fg-muted)" }}>
              <span>← → 클립 이동</span>
              <span>Space 재생</span>
              <span>Esc 닫기</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
