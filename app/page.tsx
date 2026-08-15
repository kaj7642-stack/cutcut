"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ScrollToTop } from "@/components/scroll-to-top";
import { StatsCounter } from "@/components/stats-counter";

const STEPS = [
  { icon: "📤", num: "01", title: "영상 업로드", desc: "드래그 또는 유튜브 URL" },
  { icon: "🔍", num: "02", title: "AI 편집점 감지", desc: "킬/이벤트 사운드 자동 감지" },
  { icon: "✂️", num: "03", title: "클립 추출", desc: "편집점 기준 자동 커팅" },
  { icon: "🎙️", num: "04", title: "나레이션 + 자막", desc: "AI 나레이션 + STT 자막" },
  { icon: "🎬", num: "05", title: "완성 & 다운로드", desc: "쇼츠/롱폼 바로 완성" },
];

const TONES = [
  { icon: "😂", name: "웃긴 해설", desc: "예능 자막 느낌으로 상황을 재밌게", example: "\"와 이 친구 진짜 미친 거 아니야? 야스오 장인이 일렉으로 넘어온 줄\"" },
  { icon: "🔥", name: "하이프 실황", desc: "e스포츠 중계 느낌의 흥분 텐션", example: "\"믿을 수 없습니다! 1대5 상황에서 편타킬! 역대급 플레이!\"" },
  { icon: "🎬", name: "인간극장", desc: "다큐 나레이션의 서사적 전개", example: "\"그는 조용히 칼날을 세웠다. 이 한 타가 팀의 운명을 바꿨 줄은...\"" },
  { icon: "💀", name: "자학개그", desc: "담담한 자기비하 유머", example: "\"네, 보시다시피 저는 탑에서 0/7입니다. 명예로운 오징어라고 불러주세요.\"" },
];

const FEATURES = [
  { icon: "▶️", title: "유튜브 URL 지원", desc: "파일 없이 링크만 붙여넣으면 바로 분석. 쇼츠 URL도 가능." },
  { icon: "🔤", title: "원본 음성 자막", desc: "AI가 영상 속 대사를 인식해 타임스탬프별 자막을 자동 추출." },
  { icon: "💰", title: "편당 198원~", desc: "50회 팩 기준. 무료 3회 제공. 구독 없음. 만료 없음." },
  { icon: "🎵", title: "저작권 안전 BGM", desc: "AI가 실시간 생성하는 BGM. Content ID 걱정 제로." },
];

