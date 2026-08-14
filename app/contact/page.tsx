"use client";

import { useState } from "react";
import Link from "next/link";

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
    <main className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/" className="text-xl font-bold" style={{ color: "var(--accent)" }}>
          클립AI
        </Link>
        <Link
          href="/studio"
          className="text-sm px-4 py-2 rounded-lg"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          스튜디오
        </Link>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">
          <span style={{ color: "var(--accent)" }}>피드백</span> 보내기
        </h1>
        <p style={{ color: "var(--fg-muted)" }}>
          버그 신고, 기능 요청, 질문 등 무엇이든 보내주세요
        </p>
      </div>

      {sent ? (
        <div className="card text-center">
          <div className="text-4xl mb-4">🎉</div>
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
            <label className="block text-sm font-medium mb-2">카테고리</label>
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
              className="w-full px-4 py-3 rounded-lg text-sm resize-none"
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
              이메일 <span className="text-xs" style={{ color: "var(--fg-muted)" }}>(선택사항 - 답변받고 싶을 때)</span>
            </label>
            <input
              id="feedback-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full px-4 py-3 rounded-lg text-sm"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                color: "var(--fg)",
              }}
            />
          </div>

          {error && (
            <div className="text-sm mb-4" style={{ color: "var(--danger)" }}>
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
    </main>
  );
}
