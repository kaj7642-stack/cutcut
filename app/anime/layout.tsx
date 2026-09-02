import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "CutCut Anime Generator",
  description: "AI 애니메이션 자동 생성 툴",
};

export default function AnimeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      {/* Top nav */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg-glass)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
          <Link href="/anime" className="flex items-center gap-2 font-bold text-lg">
            <span className="text-2xl">🎬</span>
            <span>CutCut <span className="text-[var(--accent)]">Anime</span></span>
          </Link>
          <nav className="ml-auto flex items-center gap-4 text-sm text-[var(--fg-muted)]">
            <Link href="/anime" className="hover:text-[var(--fg)] transition-colors">프로젝트</Link>
            <Link href="/anime/settings" className="hover:text-[var(--fg)] transition-colors">⚙️ API 설정</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
