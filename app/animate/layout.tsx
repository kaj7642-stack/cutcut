"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export default function AnimateLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isSettings = pathname === "/animate/settings";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--fg)" }}>
      <header
        className="sticky top-0 z-50 backdrop-blur-xl"
        style={{ background: "var(--bg-glass)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/animate" className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--accent)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              AI 애니메이터
            </Link>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/animate"
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: !isSettings ? "var(--accent)" : "transparent",
                color: !isSettings ? "#fff" : "var(--fg-muted)",
              }}
            >
              프로젝트
            </Link>
            <Link
              href="/animate/settings"
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: isSettings ? "var(--accent)" : "transparent",
                color: isSettings ? "#fff" : "var(--fg-muted)",
              }}
            >
              API 설정
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
