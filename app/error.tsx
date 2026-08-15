"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-3xl font-bold mb-2">문제가 발생했습니다</h1>
          <p className="mb-6" style={{ color: "var(--fg-muted)" }}>
            일시적인 오류가 발생했습니다. 다시 시도해주세요.
          </p>
          <div className="flex gap-4 justify-center">
            <button className="btn-primary" onClick={reset}>
              다시 시도
            </button>
            <a href="/" className="btn-ghost">
              홈으로
            </a>
          </div>
          {error.digest && (
            <p className="mt-6 text-xs font-mono" style={{ color: "var(--fg-muted)" }}>
              오류 코드: {error.digest}
            </p>
          )}
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-bottom-nav">
        <a href="/">
          <span className="text-base">🏠</span>
          <span>홈</span>
        </a>
        <a href="/studio">
          <span className="text-base">🎬</span>
          <span>스튜디오</span>
        </a>
        <a href="/gallery">
          <span className="text-base">🖼️</span>
          <span>갤러리</span>
        </a>
        <a href="/pricing">
          <span className="text-base">💰</span>
          <span>요금제</span>
        </a>
      </nav>
    </main>
  );
}
