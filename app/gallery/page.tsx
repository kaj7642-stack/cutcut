"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

interface GalleryItem {
  id: string;
  game: string;
  title: string;
  description: string;
  tags: string[];
  duration: string;
  mode: "shorts" | "longform";
  tone: string;
  icon: string;
  views: string;
}

const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: "1",
    game: "리그 오브 레전드",
    title: "야스오 1v5 펜타킬",
    description: "바론 앞 팀파이트에서 야스오가 궁극기로 5명을 날려버리는 장면. AI가 흥분 톤으로 나레이션을 생성했습니다.",
    tags: ["펜타킬", "팀파이트", "역전"],
    duration: "58초",
    mode: "shorts",
    tone: "흥분",
    icon: "⚔️",
    views: "2.4K",
  },
  {
    id: "2",
    game: "배틀그라운드",
    title: "마지막 1대1 치킨디너",
    description: "최종 안전지대에서 긴장감 넘치는 1대1 교전. 해설 톤의 나레이션으로 프로 경기 느낌을 연출했습니다.",
    tags: ["치킨디너", "1v1", "최종전"],
    duration: "1분 23초",
    mode: "shorts",
    tone: "해설",
    icon: "💥",
    views: "1.8K",
  },
  {
    id: "3",
    game: "발로란트",
    title: "제트 에이스 클러치",
    description: "2라운드 에코 상황에서 제트의 칼잡이 에이스. 재미 톤으로 밈 스타일 나레이션을 입혔습니다.",
    tags: ["에이스", "클러치", "칼잡이"],
    duration: "45초",
    mode: "shorts",
    tone: "재미",
    icon: "🎯",
    views: "3.1K",
  },
  {
    id: "4",
    game: "오버워치 2",
    title: "견지 용검 팀킬",
    description: "탱크 지원 없이 혼자 뒤에서 용검으로 5킬. 캐주얼 톤으로 친근한 나레이션을 만들었습니다.",
    tags: ["용검", "팀킬", "백어택"],
    duration: "38초",
    mode: "shorts",
    tone: "캐주얼",
    icon: "🗡️",
    views: "1.2K",
  },
  {
    id: "5",
    game: "리그 오브 레전드",
    title: "서포터 쓰레쉬 하이라이트 모음",
    description: "한 판에서 나온 쓰레쉬의 감각적인 후크 모음. 롱폼으로 여러 클립을 이어붙여 하이라이트 릴을 만들었습니다.",
    tags: ["하이라이트 릴", "후크", "서포터"],
    duration: "3분 45초",
    mode: "longform",
    tone: "해설",
    icon: "🎣",
    views: "4.7K",
  },
  {
    id: "6",
    game: "에이펙스 레전드",
    title: "레이스 포탈 IQ 플레이",
    description: "포탈로 적을 유인해 클리프 아래로 떨어뜨리는 고 IQ 플레이. 감동 톤으로 스토리텔링 나레이션 적용.",
    tags: ["IQ 플레이", "포탈", "전략"],
    duration: "52초",
    mode: "shorts",
    tone: "감동",
    icon: "🧠",
    views: "2.9K",
  },
];

const GAMES = ["전체", ...new Set(GALLERY_ITEMS.map((i) => i.game))];

