"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const redirect = searchParams.get("redirect") || "/studio";
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const oauthError = error?.startsWith("kakao")
    ? "카카오 로그인에 실패했습니다. 다시 시도해주세요."
    : error?.startsWith("naver")
    ? "네이버 로그인에 실패했습니다. 다시 시도해주세요."
    : null;

  const kakaoHref = `/api/auth/kakao?redirect=${encodeURIComponent(redirect)}`;
  const naverHref = `/api/auth/naver?redirect=${encodeURIComponent(redirect)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setLoading(true);

    const endpoint = tab === "login" ? "/api/auth/login" : "/api/auth/signup";
    const body: Record<string, string> = { email, password };
    if (tab === "signup" && nickname) body.nickname = nickname;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        window.location.href = redirect;
      } else {
        const data = await res.json();
        setFormError(data.error || "처리 중 오류가 발생했습니다.");
      }
    } catch {
      setFormError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Tab Switch */}
      <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <button
          className="flex-1 py-2.5 text-sm font-semibold transition-colors"
          style={{
            background: tab === "login" ? "var(--accent)" : "transparent",
            color: tab === "login" ? "#fff" : "var(--fg-muted)",
          }}
          onClick={() => { setTab("login"); setFormError(""); }}
        >
          로그인
        </button>
        <button
          className="flex-1 py-2.5 text-sm font-semibold transition-colors"
          style={{
            background: tab === "signup" ? "var(--accent)" : "transparent",
            color: tab === "signup" ? "#fff" : "var(--fg-muted)",
          }}
          onClick={() => { setTab("signup"); setFormError(""); }}
        >
          회원가입
        </button>
      </div>

      {/* Email Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {tab === "signup" && (
          <input
            type="text"
            placeholder="닉네임 (선택)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--fg)" }}
          />
        )}
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-xl text-sm"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--fg)" }}
        />
        <input
          type="password"
          placeholder={tab === "signup" ? "비밀번호 (6자 이상)" : "비밀번호"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={tab === "signup" ? 6 : undefined}
          className="w-full px-4 py-3 rounded-xl text-sm"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--fg)" }}
        />
        <button
          type="submit"
          className="btn-primary w-full"
          disabled={loading}
          style={{ padding: "12px" }}
        >
          {loading ? "처리 중..." : tab === "login" ? "로그인" : "가입하기"}
        </button>
      </form>

      {tab === "login" && (
        <div className="text-center">
          <button
            type="button"
            className="text-xs"
            style={{ color: "var(--accent)" }}
            onClick={async () => {
              if (!email) {
                setFormError("이메일을 먼저 입력해주세요.");
                return;
              }
              setLoading(true);
              try {
                const res = await fetch("/api/auth/reset-password", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email }),
                });
                if (res.ok) {
                  setResetSent(true);
                  setFormError("");
                } else {
                  const data = await res.json();
                  setFormError(data.error || "비밀번호 재설정 실패");
                }
              } catch {
                setFormError("네트워크 오류");
              } finally {
                setLoading(false);
              }
            }}
          >
            비밀번호를 잊으셨나요?
          </button>
        </div>
      )}

      {resetSent && (
        <div className="text-sm text-center" style={{ color: "var(--success)" }}>
          비밀번호 재설정 링크가 이메일로 전송되었습니다. 이메일을 확인해주세요.
        </div>
      )}

      {formError && (
        <div className="text-sm text-center" style={{ color: "var(--danger)" }}>{formError}</div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        <span className="text-xs" style={{ color: "var(--fg-muted)" }}>또는</span>
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      </div>

      {/* Social Login */}
      <div className="flex flex-col gap-3">
        <a
          href={kakaoHref}
          className="flex items-center justify-center gap-3 rounded-xl px-5 py-3 font-semibold text-sm text-[#191919] transition-colors hover:opacity-90"
          style={{ backgroundColor: "#FEE500" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 3C6.48 3 2 6.58 2 10.9c0 2.78 1.8 5.22 4.52 6.6-.2.74-.72 2.68-.82 3.1-.13.52.19.51.4.37.16-.11 2.56-1.74 3.6-2.44.74.11 1.52.17 2.3.17 5.52 0 10-3.58 10-7.9S17.52 3 12 3z" fill="#191919"/>
          </svg>
          카카오로 시작하기
        </a>
        <a
          href={naverHref}
          className="flex items-center justify-center gap-3 rounded-xl px-5 py-3 font-semibold text-sm text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: "#03C75A" }}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M13.56 10.7 6.16 0H0v20h6.44V9.3L13.84 20H20V0h-6.44v10.7z" fill="#fff"/>
          </svg>
          네이버로 시작하기
        </a>
      </div>

      {oauthError && (
        <div className="card text-sm" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>
          {oauthError}
        </div>
      )}

      <p className="text-center text-xs" style={{ color: "var(--fg-muted)" }}>
        로그인하면{" "}
        <a href="/terms" style={{ color: "var(--accent)" }}>이용약관</a> 및{" "}
        <a href="/privacy" style={{ color: "var(--accent)" }}>개인정보처리방침</a>에 동의합니다
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <a href="/" className="text-2xl font-bold" style={{ color: "var(--accent)" }}>
            클립AI
          </a>
          <h1 className="text-xl font-semibold mt-4">시작하기</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--fg-muted)" }}>
            영상 렌더링 기능을 이용하려면 로그인이 필요합니다
          </p>
        </div>

        <Suspense>
          <LoginContent />
        </Suspense>
      </div>
    </main>
  );
}