const WAVEFORM = [25, 40, 60, 80, 35, 45, 90, 55, 70, 30, 85, 45, 95, 40, 60, 75, 35, 50, 88, 42, 65, 38, 72, 48];
const WAVEFORM_2 = [30, 55, 45, 70, 85, 40, 65, 92, 50, 35, 78, 42, 88, 55, 38, 68, 45, 82, 35, 60, 48, 75, 40, 58];
const WAVEFORM_3 = [45, 35, 72, 55, 88, 40, 95, 48, 62, 38, 80, 52, 42, 68, 90, 35, 58, 75, 45, 82, 38, 65, 50, 70];

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
      <section className="relative overflow-hidden">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />

        <div className="flex flex-col items-center justify-center px-6 pt-20 pb-8 text-center relative z-10">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-sm rounded-full"
            style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid rgba(108, 92, 231, 0.3)" }}
          >
            ⚡ AI 기반 자동 편집 · 무료 3회 체험
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 max-w-3xl">
            게임 영상 올리면
            <br />
            <span className="hero-gradient-text">쇼츠가 뚝딱</span>
          </h1>
          <p className="text-lg mb-10 max-w-xl leading-relaxed" style={{ color: "var(--fg-muted)" }}>
            녹화 파일 또는 유튜브 URL만 넣으세요.
            <br className="hidden sm:block" />
            AI가 편집점을 찾고, 나레이션을 입히고, 자막까지 넣어 드립니다.
          </p>
          <div className="flex gap-4 flex-wrap justify-center mb-16">
            <Link href="/studio" className="btn-primary">
              무료로 시작하기
            </Link>
            <Link href="/guide" className="btn-ghost">
              사용 가이드 보기
            </Link>
          </div>
        </div>

        {/* Product Mockup */}
        <div className="max-w-4xl mx-auto px-6 pb-20 relative z-10 fade-section">
          <div className="mockup-frame">
            <div className="mockup-titlebar">
              <div className="mockup-dot" style={{ background: "#ff5f57" }} />
              <div className="mockup-dot" style={{ background: "#febc2e" }} />
              <div className="mockup-dot" style={{ background: "#28c840" }} />
              <span className="text-xs ml-2" style={{ color: "var(--fg-muted)" }}>클립AI — 스튜디오</span>
            </div>
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-semibold">gameplay_2024.mp4</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>5개 편집점</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(0,214,143,0.15)", color: "var(--success)" }}>분석 완료</span>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { num: 1, time: "2:34 ~ 2:47", intensity: 9, memo: "1v3 트리플킬", waveform: WAVEFORM },
                  { num: 2, time: "5:12 ~ 5:25", intensity: 7, memo: "바론 스틸", waveform: WAVEFORM_2 },
                  { num: 3, time: "8:01 ~ 8:18", intensity: 8, memo: "백도어 넥서스", waveform: WAVEFORM_3 },
                ].map((clip) => (
                  <div key={clip.num} className="rounded-lg p-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold">클립 {clip.num}</span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{
                          background: clip.intensity >= 8 ? "rgba(255,59,48,0.15)" : "var(--accent-glow)",
                          color: clip.intensity >= 8 ? "#ff3b30" : "var(--accent)",
                        }}
                      >
                        강도 {clip.intensity}/10
                      </span>
                    </div>
                    <div className="flex items-end gap-px h-8 mb-2">
                      {clip.waveform.map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-sm"
                          style={{
                            height: `${h}%`,
                            background: h > 70 ? "var(--accent)" : "var(--border)",
                            opacity: h > 70 ? 1 : 0.5,
                          }}
                        />
                      ))}
                    </div>
                    <div className="text-xs" style={{ color: "var(--fg-muted)" }}>{clip.time}</div>
                    <div className="text-xs mt-1" style={{ color: "var(--accent)" }}>📝 {clip.memo}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs" style={{ color: "var(--accent)" }}>🎙️ 나레이션 미리보기</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>😂 웃긴 해설</span>
                </div>
                <div className="text-sm" style={{ color: "var(--fg-muted)" }}>
                  &ldquo;아니 이 친구 진짜 미쳤나 봐요. 1대3 상황에서 트리플킬이라니, 손가락에 모터 달린 거 아닙니까?&rdquo;
                </div>
              </div>
            </div>
          </div>
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
              <div key={f.title} className="card text-center" style={{ transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s" }}>
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
        <h2 className="text-3xl font-bold text-center mb-4">5단계 자동 편집</h2>
        <p className="text-center mb-12" style={{ color: "var(--fg-muted)" }}>
          영상만 올리면 AI가 나머지를 다 해드립니다
        </p>

        {/* Desktop: horizontal */}
        <div className="hidden sm:block">
          <div className="relative">
            {/* Connector line */}
            <div className="absolute top-[22px] left-[40px] right-[40px] h-[2px]" style={{ background: "var(--border)" }} />
            <div className="grid grid-cols-5 gap-4 relative">
              {STEPS.map((step) => (
                <div key={step.num} className="flex flex-col items-center text-center">
                  <div className="step-number mb-3" style={{ background: "var(--accent)", color: "#fff" }}>
                    {step.icon}
                  </div>
                  <div className="text-xs font-mono mb-1" style={{ color: "var(--accent)" }}>{step.num}</div>
                  <div className="font-semibold text-sm mb-1">{step.title}</div>
                  <div className="text-xs" style={{ color: "var(--fg-muted)" }}>{step.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile: vertical */}
        <div className="sm:hidden space-y-0">
          {STEPS.map((step, i) => (
            <div key={step.num} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="step-number" style={{ background: "var(--accent)", color: "#fff" }}>
                  {step.icon}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-[2px] flex-1 my-1" style={{ background: "var(--border)" }} />
                )}
              </div>
              <div className="pb-8">
                <div className="text-xs font-mono mb-0.5" style={{ color: "var(--accent)" }}>{step.num}</div>
                <div className="font-semibold mb-1">{step.title}</div>
                <div className="text-sm" style={{ color: "var(--fg-muted)" }}>{step.desc}</div>
              </div>
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
          <div className="grid sm:grid-cols-2 gap-4">
            {TONES.map((tone) => (
              <div key={tone.name} className="card">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{tone.icon}</span>
                  <div>
                    <div className="font-semibold">{tone.name}</div>
                    <div className="text-xs" style={{ color: "var(--fg-muted)" }}>{tone.desc}</div>
                  </div>
                </div>
                <div
                  className="text-sm p-3 rounded-lg italic leading-relaxed"
                  style={{ background: "var(--bg)", color: "var(--fg-muted)", borderLeft: "3px solid var(--accent)" }}
                >
                  {tone.example}
                </div>
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
          {[
            { name: "리그 오브 레전드", emoji: "🎯" },
            { name: "배틀그라운드", emoji: "🔫" },
            { name: "발로란트", emoji: "💣" },
            { name: "오버워치 2", emoji: "⚔️" },
            { name: "스타크래프트", emoji: "🚀" },
            { name: "메이플스토리", emoji: "🍁" },
            { name: "기타 게임", emoji: "🎮" },
          ].map((game) => (
            <span
              key={game.name}
              className="px-4 py-2.5 rounded-full text-sm flex items-center gap-2"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <span>{game.emoji}</span> {game.name}
            </span>
          ))}
        </div>
      </section>

      {/* Shorts vs Longform */}
      <section className="px-6 py-20 fade-section" style={{ background: "var(--bg-card)" }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">쇼츠도, 롱폼도</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="card">
              <div className="text-2xl mb-3">📱 쇼츠 모드</div>
              <div className="font-semibold mb-3">편집점 하나 = 쇼츠 하나</div>
              <ul className="text-sm space-y-2" style={{ color: "var(--fg-muted)" }}>
                <li className="flex items-center gap-2"><span style={{ color: "var(--success)" }}>✓</span> 15~60초 클립</li>
                <li className="flex items-center gap-2"><span style={{ color: "var(--success)" }}>✓</span> 개별 나레이션 + 자막</li>
                <li className="flex items-center gap-2"><span style={{ color: "var(--success)" }}>✓</span> YouTube Shorts / TikTok / Reels용</li>
              </ul>
            </div>
            <div className="card">
              <div className="text-2xl mb-3">🖥️ 롱폼 모드</div>
              <div className="font-semibold mb-3">하이라이트 모아서 편집본</div>
              <ul className="text-sm space-y-2" style={{ color: "var(--fg-muted)" }}>
                <li className="flex items-center gap-2"><span style={{ color: "var(--success)" }}>✓</span> 원하는 클립만 골라서 합치기</li>
                <li className="flex items-center gap-2"><span style={{ color: "var(--success)" }}>✓</span> 전체 나레이션 흐름 자동 생성</li>
                <li className="flex items-center gap-2"><span style={{ color: "var(--success)" }}>✓</span> YouTube 본편 / 하이라이트 영상용</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-6 py-20 fade-section">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">유저 후기</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { name: "정민혁", game: "롤 다이아", text: "매일 3시간씩 편집하던 걸 10분 만에 끝낼 수 있게 됐습니다. 나레이션 퀄리티가 진짜 좋아요.", stars: 5 },
              { name: "김수연", game: "발로란트", text: "자학개그 톤으로 만든 쇼츠가 10만뷰 찍었어요. AI가 제 실력 수준을 정확히 파악하더라고요 ㅋㅋ", stars: 5 },
              { name: "박재원", game: "배그 스트리머", text: "유튜브 URL 넣으면 바로 쇼츠 뽑아주는 게 미쳤습니다. 하이라이트 채널 운영이 너무 편해졌어요.", stars: 5 },
            ].map((t) => (
              <div key={t.name} className="card">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.stars }, (_, i) => (
                    <span key={i} className="text-sm" style={{ color: "var(--warning)" }}>★</span>
                  ))}
                </div>
                <p className="text-sm mb-4" style={{ color: "var(--fg-muted)", lineHeight: 1.7 }}>
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
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
      <section className="px-6 py-20 max-w-4xl mx-auto text-center fade-section">
        <h2 className="text-3xl font-bold mb-4">편당 198원부터</h2>
        <p className="mb-10" style={{ color: "var(--fg-muted)" }}>
          무료 3회 체험 후, 필요한 만큼만 구매하세요. 구독 없음. 크레딧 만료 없음.
        </p>
        <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-10">
          <div className="card text-center">
            <div className="text-xs mb-2 font-medium" style={{ color: "var(--fg-muted)" }}>5회 팩</div>
            <div className="text-2xl font-bold" style={{ color: "var(--accent)" }}>2,900원</div>
            <div className="text-xs mt-2" style={{ color: "var(--fg-muted)" }}>편당 580원</div>
          </div>
          <div className="card text-center" style={{ borderColor: "var(--accent)", boxShadow: "0 0 20px var(--accent-glow)" }}>
            <div className="text-xs mb-2 px-2 py-0.5 rounded-full inline-block" style={{ background: "var(--accent)", color: "#fff" }}>인기</div>
            <div className="text-2xl font-bold" style={{ color: "var(--accent)" }}>5,900원</div>
            <div className="text-sm mt-1">20회 팩</div>
            <div className="text-xs mt-1" style={{ color: "var(--fg-muted)" }}>편당 295원</div>
          </div>
          <div className="card text-center">
            <div className="text-xs mb-2 font-medium" style={{ color: "var(--fg-muted)" }}>50회 팩</div>
            <div className="text-2xl font-bold" style={{ color: "var(--accent)" }}>9,900원</div>
            <div className="text-xs mt-2" style={{ color: "var(--fg-muted)" }}>편당 198원</div>
          </div>
        </div>
        <Link href="/pricing" className="btn-ghost">
          요금제 상세보기
        </Link>
      </section>

      {/* FAQ */}
      <section className="px-6 py-20 max-w-3xl mx-auto fade-section">
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
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--fg-muted)" }}>{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-6 py-24 text-center overflow-hidden" style={{ background: "var(--bg-card)" }}>
        <div className="hero-orb" style={{ width: "300px", height: "300px", background: "var(--accent)", opacity: "0.08", top: "-50px", right: "-50px", animation: "orb-float 10s ease-in-out infinite" }} />
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-4">지금 바로 시작하세요</h2>
          <p className="mb-8" style={{ color: "var(--fg-muted)" }}>
            녹화 파일 또는 유튜브 URL만 있으면 됩니다. 편집은 AI가 합니다.
          </p>
          <Link href="/studio" className="btn-primary text-lg">
            영상 올리러 가기
          </Link>
        </div>
      </section>

      <ScrollToTop />

      {/* Footer */}
      <footer className="px-6 py-12 text-sm" style={{ color: "var(--fg-muted)", borderTop: "1px solid var(--border)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="font-bold text-base mb-3" style={{ color: "var(--fg)" }}>클립AI</div>
              <p className="text-sm leading-relaxed">
                게임 영상을 올리면 AI가 편집점을 찾고 나레이션을 입히고 자막까지 넣어 드립니다.
              </p>
            </div>
            <div>
              <div className="font-semibold mb-3" style={{ color: "var(--fg)" }}>서비스</div>
              <div className="flex flex-col gap-2">
                <Link href="/studio" className="hover:underline">스튜디오</Link>
                <Link href="/gallery" className="hover:underline">갤러리</Link>
                <Link href="/guide" className="hover:underline">사용 가이드</Link>
                <Link href="/pricing" className="hover:underline">요금제</Link>
              </div>
            </div>
            <div>
              <div className="font-semibold mb-3" style={{ color: "var(--fg)" }}>고객지원</div>
              <div className="flex flex-col gap-2">
                <Link href="/contact" className="hover:underline">피드백 / 문의</Link>
                <Link href="/mypage" className="hover:underline">마이페이지</Link>
                <Link href="/terms" className="hover:underline">이용약관</Link>
                <Link href="/privacy" className="hover:underline">개인정보처리방침</Link>
              </div>
            </div>
          </div>
          <div className="text-center pt-6" style={{ borderTop: "1px solid var(--border)" }}>
            클립AI &copy; {new Date().getFullYear()} &middot; All rights reserved.
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-bottom-nav">
        <Link href="/" className="active">
          <span className="text-base">🏠</span>
          <span>홈</span>
        </Link>
        <Link href="/studio">
          <span className="text-base">🎬</span>
          <span>스튜디오</span>
        </Link>
        <Link href="/gallery">
          <span className="text-base">🖼️</span>
          <span>갤러리</span>
        </Link>
        <Link href="/pricing">
          <span className="text-base">💰</span>
          <span>요금제</span>
        </Link>
      </nav>
    </main>
  );
}
