"use client";

import { useState, useEffect } from "react";
import { PLANS } from "@/lib/plans";
import { ThemeToggle } from "@/components/theme-toggle";

interface UserInfo {
  id: number;
  email: string;
  nickname: string | null;
  createdAt: string;
  loginMethods: string[];
}

interface UsageEntry {
  action: string;
  createdAt: string;
}

interface PaymentEntry {
  planId: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface RenderEntry {
  id: number;
  filename: string;
  mode: string;
  quality: string;
  clipsCount: number;
  totalDuration: number;
  createdAt: string;
}

interface MyPageData {
  user: UserInfo;
  credits: number;
  totalRenders: number;
  recentUsage: UsageEntry[];
  payments: PaymentEntry[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${formatDate(iso)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function actionLabel(action: string): string {
  if (action === "render") return "영상 렌더링";
  if (action.startsWith("payment:")) {
    const parts = action.split(":");
    const plan = PLANS.find((p) => p.id === parts[1]);
    return `결제 — ${plan?.name ?? parts[1]}`;
  }
  return action;
}

function methodLabel(method: string): string {
  if (method === "kakao") return "카카오";
  if (method === "naver") return "네이버";
  if (method === "email") return "이메일";
  return method;
}

export default function MyPage() {
  const [data, setData] = useState<MyPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingNick, setEditingNick] = useState(false);
  const [nickInput, setNickInput] = useState("");
  const [nickSaving, setNickSaving] = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [renders, setRenders] = useState<RenderEntry[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/mypage").then((r) => {
        if (!r.ok) {
          window.location.href = "/login?redirect=/mypage";
          throw new Error("Unauthorized");
        }
        return r.json();
      }),
      fetch("/api/renders").then((r) => r.ok ? r.json() : { renders: [] }),
    ])
      .then(([pageData, renderData]) => {
        setData(pageData);
        setRenders(renderData.renders || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-lg animate-pulse" style={{ color: "var(--fg-muted)" }}>불러오는 중...</div>
      </main>
    );
  }

  if (!data) return null;

  const { user, credits, totalRenders, recentUsage, payments } = data;

  return (
    <main className="min-h-screen px-4 py-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <a href="/" className="text-xl font-bold" style={{ color: "var(--accent)" }}>
          클립AI
        </a>
        <div className="flex gap-2">
          <ThemeToggle />
          <a
            href="/studio"
            className="text-sm px-3 py-1.5 rounded-lg"
            style={{ border: "1px solid var(--border)", color: "var(--fg-muted)" }}
          >
            스튜디오
          </a>
          <button
            className="text-sm px-3 py-1.5 rounded-lg"
            style={{ border: "1px solid var(--border)", color: "var(--fg-muted)" }}
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/";
            }}
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            {editingNick ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nickInput}
                  onChange={(e) => setNickInput(e.target.value)}
                  maxLength={20}
                  className="px-3 py-1.5 rounded-lg text-lg font-bold"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg)", width: "180px" }}
                  autoFocus
                />
                <button
                  className="text-xs px-2 py-1 rounded"
                  style={{ background: "var(--accent)", color: "#fff" }}
                  disabled={nickSaving}
                  onClick={async () => {
                    setNickSaving(true);
                    const res = await fetch("/api/mypage/nickname", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ nickname: nickInput }),
                    });
                    if (res.ok) {
                      const d = await res.json();
                      setData((prev) => prev ? { ...prev, user: { ...prev.user, nickname: d.nickname } } : prev);
                    }
                    setEditingNick(false);
                    setNickSaving(false);
                  }}
                >
                  저장
                </button>
                <button
                  className="text-xs px-2 py-1 rounded"
                  style={{ border: "1px solid var(--border)", color: "var(--fg-muted)" }}
                  onClick={() => setEditingNick(false)}
                >
                  취소
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{user.nickname || user.email.split("@")[0]}</h1>
                <button
                  className="text-xs px-2 py-1 rounded"
                  style={{ border: "1px solid var(--border)", color: "var(--fg-muted)" }}
                  onClick={() => { setNickInput(user.nickname || ""); setEditingNick(true); }}
                >
                  수정
                </button>
              </div>
            )}
            <div className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>{user.email}</div>
          </div>
          <div
            className="text-sm px-3 py-1.5 rounded-full"
            style={{ background: "var(--accent-glow)", color: "var(--accent)" }}
          >
            {user.loginMethods.map(methodLabel).join(" + ")}
          </div>
        </div>
        <div className="text-xs" style={{ color: "var(--fg-muted)" }}>
          가입일: {formatDate(user.createdAt)}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card text-center">
          <div className="text-3xl font-bold" style={{ color: "var(--accent)" }}>{credits}</div>
          <div className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>남은 크레딧</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold" style={{ color: "var(--accent)" }}>{totalRenders}</div>
          <div className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>총 렌더링</div>
        </div>
        <div className="card text-center flex flex-col items-center justify-center">
          <a href="/pricing" className="btn-primary text-sm inline-block" style={{ padding: "10px 16px" }}>
            크레딧 충전
          </a>
        </div>
        <div className="card text-center flex flex-col items-center justify-center">
          <a href="/studio" className="btn-ghost text-sm inline-block" style={{ padding: "10px 16px" }}>
            영상 만들기
          </a>
        </div>
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-4">결제 내역</h2>
          <div className="space-y-3">
            {payments.map((p, i) => {
              const plan = PLANS.find((pl) => pl.id === p.planId);
              return (
                <div
                  key={i}
                  className="flex items-center justify-between py-2"
                  style={{ borderBottom: i < payments.length - 1 ? "1px solid var(--border)" : "none" }}
                >
                  <div>
                    <div className="text-sm font-medium">{plan?.name ?? p.planId}</div>
                    <div className="text-xs" style={{ color: "var(--fg-muted)" }}>
                      {formatDateTime(p.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{p.amount.toLocaleString()}원</div>
                    <div
                      className="text-xs"
                      style={{ color: p.status === "PAID" ? "var(--success)" : "var(--fg-muted)" }}
                    >
                      {p.status === "PAID" ? "완료" : p.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Render History */}
      {renders.length > 0 && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-4">렌더링 기록</h2>
          <div className="space-y-3">
            {renders.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between py-2"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{r.filename}</div>
                  <div className="text-xs flex gap-2 mt-0.5" style={{ color: "var(--fg-muted)" }}>
                    <span>{r.mode === "shorts" ? "📱 쇼츠" : "🖥️ 롱폼"}</span>
                    <span>{r.clipsCount}개 클립</span>
                    <span>{Math.round(r.totalDuration)}초</span>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <div className="text-xs" style={{ color: "var(--fg-muted)" }}>
                    {formatDateTime(r.createdAt)}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--accent)" }}>
                    {r.quality === "high" ? "고화질" : r.quality === "medium" ? "중화질" : "저화질"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage History */}
      {recentUsage.length > 0 && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-4">최근 활동</h2>
          <div className="space-y-2">
            {recentUsage.map((u, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1.5 text-sm"
                style={{ borderBottom: i < recentUsage.length - 1 ? "1px solid var(--border)" : "none" }}
              >
                <span>{actionLabel(u.action)}</span>
                <span style={{ color: "var(--fg-muted)" }}>{formatDateTime(u.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account Settings */}
      <div className="card mb-6">
        <h2 className="font-semibold mb-4">계정 설정</h2>

        {/* Password Change */}
        {!showPwForm ? (
          <button
            className="text-sm px-3 py-2 rounded-lg"
            style={{ border: "1px solid var(--border)", color: "var(--fg-muted)" }}
            onClick={() => setShowPwForm(true)}
          >
            {user.loginMethods.includes("email") ? "비밀번호 변경" : "비밀번호 설정"}
          </button>
        ) : (
          <div className="space-y-3 mb-4">
            {user.loginMethods.includes("email") && (
              <input
                type="password"
                placeholder="현재 비밀번호"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg)" }}
              />
            )}
            <input
              type="password"
              placeholder="새 비밀번호 (6자 이상)"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg)" }}
            />
            <div className="flex gap-2">
              <button
                className="text-sm px-3 py-1.5 rounded-lg"
                style={{ background: "var(--accent)", color: "#fff" }}
                disabled={pwSaving || newPw.length < 6}
                onClick={async () => {
                  setPwSaving(true);
                  setPwMsg("");
                  const res = await fetch("/api/auth/password", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
                  });
                  const d = await res.json();
                  if (res.ok) {
                    setPwMsg("비밀번호가 변경되었습니다.");
                    setCurrentPw("");
                    setNewPw("");
                    setShowPwForm(false);
                    if (!user.loginMethods.includes("email")) {
                      setData((prev) => prev ? { ...prev, user: { ...prev.user, loginMethods: [...prev.user.loginMethods, "email"] } } : prev);
                    }
                  } else {
                    setPwMsg(d.error || "변경 실패");
                  }
                  setPwSaving(false);
                }}
              >
                저장
              </button>
              <button
                className="text-sm px-3 py-1.5 rounded-lg"
                style={{ border: "1px solid var(--border)", color: "var(--fg-muted)" }}
                onClick={() => { setShowPwForm(false); setPwMsg(""); }}
              >
                취소
              </button>
            </div>
            {pwMsg && <div className="text-sm" style={{ color: pwMsg.includes("변경") ? "var(--success)" : "var(--danger)" }}>{pwMsg}</div>}
          </div>
        )}

        {/* Account Delete */}
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          {!showDeleteConfirm ? (
            <button
              className="text-sm"
              style={{ color: "var(--danger)" }}
              onClick={() => setShowDeleteConfirm(true)}
            >
              계정 삭제
            </button>
          ) : (
            <div className="space-y-3">
              <div className="text-sm" style={{ color: "var(--danger)" }}>
                계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
              </div>
              <div className="text-sm" style={{ color: "var(--fg-muted)" }}>
                확인하려면 아래에 <strong>DELETE</strong>를 입력하세요.
              </div>
              <input
                type="text"
                placeholder="DELETE"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--bg)", border: "1px solid var(--danger)", color: "var(--fg)" }}
              />
              <div className="flex gap-2">
                <button
                  className="text-sm px-3 py-1.5 rounded-lg"
                  style={{ background: "var(--danger)", color: "#fff" }}
                  disabled={deleteInput !== "DELETE" || deleting}
                  onClick={async () => {
                    setDeleting(true);
                    const res = await fetch("/api/auth/delete-account", {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ confirm: "DELETE" }),
                    });
                    if (res.ok) {
                      window.location.href = "/?deleted=1";
                    } else {
                      setDeleting(false);
                    }
                  }}
                >
                  {deleting ? "삭제 중..." : "계정 영구 삭제"}
                </button>
                <button
                  className="text-sm px-3 py-1.5 rounded-lg"
                  style={{ border: "1px solid var(--border)", color: "var(--fg-muted)" }}
                  onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); }}
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm" style={{ color: "var(--fg-muted)" }}>
        <a href="/studio" style={{ color: "var(--accent)" }}>스튜디오로 돌아가기</a>
      </div>
    </main>
  );
}
