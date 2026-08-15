"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

const CATEGORIES = [
  { id: "general", label: "일반 문의", icon: "💬" },
  { id: "bug", label: "버그 신고", icon: "🐛" },
  { id: "feature", label: "기능 요청", icon: "💡" },
  { id: "question", label: "질문", icon: "❓" },
];

export default function ContactPage() {
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 5) {
      setError("메시지를 5자 이상 입력해주세요.");
      return;
    }

    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message, email: email || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "전송에 실패했습니다.");
        return;
      }

      setSent(true);
      setMessage("");
      setEmail("");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen">
      {/* Sticky Header */}
      <header
        className="sticky top-0 z-30 px-4 py-3"
        style={{ background: "var(--bg-glass)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold" style={{ color: "var(--accent)" }}>
            클립AI
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/studio"
              className="text-sm px-4 py-2 rounded-lg font-medium"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              스튜디오
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 pt-16 pb-10">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3">
            <span style={{ color: "var(--accent)" }}>피드백</span> 보내기
          </h1>
          <p style={{ color: "var(--fg-muted)" }}>
            버그 신고, 기능 요청, 질문 등 무엇이든 보내주세요
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="px-4 pb-16">
        <div className="max-w-2xl mx-auto">
          {sent ? (
            <div className="card text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-xl font-bold mb-2">감사합니다!</h2>
              <p className="text-sm mb-6" style={{ color: "var(--fg-muted)" }}>
                피드백이 전송되었습니다. 소중한 의견 감사합니다.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  className="btn-ghost text-sm"
                  onClick={() => setSent(false)}
                >
                  추가 피드백
                </button>
                <Link href="/studio" className="btn-primary text-sm">
                  스튜디오로 가기
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="card">
              {/* Category */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3">카테고리</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`tone-chip ${category === cat.id ? "active" : ""}`}
                      onClick={() => setCategory(cat.id)}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div className="mb-6">
                <label htmlFor="feedback-message" className="block text-sm font-medium mb-2">
                  메시지 <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  placeholder="여기에 의견을 작성해주세요..."
                  className="w-full px-4 py-3 rounded-xl text-sm resize-none"
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: "var(--fg)",
                  }}
                  required
                />
                <div className="text-xs mt-1 text-right" style={{ color: "var(--fg-muted)" }}>
                  {message.length}/2000
                </div>
              </div>

              {/* Email */}
              <div className="mb-6">
                <label htmlFor="feedback-email" className="block text-sm font-medium mb-2">
                  이메일{" "}
                  <span className="text-xs" style={{ color: "var(--fg-muted)" }}>(선택사항 - 답변받고 싶을 때)</span>
                </label>
                <input
                  id="feedback-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: "var(--fg)",
                  }}
                />
              </div>

              {error && (
                <div className="text-sm mb-4 p-3 rounded-xl" style={{ color: "var(--danger)", background: "rgba(255, 71, 87, 0.1)" }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={sending || message.trim().length < 5}
              >
                {sending ? "전송 중..." : "피드백 보내기"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 pb-20 sm:pb-8">
        <div className="max-w-2xl mx-auto text-center text-xs" style={{ color: "var(--fg-muted)" }}>
          <div className="flex justify-center gap-4 mb-3">
            <Link href="/terms" className="hover:underline">이용약관</Link>
            <Link href="/privacy" className="hover:underline">개인정보처리방침</Link>
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
        <a href="/pricing">
          <span className="text-base">💰</span>
          <span>요금제</span>
        </a>
      </nav>
    </main>
  );
}
