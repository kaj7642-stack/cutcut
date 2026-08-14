"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ScrollToTop } from "@/components/scroll-to-top";
import { StatsCounter } from "@/components/stats-counter";

const STEPS = [
  { icon: "📤", title: "영상 업로드", desc: "파일 드래그 또는 유튜브 URL 입력" },
  { icon: "🔍", title: "AI 편집점 감지", desc: "킬, 오브젝트, 이벤트 사운드를 자동으로 찾음" },
  { icon: "✂️", title: "클립 추출", desc: "편집점 앞뒤로 자동 커팅" },
  { icon: "🎙️", title: "나레이션 + 자막", desc: "AI 나레이션 + 원본 음성 자막 자동 생성" },
  { icon: "🎬", title: "완성 & 다운로드", desc: "자막 + 나레이션이 입혀진 쇼츠 완성" },
];

const TONES = [
  { icon: "😂", name: "웃긴 해설", desc: "예능 자막 느낌으로 상황을 재밌게" },
  { icon: "🔥", name: "하이프 실황", desc: "e스포츠 중계 느낌의 흥분 텐션" },
  { icon: "🎬", name: "인간극장", desc: "다큐 나레이션의 서사적 전개" },
  { icon: "💀", name: "자학개그", desc: "담담한 자기비하 유머" },
];

const FEATURES = [
  {
    icon: "▶️",
    title: "유튜브 URL 지원",
    desc: "파일 없이 유튜브 링크만 붙여넣으면 바로 분석. 쇼츠 URL도 가능.",
  },
  {
    icon: "🔤",
    title: "원본 음성 자막",
    desc: "AI가 영상 속 대사를 인식해서 타임스탬프별 자막을 자동 추출.",
  },
  {
    icon: "💰",
    title: "편당 198원~",
    desc: "50회 팩 기준 편당 198원. 무료 3회 제공. 구독 없음.",
  },
  {
    icon: "🎵",
    title: "저작권 안전 BGM",
    desc: "AI가 실시간으로 생성하는 BGM. Content ID 걱정 제로.",
  },
];

