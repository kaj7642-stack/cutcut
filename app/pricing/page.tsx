"use client";

import { useState, useEffect } from "react";
import { PLANS } from "@/lib/plans";
import { trackEvent } from "@/lib/analytics";

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

export default function PricingPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [credits, setCredits] = useState(0);
  const [freeLeft, setFreeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState("");

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
        trackEvent("payment_complete", { plan: planId, credits: data.credits });
      } else {
        const data = await verifyRes.json();
        setMessage(data.error || "결제 검증에 실패했습니다.");
      }
    } catch {
      setMessage("결제 중 오류가 발생했습니다.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 max-w-4xl mx-auto">
      <script src="https://cdn.portone.io/v2/browser-sdk.js" async />

      <div className="flex items-center justify-between mb-8">
        <a href="/" className="text-xl font-bold" style={{ color: "var(--accent)" }}>
          클립AI
        </a>
        {!loading && user && (
          <div className="text-sm" style={{ color: "var(--fg-muted)" }}>
            {freeLeft > 0 && (
              <span className="mr-3">
                무료: <strong style={{ color: "var(--success)" }}>{freeLeft}회 남음</strong>
              </span>
            )}
            크레딧: <strong style={{ color: "var(--accent)" }}>{credits}회</strong>
          </div>
        )}
      </div>

      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold mb-4">요금제</h1>
        <p style={{ color: "var(--fg-muted)" }}>
          렌더링 크레딧을 구매하세요. 1크레딧 = 쇼츠 또는 롱폼 1개
        </p>
      </div>

      {/* Free Tier Banner */}
      {(!user || freeLeft > 0) && (
        <div
          className="card text-center mb-8"
          style={{ background: "var(--accent-glow)", borderColor: "var(--accent)" }}
        >
          <div className="text-2xl mb-2">🎁</div>
          <div className="font-semibold mb-1">무료 3회 체험</div>
          <div className="text-sm" style={{ color: "var(--fg-muted)" }}>
            회원가입만 하면 쇼츠 3개를 무료로 만들 수 있습니다. 카드 등록 필요 없음.
          </div>
          {!user && (
            <a
              href="/login?redirect=/studio"
              className="btn-primary inline-block mt-3 text-sm"
            >
              무료로 시작하기
            </a>
          )}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-6 mb-8">
        {PLANS.map((plan, i) => {
          const perUnit = Math.round(plan.price / plan.credits);
          return (
            <div
              key={plan.id}
              className="card text-center"
              style={i === 2 ? { borderColor: "var(--accent)", boxShadow: "0 0 20px var(--accent-glow)" } : {}}
            >
              {i === 2 && (
                <div
                  className="text-xs font-semibold mb-3 px-3 py-1 rounded-full inline-block"
                  style={{ background: "var(--accent-glow)", color: "var(--accent)" }}
                >
                  최저가
                </div>
              )}
              {i === 1 && (
                <div
                  className="text-xs font-semibold mb-3 px-3 py-1 rounded-full inline-block"
                  style={{ background: "var(--accent-glow)", color: "var(--accent)" }}
                >
                  인기
                </div>
              )}
              <div className="text-2xl font-bold mb-1">{plan.name}</div>
              <div className="text-3xl font-bold mb-1" style={{ color: "var(--accent)" }}>
                {plan.price.toLocaleString()}원
              </div>
              <div className="text-sm mb-6" style={{ color: "var(--fg-muted)" }}>
                편당 {perUnit.toLocaleString()}원
              </div>

              <div className="flex flex-col gap-2">
                <button
                  className="w-full py-2.5 rounded-xl font-semibold text-[#191919]"
                  style={{ backgroundColor: "#FEE500" }}
                  disabled={paying}
                  onClick={() => handlePurchase(plan.id, "kakaopay")}
                >
                  카카오페이
                </button>
                <button
                  className="w-full py-2.5 rounded-xl font-semibold text-white"
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

      {message && (
        <div className="card text-center text-sm mb-8">
          {message}
        </div>
      )}

      {/* What's included */}
      <div className="card mb-8">
        <h2 className="font-semibold mb-4 text-center">모든 요금제 포함 기능</h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm max-w-lg mx-auto">
          {[
            "AI 편집점 자동 감지",
            "4가지 나레이션 톤",
            "TTS 음성 합성 (7가지 목소리)",
            "원본 음성 자막 (STT)",
            "유튜브 URL 직접 입력",
            "쇼츠 + 롱폼 모드",
            "저작권 안전 AI BGM",
            "크레딧 만료 없음",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 py-1">
              <span style={{ color: "var(--success)" }}>✓</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center text-sm" style={{ color: "var(--fg-muted)" }}>
        <p>1회 결제 · 구독 없음 · 크레딧은 만료되지 않습니다</p>
        <p className="mt-1">
          <a href="/studio" style={{ color: "var(--accent)" }}>스튜디오로 돌아가기</a>
        </p>
      </div>
    </main>
  );
}