export default function GalleryPage() {
  const [selectedGame, setSelectedGame] = useState("전체");
  const [selectedMode, setSelectedMode] = useState<"all" | "shorts" | "longform">("all");
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.05 },
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const filtered = GALLERY_ITEMS.filter((item) => {
    if (selectedGame !== "전체" && item.game !== selectedGame) return false;
    if (selectedMode !== "all" && item.mode !== selectedMode) return false;
    return true;
  });

  return (
    <main className="min-h-screen">
      {/* Sticky Header */}
      <header
        className="sticky top-0 z-30 px-4 py-3"
        style={{ background: "var(--bg-glass)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold" style={{ color: "var(--accent)" }}>
            클립AI
          </Link>
          <nav className="hidden sm:flex items-center gap-6 text-sm" style={{ color: "var(--fg-muted)" }}>
            <Link href="/studio" className="hover:underline">스튜디오</Link>
            <Link href="/pricing" className="hover:underline">요금제</Link>
            <Link href="/guide" className="hover:underline">가이드</Link>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/studio"
              className="text-sm px-4 py-2 rounded-lg font-medium"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              스튜디오로 가기
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-16 pb-12">
        <div className="hero-orb hero-orb-1" style={{ opacity: 0.06 }} />
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <h1 className="text-3xl sm:text-5xl font-extrabold mb-4">
            AI가 만든 <span className="hero-gradient-text">게임 하이라이트</span>
          </h1>
          <p className="text-lg" style={{ color: "var(--fg-muted)" }}>
            클립AI 사용자들이 만든 하이라이트 쇼츠를 구경해보세요
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="px-4 mb-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2 flex-wrap flex-1">
              {GAMES.map((game) => (
                <button
                  key={game}
                  className={`tone-chip ${selectedGame === game ? "active" : ""}`}
                  onClick={() => setSelectedGame(game)}
                >
                  {game}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {[
                { id: "all" as const, label: "전체" },
                { id: "shorts" as const, label: "📱 쇼츠" },
                { id: "longform" as const, label: "💻 롱폼" },
              ].map((m) => (
                <button
                  key={m.id}
                  className={`tone-chip ${selectedMode === m.id ? "active" : ""}`}
                  onClick={() => setSelectedMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="px-4 mb-16" ref={sectionRef}>
        <div className="fade-section max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="card group"
                style={{ padding: 0, overflow: "hidden", transition: "transform 0.2s, box-shadow 0.2s" }}
              >
                {/* Thumbnail placeholder */}
                <div
                  className="aspect-video flex items-center justify-center relative"
                  style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}
                >
                  <span className="text-5xl">{item.icon}</span>
                  <div
                    className="absolute top-3 left-3 text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: "var(--accent)", color: "#fff" }}
                  >
                    {item.mode === "shorts" ? "📱 쇼츠" : "💻 롱폼"}
                  </div>
                  <div
                    className="absolute bottom-3 right-3 text-xs px-2 py-1 rounded-lg font-mono"
                    style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}
                  >
                    {item.duration}
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                      style={{ background: "var(--accent-glow)", color: "var(--accent)" }}
                    >
                      {item.game}
                    </span>
                    <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
                      {item.tone} 톤
                    </span>
                  </div>
                  <h3 className="font-bold text-base mb-1.5">{item.title}</h3>
                  <p
                    className="text-sm mb-3 line-clamp-2"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5 flex-wrap">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: "var(--bg)", color: "var(--fg-muted)", border: "1px solid var(--border)" }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs flex items-center gap-1" style={{ color: "var(--fg-muted)" }}>
                      ▶ {item.views}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20" style={{ color: "var(--fg-muted)" }}>
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-lg">해당 조건의 하이라이트가 없습니다</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 mb-16">
        <div className="max-w-6xl mx-auto">
          <div
            className="relative overflow-hidden rounded-2xl px-6 py-12 text-center"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at center, var(--accent-glow), transparent 70%)" }}
            />
            <div className="relative z-10">
              <div className="text-4xl mb-4">🎬</div>
              <h2 className="text-2xl font-bold mb-3">나만의 하이라이트를 만들어보세요</h2>
              <p className="text-sm mb-6" style={{ color: "var(--fg-muted)" }}>
                게임 녹화 파일만 있으면 AI가 나머지를 다 해드립니다
              </p>
              <Link href="/studio" className="btn-primary inline-block">
                무료로 시작하기
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 pb-20 sm:pb-8">
        <div className="max-w-6xl mx-auto text-center text-xs" style={{ color: "var(--fg-muted)" }}>
          <div className="flex justify-center gap-4 mb-3">
            <Link href="/terms" className="hover:underline">이용약관</Link>
            <Link href="/privacy" className="hover:underline">개인정보처리방침</Link>
            <Link href="/contact" className="hover:underline">문의하기</Link>
          </div>
          <p>© 2024 클립AI. All rights reserved.</p>
        </div>
      </footer>

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
        <a href="/gallery" className="active">
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