export default function LandingPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 },
    );
    document.querySelectorAll(".fade-section").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 max-w-5xl mx-auto" style={{ background: "var(--bg-glass)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
        <span className="text-xl font-bold" style={{ color: "var(--accent)" }}>클립AI</span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="text-sm px-3 py-1.5 rounded-lg" style={{ border: "1px solid var(--border)", color: "var(--fg-muted)" }}>
            로그인
          </Link>
          <Link href="/studio" className="text-sm px-3 py-1.5 rounded-lg font-medium" style={{ background: "var(--accent)", color: "#fff" }}>
            시작하기
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 pt-16 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-sm rounded-full" style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>
          AI 기반 자동 편집 · 무료 3회 체험
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 max-w-3xl">
          게임 영상 올리면
          <br />
          <span style={{ color: "var(--accent)" }}>쇼츠가 뚝딱</span>
        </h1>
        <p className="text-lg mb-10 max-w-xl" style={{ color: "var(--fg-muted)" }}>
          녹화 파일 또는 유튜브 URL만 넣으세요. AI가 편집점을 찾고, 나레이션을 입히고,
          자막까지 넣은 쇼츠를 만들어 드립니다.
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <Link href="/studio" className="btn-primary">
            무료로 시작하기
          </Link>
          <a href="#features" className="btn-ghost">
            어떤 기능이 있나요?
          </a>
        </div>
      </section>

      {/* Social proof stats */}
      <StatsCounter />

      {/* Features */}
      <section id="features" className="px-6 py-20 fade-section" style={{ background: "var(--bg-card)" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">왜 클립AI인가요?</h2>
          <p className="text-center mb-12" style={{ color: "var(--fg-muted)" }}>
            다른 편집 도구에 없는 기능들
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="card text-center">
                <div className="text-3xl mb-3">{f.icon}</div>
                <div className="font-semibold mb-2">{f.title}</div>
                <div className="text-sm" style={{ color: "var(--fg-muted)" }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="px-6 py-20 max-w-5xl mx-auto fade-section">
        <h2 className="text-3xl font-bold text-center mb-12">5단계 자동 편집</h2>
        <div className="grid sm:grid-cols-5 gap-4">
          {STEPS.map((step, i) => (
            <div key={i} className="card text-center">
              <div className="text-3xl mb-3">{step.icon}</div>
              <div className="font-semibold mb-1">{step.title}</div>
              <div className="text-sm" style={{ color: "var(--fg-muted)" }}>{step.desc}</div>
              {i < STEPS.length - 1 && (
                <div className="hidden sm:block text-2xl mt-4" style={{ color: "var(--fg-muted)" }}>→</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Tones */}
      <section className="px-6 py-20 fade-section" style={{ background: "var(--bg-card)" }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">4가지 나레이션 톤</h2>
          <p className="text-center mb-12" style={{ color: "var(--fg-muted)" }}>
            같은 장면도 톤에 따라 완전히 다른 콘텐츠가 됩니다
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TONES.map((tone) => (
              <div key={tone.name} className="card text-center">
                <div className="text-4xl mb-3">{tone.icon}</div>
                <div className="font-semibold mb-2">{tone.name}</div>
                <div className="text-sm" style={{ color: "var(--fg-muted)" }}>{tone.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Games */}
      <section className="px-6 py-20 max-w-4xl mx-auto text-center fade-section">
        <h2 className="text-3xl font-bold mb-4">모든 게임 지원</h2>
        <p className="mb-8" style={{ color: "var(--fg-muted)" }}>
          롤, 배그, 발로란트, 오버워치, 스타크래프트... 소리가 나는 게임이면 다 됩니다
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {["리그 오브 레전드", "배틀그라운드", "발로란트", "오버워치 2", "스타크래프트", "메이플스토리", "기타 게임"].map((game) => (
            <span key={game} className="px-4 py-2 rounded-full text-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              {game}
            </span>
          ))}
        </div>
      </section>

      {/* Shorts vs Longform */}
      <section className="px-6 py-20" style={{ background: "var(--bg-card)" }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">쇼츠도, 롱폼도</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="card">
              <div className="text-2xl mb-3">📱 쇼츠 모드</div>
              <div className="font-semibold mb-2">편집점 하나 = 쇼츠 하나</div>
              <ul className="text-sm space-y-1" style={{ color: "var(--fg-muted)" }}>
                <li>- 15~60초 클립</li>
                <li>- 개별 나레이션 + 자막</li>
                <li>- YouTube Shorts / TikTok / Reels용</li>
              </ul>
            </div>
            <div className="card">
              <div className="text-2xl mb-3">🖥️ 롱폼 모드</div>
              <div className="font-semibold mb-2">하이라이트 모아서 편집본</div>
              <ul className="text-sm space-y-1" style={{ color: "var(--fg-muted)" }}>
                <li>- 원하는 클립만 골라서 합치기</li>
                <li>- 전체 나레이션 흐름 자동 생성</li>
                <li>- YouTube 본편 / 하이라이트 영상용</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-6 py-20 fade-section" style={{ background: "var(--bg-card)" }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">유저 후기</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { name: "정민혁", game: "롤 다이아", text: "매일 3시간씩 편집하던 걸 10분 만에 끝낼 수 있게 됐습니다. 나레이션 퀄리티가 진짜 좋아요." },
              { name: "김수연", game: "발로란트", text: "자학개그 톤으로 만든 쇼츠가 10만뷰 찍었어요. AI가 제 실력 수준을 정확히 파악하더라고요 ㅋㅋ" },
              { name: "박재원", game: "배그 스트리머", text: "유튜브 URL 넣으면 바로 쇼츠 뽑아주는 게 미쳤습니다. 하이라이트 채널 운영이 너무 편해졌어요." },
            ].map((t) => (
              <div key={t.name} className="card">
                <p className="text-sm mb-4" style={{ color: "var(--fg-muted)", lineHeight: 1.6 }}>
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: "var(--accent-glow)", color: "var(--accent)" }}
                  >
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs" style={{ color: "var(--fg-muted)" }}>{t.game}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="px-6 py-20 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">편당 198원부터</h2>
        <p className="mb-8" style={{ color: "var(--fg-muted)" }}>
          무료 3회 체험 후, 필요한 만큼만 구매하세요. 구독 없음. 크레딧 만료 없음.
        </p>
        <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
          <div className="card text-center">
            <div className="text-2xl font-bold" style={{ color: "var(--accent)" }}>2,900원</div>
            <div className="text-sm mt-1">5회 팩</div>
            <div className="text-xs mt-1" style={{ color: "var(--fg-muted)" }}>편당 580원</div>
          </div>
          <div className="card text-center" style={{ borderColor: "var(--accent)" }}>
            <div className="text-2xl font-bold" style={{ color: "var(--accent)" }}>5,900원</div>
            <div className="text-sm mt-1">20회 팩</div>
            <div className="text-xs mt-1" style={{ color: "var(--fg-muted)" }}>편당 295원</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold" style={{ color: "var(--accent)" }}>9,900원</div>
            <div className="text-sm mt-1">50회 팩</div>
            <div className="text-xs mt-1" style={{ color: "var(--fg-muted)" }}>편당 198원</div>
          </div>
        </div>
        <Link href="/pricing" className="btn-ghost">
          요금제 상세보기
        </Link>
      </section>

      {/* FAQ */}
      <section className="px-6 py-20 max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">자주 묻는 질문</h2>
        <div className="space-y-4">
          {[
            { q: "어떤 게임을 지원하나요?", a: "소리가 나는 모든 게임을 지원합니다. 음량 스파이크(킬, 폭발, 환호 등)를 기반으로 편집점을 감지하므로 게임 종류에 관계없이 작동합니다." },
            { q: "영상 길이 제한이 있나요?", a: "파일 업로드는 최대 500MB, 유튜브 URL은 최대 60분까지 지원합니다. 긴 영상일수록 더 많은 편집점을 발견합니다." },
            { q: "크레딧은 어떻게 차감되나요?", a: "렌더링 1회당 크레딧 1개가 차감됩니다. 분석, 클립 선택, 나레이션 생성까지는 크레딧이 들지 않습니다." },
            { q: "무료 체험은 어떻게 되나요?", a: "회원가입 없이도 3회까지 무료로 렌더링할 수 있습니다. 이후에는 크레딧을 구매하시면 됩니다." },
            { q: "생성된 영상의 저작권은?", a: "클립AI로 만든 영상은 100% 본인 소유입니다. BGM도 AI 실시간 생성이라 Content ID 문제가 없습니다." },
            { q: "모바일에서도 사용 가능한가요?", a: "네, 모든 기능이 모바일 브라우저에서 작동합니다. 렌더링은 기기 성능에 따라 시간이 다소 걸릴 수 있습니다." },
          ].map((faq) => (
            <details key={faq.q} className="card group" style={{ cursor: "pointer" }}>
              <summary className="font-semibold list-none flex items-center justify-between">
                {faq.q}
                <span className="text-lg" style={{ color: "var(--fg-muted)" }}>+</span>
              </summary>
              <p className="mt-3 text-sm" style={{ color: "var(--fg-muted)" }}>{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center" style={{ background: "var(--bg-card)" }}>
        <h2 className="text-3xl font-bold mb-4">지금 바로 시작하세요</h2>
        <p className="mb-8" style={{ color: "var(--fg-muted)" }}>
          녹화 파일 또는 유튜브 URL만 있으면 됩니다. 편집은 AI가 합니다.
        </p>
        <Link href="/studio" className="btn-primary text-lg">
          영상 올리러 가기
        </Link>
      </section>

      <ScrollToTop />

      {/* Footer */}
      <footer className="px-6 py-8 text-sm" style={{ color: "var(--fg-muted)", borderTop: "1px solid var(--border)" }}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>클립AI &copy; {new Date().getFullYear()}</span>
          <div className="flex gap-4">
            <Link href="/pricing">요금제</Link>
            <Link href="/mypage">마이페이지</Link>
            <Link href="/login">로그인</Link>
            <Link href="/terms">이용약관</Link>
            <Link href="/privacy">개인정보처리방침</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
