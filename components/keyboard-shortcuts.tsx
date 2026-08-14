"use client";

import { useState, useEffect } from "react";

const SHORTCUTS = [
  { keys: "Esc", desc: "렌더링 취소 / 프로젝트 초기화" },
  { keys: "Enter", desc: "유튜브 URL 분석 시작" },
  { keys: "Space", desc: "영상 재생/일시정지" },
];

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        const active = document.activeElement;
        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT")) return;
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={() => setOpen(false)}
    >
      <div
        className="card max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">키보드 단축키</h3>
          <button
            onClick={() => setOpen(false)}
            className="text-lg w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ color: "var(--fg-muted)", border: "1px solid var(--border)" }}
          >
            &times;
          </button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between py-1.5 text-sm">
              <kbd
                className="px-2 py-0.5 rounded text-xs font-mono"
                style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
              >
                {s.keys}
              </kbd>
              <span style={{ color: "var(--fg-muted)" }}>{s.desc}</span>
            </div>
          ))}
          <div className="pt-2 text-xs text-center" style={{ color: "var(--fg-muted)", borderTop: "1px solid var(--border)" }}>
            <kbd className="px-1.5 py-0.5 rounded font-mono" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>?</kbd> 를 눌러 이 창을 열고 닫을 수 있습니다
          </div>
        </div>
      </div>
    </div>
  );
}
