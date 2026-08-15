"use client";

import { useState, useEffect, useRef } from "react";
import { PLANS } from "@/lib/plans";
import { trackEvent } from "@/lib/analytics";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";

declare global {
  interface Window {
    PortOne?: {
      requestPayment: (options: Record<string, unknown>) => Promise<{ code?: string; paymentId?: string }>;
    };
  }
}

interface AuthUser {
  id: number;
  email: string;
  nickname: string | null;
}

const FAQ_ITEMS = [
  {
    q: "크레딧은 만료되나요?",
    a: "아니요. 한번 구매한 크레딧은 영구적으로 사용 가능합니다. 구독이 아닌 1회 결제 방식이라 부담 없이 필요할 때만 충전하세요.",
  },
  {
    q: "무료 체험은 어떻게 받나요?",
    a: "회원가입만 하면 자동으로 무료 3회가 지급됩니다. 카드 등록 없이 바로 사용 가능하며, 모든 기능을 동일하게 체험할 수 있습니다.",
  },
  {
    q: "쇼츠와 롱폼의 크레딧 소모가 다른가요?",
    a: "같습니다. 쇼츠(9:16)든 롱폼(16:9)이든 렌더링 1회에 1크레딧이 소모됩니다.",
  },
  {
    q: "환불이 가능한가요?",
    a: "크레딧을 사용하지 않은 경우 구매 후 7일 이내 전액 환불이 가능합니다. 문의 페이지에서 요청해주세요.",
  },
  {
    q: "결제 수단은 무엇이 있나요?",
    a: "카카오페이와 토스/카드 결제를 지원합니다. 모든 결제는 PortOne(구 아임포트)을 통해 안전하게 처리됩니다.",
  },
];

const TRUST_BADGES = [
  { icon: "♾️", title: "만료 없음", desc: "크레딧은 영구 보관" },
  { icon: "🚫", title: "구독 없음", desc: "1회 결제, 자동갱신 없음" },
  { icon: "↩️", title: "환불 가능", desc: "미사용 시 7일 이내" },
  { icon: "🔒", title: "안전 결제", desc: "PortOne 인증 결제" },
];

const FEATURES = [
  { icon: "🔍", label: "AI 편집점 자동 감지" },
  { icon: "🎙️", label: "4가지 나레이션 톤" },
  { icon: "🗣️", label: "TTS 음성 합성 (7가지 목소리)" },
  { icon: "🔤", label: "원본 음성 자막 (STT)" },
  { icon: "▶️", label: "유튜브 URL 직접 입력" },
  { icon: "📱", label: "쇼츠 + 롱폼 모드" },
  { icon: "🎵", label: "저작권 안전 AI BGM" },
  { icon: "✏️", label: "나레이션 텍스트 자유 편집" },
];

