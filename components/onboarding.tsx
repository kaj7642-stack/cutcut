"use client";

import { useState, useEffect } from "react";

const STEPS = [
  {
    title: "영상 업로드",
    desc: "게임 영상 파일을 드래그하거나 유튜브 URL을 붙여넣으세요.",
    icon: "1",
  },
  {
    title: "클립 선택",
    desc: "AI가 찾은 하이라이트 구간을 확인하고 원하는 클립을 선택하세요.",
    icon: "2",
  },
  {
    title: "나레이션 & 자막",
    desc: "AI가 나레이션을 생성하고 TTS 음성과 자막을 입힙니다.",
    icon: "3",
  },
  {
    title: "렌더링 & 다운로드",
    desc: "완성된 영상을 다운로드하거나 바로 공유하세요.",
    icon: "4",
  },
];

const STORAGE_KEY = "clipai_onboarding_done";

export function OnboardingOverlay() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  const current = STEPS[step];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={dismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)",
          borderRadius: "16px",
          padding: "32px",
          maxWidth: "420px",
          width: "100%",
          border: "1px solid var(--border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center text-xl font-bold"
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "var(--accent)",
              color: "#fff",
              marginBottom: "12px",
            }}
          >
            {current.icon}
          </div>
          <h3 className="text-lg font-bold mb-2">{current.title}</h3>
          <p className="text-sm" style={{ color: "var(--fg-muted)" }}>{current.desc}</p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? "24px" : "8px",
                height: "8px",
                borderRadius: "4px",
                background: i === step ? "var(--accent)" : "var(--border)",
                transition: "all 0.2s",
              }}
            />
          ))}
        </div>

        <div className="flex gap-2">
          {step < STEPS.length - 1 ? (
            <>
              <button
                className="flex-1 text-sm py-2.5 rounded-xl"
                style={{ border: "1px solid var(--border)", color: "var(--fg-muted)" }}
                onClick={dismiss}
              >
                건너뛰기
              </button>
              <button
                className="flex-1 text-sm py-2.5 rounded-xl font-medium"
                style={{ background: "var(--accent)", color: "#fff" }}
                onClick={() => setStep(step + 1)}
              >
                다음
              </button>
            </>
          ) : (
            <button
              className="w-full text-sm py-2.5 rounded-xl font-medium"
              style={{ background: "var(--accent)", color: "#fff" }}
              onClick={dismiss}
            >
              시작하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
