"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function ResetContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div className="text-center">
        <div className="text-sm" style={{ color: "var(--danger)" }}>
          유효하지 않은 링크입니다.
        </div>
        <a href="/login" className="btn-primary inline-block mt-4" style={{ padding: "10px 24px" }}>
          로그인 페이지로
        </a>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="text-3xl mb-4">✅</div>
        <div className="text-lg font-semibold mb-2">비밀번호가 변경되었습니다</div>
        <div className="text-sm mb-4" style={{ color: "var(--fg-muted)" }}>
          새 비밀번호로 로그인해주세요.
        </div>
        <a href="/login" className="btn-primary inline-block" style={{ padding: "10px 24px" }}>
          로그인하기
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
          const res = await fetch("/api/auth/reset-password/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, newPassword: password }),
          });
          if (res.ok) {
            setDone(true);
          } else {
            const data = await res.json();
            setError(data.error || "변경 실패");
          }
        } catch {
          setError("네트워크 오류");
        } finally {
          setLoading(false);
        }
      }}
      className="flex flex-col gap-4"
    >
      <input
        type="password"
        placeholder="새 비밀번호 (6자 이상)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
        className="w-full px-4 py-3 rounded-xl text-sm"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--fg)" }}
      />
      <button
        type="submit"
        className="btn-primary w-full"
        disabled={loading || password.length < 6}
        style={{ padding: "12px" }}
      >
        {loading ? "변경 중..." : "비밀번호 변경"}
      </button>
      {error && (
        <div className="text-sm text-center" style={{ color: "var(--danger)" }}>{error}</div>
      )}
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <a href="/" className="text-2xl font-bold" style={{ color: "var(--accent)" }}>
            클립AI
          </a>
          <h1 className="text-xl font-semibold mt-4">비밀번호 재설정</h1>
        </div>
        <Suspense>
          <ResetContent />
        </Suspense>
      </div>
    </main>
  );
}