export default function PricingPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [credits, setCredits] = useState(0);
  const [freeLeft, setFreeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/credits/consume").then((r) => r.json()),
    ])
      .then(([auth, cred]) => {
        setUser(auth.user);
        setCredits(cred.credits ?? 0);
        setFreeLeft(cred.freeLeft ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
    sectionRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handlePurchase = async (planId: string, method: "kakaopay" | "toss") => {
    if (!user) {
      window.location.href = "/login?redirect=/pricing";
      return;
    }

    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) return;

    const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
    const channelKey = method === "kakaopay"
      ? process.env.NEXT_PUBLIC_PORTONE_KAKAOPAY_CHANNEL_KEY
      : process.env.NEXT_PUBLIC_PORTONE_TOSS_CHANNEL_KEY;

    if (!storeId || !channelKey || !window.PortOne) {
      setMessage("결제 모듈이 로드되지 않았습니다. 새로고침 후 다시 시도해주세요.");
      setMessageType("error");
      return;
    }

    setPaying(true);
    setMessage("");
    trackEvent("payment_start", { plan: planId, method });

    const paymentId = `clip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      const result = await window.PortOne.requestPayment({
        storeId,
        channelKey,
        paymentId,
        orderName: `클립AI ${plan.name}`,
        totalAmount: plan.price,
        currency: "CURRENCY_KRW",
        payMethod: method === "kakaopay" ? "EASY_PAY" : "CARD",
      });

      if (result.code) {
        setMessage("결제가 취소되었습니다.");
        setMessageType("error");
        setPaying(false);
        return;
      }

      const verifyRes = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, planId }),
      });

      if (verifyRes.ok) {
        const data = await verifyRes.json();
        setCredits((prev) => prev + data.credits);
        setMessage(`${plan.name}이 충전되었습니다!`);
        setMessageType("success");
        trackEvent("payment_complete", { plan: planId, credits: data.credits });
      } else {
        const data = await verifyRes.json();
        setMessage(data.error || "결제 검증에 실패했습니다.");
        setMessageType("error");
      }
    } catch {
      setMessage("결제 중 오류가 발생했습니다.");
      setMessageType("error");
    } finally {
      setPaying(false);
    }
  };

  return (
    <main className="min-h-screen">
      <script src="https://cdn.portone.io/v2/browser-sdk.js" async />

      {/* Header */}
      <header
        className="sticky top-0 z-30 px-4 py-3"
        style={{ background: "var(--bg-glass)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold" style={{ color: "var(--accent)" }}>
            클립AI
          </Link>
          <nav className="hidden sm:flex items-center gap-6 text-sm" style={{ color: "var(--fg-muted)" }}>
            <Link href="/studio" className="hover:underline">스튜디오</Link>
            <Link href="/gallery" className="hover:underline">갤러리</Link>
            <Link href="/guide" className="hover:underline">가이드</Link>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {!loading && user && (
              <div className="text-sm" style={{ color: "var(--fg-muted)" }}>
                {freeLeft > 0 && (
                  <span className="mr-2">
                    무료 <strong style={{ color: "var(--success)" }}>{freeLeft}회</strong>
                  </span>
                )}
                <span
                  className="px-2 py-1 rounded-full text-xs font-semibold"
                  style={{ background: "var(--accent-glow)", color: "var(--accent)" }}
                >
                  {credits} 크레딧
                </span>
              </div>
            )}
            {!loading && !user && (
              <Link
                href="/login?redirect=/pricing"
                className="text-sm px-3 py-1.5 rounded-lg"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-16 pb-12">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div
            className="inline-block text-xs font-semibold px-4 py-1.5 rounded-full mb-6"
            style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid var(--accent)" }}
          >
            구독 없음 · 1회 결제 · 만료 없음
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">
            필요한 만큼만{" "}
            <span className="hero-gradient-text">충전하세요</span>
          </h1>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--fg-muted)" }}>
            1크레딧 = 쇼츠 또는 롱폼 1개. 구독이 아니라 부담 없이 시작할 수 있습니다.
          </p>
        </div>
      </section>

      {/* Free Tier Banner */}
      {(!user || freeLeft > 0) && (
        <section className="px-4 mb-12">
          <div
            ref={(el) => { sectionRefs.current[0] = el; }}
            className="fade-section max-w-5xl mx-auto"
          >
            <div
              className="pricing-free-banner relative overflow-hidden rounded-2xl p-6 sm:p-8 text-center"
              style={{
                background: "linear-gradient(135deg, var(--accent-glow), transparent, var(--accent-glow))",
                border: "1px solid var(--accent)",
              }}
            >
              <div className="text-4xl mb-3">🎁</div>
              <h2 className="text-2xl font-bold mb-2">무료 3회 체험</h2>
              <p className="text-sm mb-4" style={{ color: "var(--fg-muted)" }}>
                회원가입만 하면 쇼츠 3개를 무료로 만들 수 있습니다. 카드 등록 필요 없음.
              </p>
              {!user && (
                <Link
                  href="/login?redirect=/studio"
                  className="btn-primary inline-block text-sm"
                >
                  무료로 시작하기
                </Link>
              )}
              {user && freeLeft > 0 && (
                <div className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
                  남은 무료 횟수: {freeLeft}회
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Pricing Cards */}
      <section className="px-4 mb-16">
        <div
          ref={(el) => { sectionRefs.current[1] = el; }}
          className="fade-section max-w-5xl mx-auto"
        >
          <div className="grid sm:grid-cols-3 gap-6">
            {PLANS.map((plan, i) => {
              const perUnit = Math.round(plan.price / plan.credits);
              const isPopular = i === 1;
              const isBest = i === 2;
              return (
                <div
                  key={plan.id}
                  className="card relative flex flex-col"
                  style={{
                    ...(isPopular
                      ? { borderColor: "var(--accent)", boxShadow: "0 0 30px var(--accent-glow)" }
                      : isBest
                        ? { borderColor: "var(--success)", boxShadow: `0 0 20px rgba(0, 214, 143, 0.15)` }
                        : {}),
                    padding: "32px 24px",
                  }}
                >
                  {isPopular && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1 rounded-full"
                      style={{ background: "var(--accent)", color: "#fff" }}
                    >
                      인기
                    </div>
                  )}
                  {isBest && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1 rounded-full"
                      style={{ background: "var(--success)", color: "#fff" }}
                    >
                      최저가
                    </div>
                  )}

                  <div className="text-center mb-6 flex-1">
                    <div className="text-3xl font-bold mb-1">{plan.name}</div>
                    <div className="text-4xl font-extrabold my-3" style={{ color: isPopular ? "var(--accent)" : isBest ? "var(--success)" : "var(--fg)" }}>
                      {plan.price.toLocaleString()}
                      <span className="text-base font-normal" style={{ color: "var(--fg-muted)" }}>원</span>
                    </div>
                    <div
                      className="inline-block text-sm px-3 py-1 rounded-full"
                      style={{ background: "var(--bg)", color: "var(--fg-muted)" }}
                    >
                      편당 {perUnit.toLocaleString()}원
                    </div>
                  </div>

                  <ul className="space-y-2 mb-6 text-sm">
                    <li className="flex items-center gap-2">
                      <span style={{ color: "var(--success)" }}>✓</span>
                      <span>렌더링 {plan.credits}회</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span style={{ color: "var(--success)" }}>✓</span>
                      <span>모든 기능 포함</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span style={{ color: "var(--success)" }}>✓</span>
                      <span>크레딧 만료 없음</span>
                    </li>
                  </ul>

                  <div className="flex flex-col gap-2">
                    <button
                      className="w-full py-3 rounded-xl font-semibold text-[#191919] transition-transform hover:scale-[1.02] active:scale-[0.98]"
                      style={{ backgroundColor: "#FEE500" }}
                      disabled={paying}
                      onClick={() => handlePurchase(plan.id, "kakaopay")}
                    >
                      카카오페이
                    </button>
                    <button
                      className="w-full py-3 rounded-xl font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
                      style={{ backgroundColor: "#0064FF" }}
                      disabled={paying}
                      onClick={() => handlePurchase(plan.id, "toss")}
                    >
                      토스/카드
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Payment Message */}
      {message && (
        <section className="px-4 mb-8">
          <div className="max-w-5xl mx-auto">
            <div
              className="card text-center text-sm"
              style={{
                borderColor: messageType === "success" ? "var(--success)" : "var(--danger)",
                color: messageType === "success" ? "var(--success)" : "var(--danger)",
              }}
            >
              {messageType === "success" ? "🎉 " : ""}{message}
            </div>
          </div>
        </section>
      )}

      {/* Trust Badges */}
      <section className="px-4 mb-16">
        <div
          ref={(el) => { sectionRefs.current[2] = el; }}
          className="fade-section max-w-5xl mx-auto"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {TRUST_BADGES.map((badge) => (
              <div
                key={badge.title}
                className="text-center py-5 px-3 rounded-2xl"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <div className="text-2xl mb-2">{badge.icon}</div>
                <div className="font-semibold text-sm mb-0.5">{badge.title}</div>
                <div className="text-xs" style={{ color: "var(--fg-muted)" }}>{badge.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 mb-16">
        <div
          ref={(el) => { sectionRefs.current[3] = el; }}
          className="fade-section max-w-5xl mx-auto"
        >
          <h2 className="text-2xl font-bold text-center mb-2">모든 요금제에 포함</h2>
          <p className="text-center text-sm mb-8" style={{ color: "var(--fg-muted)" }}>
            어떤 팩을 선택하든 모든 기능을 동일하게 사용할 수 있습니다
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <span className="text-lg">{f.icon}</span>
                <span className="text-sm">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 mb-16">
        <div
          ref={(el) => { sectionRefs.current[4] = el; }}
          className="fade-section max-w-3xl mx-auto"
        >
          <h2 className="text-2xl font-bold text-center mb-2">자주 묻는 질문</h2>
          <p className="text-center text-sm mb-8" style={{ color: "var(--fg-muted)" }}>
            결제와 크레딧에 대해 궁금한 점을 확인하세요
          </p>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden transition-all"
                style={{
                  background: "var(--bg-card)",
                  border: `1px solid ${openFaq === i ? "var(--accent)" : "var(--border)"}`,
                }}
              >
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span>{item.q}</span>
                  <span
                    className="text-lg transition-transform shrink-0 ml-3"
                    style={{
                      transform: openFaq === i ? "rotate(45deg)" : "rotate(0deg)",
                      color: "var(--fg-muted)",
                    }}
                  >
                    +
                  </span>
                </button>
                <div
                  className="overflow-hidden transition-all"
                  style={{
                    maxHeight: openFaq === i ? "200px" : "0",
                    opacity: openFaq === i ? 1 : 0,
                    transition: "max-height 0.3s ease, opacity 0.2s ease",
                  }}
                >
                  <div className="px-5 pb-4 text-sm" style={{ color: "var(--fg-muted)" }}>
                    {item.a}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 mb-16">
        <div
          ref={(el) => { sectionRefs.current[5] = el; }}
          className="fade-section max-w-5xl mx-auto"
        >
          <div
            className="relative overflow-hidden rounded-2xl px-6 py-12 text-center"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at center, var(--accent-glow), transparent 70%)",
              }}
            />
            <div className="relative z-10">
              <div className="text-4xl mb-4">🎬</div>
              <h2 className="text-2xl font-bold mb-3">지금 바로 시작하세요</h2>
              <p className="text-sm mb-6" style={{ color: "var(--fg-muted)" }}>
                무료 3회로 클립AI의 모든 기능을 체험해보세요
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Link href="/studio" className="btn-primary">
                  스튜디오로 가기
                </Link>
                <Link href="/guide" className="btn-ghost">
                  사용 가이드
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 pb-20 sm:pb-8">
        <div className="max-w-5xl mx-auto text-center text-xs" style={{ color: "var(--fg-muted)" }}>
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
        <a href="/gallery">
          <span className="text-base">🖼️</span>
          <span>갤러리</span>
        </a>
        <a href="/pricing" className="active">
          <span className="text-base">💰</span>
          <span>요금제</span>
        </a>
      </nav>
    </main>
  );
}
