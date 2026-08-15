"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PLANS } from "@/lib/plans";

interface Stats {
  users: { total: number; today: number };
  renders: { total: number; today: number };
  revenue: { total: number; today: number };
  creditsOutstanding: number;
  recentUsers: { id: number; email: string; nickname: string | null; createdAt: string }[];
  recentPayments: { paymentId: string; userId: number; planId: string; amount: number; status: string; createdAt: string }[];
  dailyRenders: { day: string; count: number }[];
}

interface AdminUser {
  id: number;
  email: string;
  nickname: string | null;
  createdAt: string;
  credits: number;
  renders: number;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${formatDate(iso)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cleanupMsg, setCleanupMsg] = useState("");
  const [cleaning, setCleaning] = useState(false);

  const [tab, setTab] = useState<"dashboard" | "users" | "analytics">("dashboard");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [userPages, setUserPages] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
  const [grantUserId, setGrantUserId] = useState<number | null>(null);
  const [grantAmount, setGrantAmount] = useState("");
  const [granting, setGranting] = useState(false);

  const [analyticsData, setAnalyticsData] = useState<{ events: { event: string; count: number }[]; daily: { day: string; count: number }[] } | null>(null);
  const [analyticsDays, setAnalyticsDays] = useState(7);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const fetchUsers = useCallback(async (q: string, page: number) => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setUsers(data.users);
      setUserPages(data.pages);
      setUserTotal(data.total);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async (days: number) => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?days=${days}`);
      if (res.ok) setAnalyticsData(await res.json());
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "users") fetchUsers(userSearch, userPage);
    if (tab === "analytics") fetchAnalytics(analyticsDays);
  }, [tab, userPage, analyticsDays]);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => {
        if (r.status === 403) {
          setError("관리자 권한이 필요합니다.");
          throw new Error("Forbidden");
        }
        if (r.status === 401) {
          window.location.href = "/login?redirect=/admin";
          throw new Error("Unauthorized");
        }
        return r.json();
      })
      .then(setStats)
      .catch((e) => { if (!error) setError(e.message); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse" style={{ color: "var(--fg-muted)" }}>불러오는 중...</div>
      </main>
    );
  }

  if (error || !stats) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="card text-center max-w-sm">
          <div className="text-3xl mb-4">🔒</div>
          <div className="font-semibold mb-2">{error || "데이터를 불러올 수 없습니다."}</div>
          <Link href="/" className="text-sm" style={{ color: "var(--accent)" }}>홈으로 돌아가기</Link>
        </div>
      </main>
    );
  }

  const maxRender = Math.max(...stats.dailyRenders.map((d) => d.count), 1);

  return (
    <main className="min-h-screen px-4 pb-8 max-w-5xl mx-auto">
      {/* Sticky Glass Header */}
      <nav className="sticky top-0 z-40 flex items-center justify-between py-4 mb-6 -mx-4 px-4" style={{ background: "var(--bg-glass)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xl font-bold" style={{ color: "var(--accent)" }}>
            클립AI
          </Link>
          <span className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>
            관리자
          </span>
        </div>
        <Link href="/studio" className="text-sm" style={{ color: "var(--fg-muted)", border: "1px solid var(--border)", padding: "6px 12px", borderRadius: "8px" }}>
          스튜디오
        </Link>
      </nav>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 p-1 rounded-xl" style={{ background: "var(--bg-card)" }}>
        {(["dashboard", "users", "analytics"] as const).map((t) => (
          <button
            key={t}
            className="flex-1 text-sm py-2 rounded-lg font-medium transition-colors"
            style={{
              background: tab === t ? "var(--accent)" : "transparent",
              color: tab === t ? "#fff" : "var(--fg-muted)",
            }}
            onClick={() => setTab(t)}
          >
            {t === "dashboard" ? "대시보드" : t === "users" ? "사용자 관리" : "이벤트 분석"}
          </button>
        ))}
      </div>

      {tab === "analytics" && (
        <div>
          {/* Period selector */}
          <div className="flex gap-2 mb-6">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                className="text-sm px-3 py-1.5 rounded-lg"
                style={{
                  background: analyticsDays === d ? "var(--accent)" : "transparent",
                  color: analyticsDays === d ? "#fff" : "var(--fg-muted)",
                  border: analyticsDays === d ? "none" : "1px solid var(--border)",
                }}
                onClick={() => setAnalyticsDays(d)}
              >
                {d}일
              </button>
            ))}
          </div>

          {analyticsLoading ? (
            <div className="text-center py-12 animate-pulse" style={{ color: "var(--fg-muted)" }}>불러오는 중...</div>
          ) : !analyticsData || analyticsData.events.length === 0 ? (
            <div className="card text-center py-8" style={{ color: "var(--fg-muted)" }}>아직 수집된 이벤트가 없습니다.</div>
          ) : (
            <>
              {/* Daily event chart */}
              {analyticsData.daily.length > 0 && (
                <div className="card mb-6">
                  <h2 className="font-semibold mb-4">일별 이벤트 수</h2>
                  <div className="flex items-end gap-1" style={{ height: "100px" }}>
                    {(() => {
                      const sorted = [...analyticsData.daily].sort((a, b) => a.day.localeCompare(b.day));
                      const max = Math.max(...sorted.map((d) => d.count), 1);
                      return sorted.map((d) => (
                        <div key={d.day} className="flex-1 flex flex-col items-center justify-end h-full">
                          <div
                            className="w-full rounded-t"
                            style={{
                              background: "var(--accent)",
                              height: `${Math.max((d.count / max) * 100, 4)}%`,
                              minHeight: "2px",
                            }}
                            title={`${d.day}: ${d.count}건`}
                          />
                        </div>
                      ));
                    })()}
                  </div>
                  {analyticsData.daily.length >= 2 && (
                    <div className="flex justify-between mt-2 text-xs" style={{ color: "var(--fg-muted)" }}>
                      <span>{formatDate(analyticsData.daily[analyticsData.daily.length - 1].day)}</span>
                      <span>{formatDate(analyticsData.daily[0].day)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Event counts table */}
              <div className="card">
                <h2 className="font-semibold mb-4">이벤트별 횟수 (최근 {analyticsDays}일)</h2>
                <div className="space-y-2">
                  {analyticsData.events.map((e) => {
                    const maxCount = analyticsData.events[0]?.count || 1;
                    return (
                      <div key={e.event} className="flex items-center gap-3">
                        <div className="w-32 text-sm font-medium truncate" title={e.event}>{e.event}</div>
                        <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ background: "var(--bg)" }}>
                          <div
                            className="h-full rounded-md"
                            style={{
                              width: `${Math.max((e.count / maxCount) * 100, 2)}%`,
                              background: "var(--accent)",
                              opacity: 0.8,
                            }}
                          />
                        </div>
                        <div className="w-12 text-right text-sm font-semibold" style={{ color: "var(--accent)" }}>{e.count}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "users" && (
        <div>
          {/* Search */}
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="이메일 또는 닉네임 검색..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setUserPage(1); fetchUsers(userSearch, 1); } }}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--fg)" }}
            />
            <button
              className="px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: "var(--accent)", color: "#fff" }}
              onClick={() => { setUserPage(1); fetchUsers(userSearch, 1); }}
            >
              검색
            </button>
          </div>

          {/* Total count */}
          <div className="text-sm mb-4" style={{ color: "var(--fg-muted)" }}>
            총 {userTotal}명{userSearch && ` ("${userSearch}" 검색 결과)`}
          </div>

          {/* User list */}
          {usersLoading ? (
            <div className="text-center py-12 animate-pulse" style={{ color: "var(--fg-muted)" }}>불러오는 중...</div>
          ) : users.length === 0 ? (
            <div className="card text-center py-8" style={{ color: "var(--fg-muted)" }}>검색 결과가 없습니다.</div>
          ) : (
            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.id} className="card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{u.nickname || u.email.split("@")[0]}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--bg)", color: "var(--fg-muted)" }}>
                          #{u.id}
                        </span>
                      </div>
                      <div className="text-sm mt-0.5" style={{ color: "var(--fg-muted)" }}>{u.email}</div>
                      <div className="flex gap-4 mt-2 text-xs" style={{ color: "var(--fg-muted)" }}>
                        <span>크레딧: <strong style={{ color: "var(--accent)" }}>{u.credits}</strong></span>
                        <span>렌더링: <strong style={{ color: "var(--accent)" }}>{u.renders}</strong></span>
                        <span>가입: {formatDate(u.createdAt)}</span>
                      </div>
                    </div>
                    <button
                      className="text-xs px-3 py-1.5 rounded-lg shrink-0"
                      style={{ border: "1px solid var(--accent)", color: "var(--accent)" }}
                      onClick={() => setGrantUserId(grantUserId === u.id ? null : u.id)}
                    >
                      크레딧 부여
                    </button>
                  </div>

                  {grantUserId === u.id && (
                    <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                      <input
                        type="number"
                        min="1"
                        placeholder="수량"
                        value={grantAmount}
                        onChange={(e) => setGrantAmount(e.target.value)}
                        className="w-24 px-3 py-1.5 rounded-lg text-sm"
                        style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg)" }}
                      />
                      <button
                        className="text-sm px-3 py-1.5 rounded-lg font-medium"
                        style={{ background: "var(--accent)", color: "#fff" }}
                        disabled={granting || !grantAmount || parseInt(grantAmount) <= 0}
                        onClick={async () => {
                          setGranting(true);
                          const res = await fetch("/api/admin/users", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ userId: u.id, credits: parseInt(grantAmount) }),
                          });
                          if (res.ok) {
                            setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, credits: x.credits + parseInt(grantAmount) } : x));
                            setGrantUserId(null);
                            setGrantAmount("");
                          }
                          setGranting(false);
                        }}
                      >
                        {granting ? "처리 중..." : "부여"}
                      </button>
                      <button
                        className="text-sm px-3 py-1.5 rounded-lg"
                        style={{ border: "1px solid var(--border)", color: "var(--fg-muted)" }}
                        onClick={() => { setGrantUserId(null); setGrantAmount(""); }}
                      >
                        취소
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {userPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                className="text-sm px-3 py-1.5 rounded-lg"
                style={{ border: "1px solid var(--border)", color: "var(--fg-muted)" }}
                disabled={userPage <= 1}
                onClick={() => setUserPage((p) => p - 1)}
              >
                이전
              </button>
              <span className="text-sm" style={{ color: "var(--fg-muted)" }}>
                {userPage} / {userPages}
              </span>
              <button
                className="text-sm px-3 py-1.5 rounded-lg"
                style={{ border: "1px solid var(--border)", color: "var(--fg-muted)" }}
                disabled={userPage >= userPages}
                onClick={() => setUserPage((p) => p + 1)}
              >
                다음
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "dashboard" && <>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="card text-center">
          <div className="text-sm mb-1" style={{ color: "var(--fg-muted)" }}>총 사용자</div>
          <div className="text-3xl font-bold" style={{ color: "var(--accent)" }}>{stats.users.total}</div>
          {stats.users.today > 0 && (
            <div className="text-xs mt-1" style={{ color: "var(--success)" }}>+{stats.users.today} 오늘</div>
          )}
        </div>
        <div className="card text-center">
          <div className="text-sm mb-1" style={{ color: "var(--fg-muted)" }}>총 렌더링</div>
          <div className="text-3xl font-bold" style={{ color: "var(--accent)" }}>{stats.renders.total}</div>
          {stats.renders.today > 0 && (
            <div className="text-xs mt-1" style={{ color: "var(--success)" }}>+{stats.renders.today} 오늘</div>
          )}
        </div>
        <div className="card text-center">
          <div className="text-sm mb-1" style={{ color: "var(--fg-muted)" }}>총 매출</div>
          <div className="text-3xl font-bold" style={{ color: "var(--accent)" }}>{stats.revenue.total.toLocaleString()}<span className="text-sm">원</span></div>
          {stats.revenue.today > 0 && (
            <div className="text-xs mt-1" style={{ color: "var(--success)" }}>+{stats.revenue.today.toLocaleString()}원 오늘</div>
          )}
        </div>
        <div className="card text-center">
          <div className="text-sm mb-1" style={{ color: "var(--fg-muted)" }}>미사용 크레딧</div>
          <div className="text-3xl font-bold" style={{ color: "var(--warning)" }}>{stats.creditsOutstanding}</div>
          <div className="text-xs mt-1" style={{ color: "var(--fg-muted)" }}>잔여 부채</div>
        </div>
      </div>

      {/* Daily Renders Chart */}
      {stats.dailyRenders.length > 0 && (
        <div className="card mb-8">
          <h2 className="font-semibold mb-4">일별 렌더링 (최근 30일)</h2>
          <div className="flex items-end gap-1" style={{ height: "120px" }}>
            {stats.dailyRenders.slice().reverse().map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center justify-end h-full">
                <div
                  className="w-full rounded-t"
                  style={{
                    background: "var(--accent)",
                    height: `${Math.max((d.count / maxRender) * 100, 4)}%`,
                    minHeight: "2px",
                    opacity: d.count > 0 ? 1 : 0.2,
                  }}
                  title={`${d.day}: ${d.count}건`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs" style={{ color: "var(--fg-muted)" }}>
            <span>{stats.dailyRenders.length > 0 ? formatDate(stats.dailyRenders[stats.dailyRenders.length - 1].day) : ""}</span>
            <span>{stats.dailyRenders.length > 0 ? formatDate(stats.dailyRenders[0].day) : ""}</span>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="card">
          <h2 className="font-semibold mb-4">최근 가입 사용자</h2>
          <div className="space-y-2">
            {stats.recentUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between py-1.5 text-sm"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div>
                  <span className="font-medium">{u.nickname || u.email.split("@")[0]}</span>
                  <span className="ml-2 text-xs" style={{ color: "var(--fg-muted)" }}>{u.email}</span>
                </div>
                <span className="text-xs" style={{ color: "var(--fg-muted)" }}>{formatDate(u.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="card">
          <h2 className="font-semibold mb-4">최근 결제</h2>
          {stats.recentPayments.length === 0 ? (
            <div className="text-sm" style={{ color: "var(--fg-muted)" }}>결제 내역이 없습니다.</div>
          ) : (
            <div className="space-y-2">
              {stats.recentPayments.map((p) => {
                const plan = PLANS.find((pl) => pl.id === p.planId);
                return (
                  <div
                    key={p.paymentId}
                    className="flex items-center justify-between py-1.5 text-sm"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <div>
                      <span className="font-medium">{plan?.name ?? p.planId}</span>
                      <span className="ml-2 text-xs" style={{ color: "var(--fg-muted)" }}>User #{p.userId}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{p.amount.toLocaleString()}원</div>
                      <div className="text-xs" style={{ color: p.status === "PAID" ? "var(--success)" : "var(--fg-muted)" }}>
                        {formatDateTime(p.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tools */}
      <div className="card mt-6">
        <h2 className="font-semibold mb-4">관리 도구</h2>
        <div className="flex items-center gap-3">
          <button
            className="text-sm px-4 py-2 rounded-lg"
            style={{ border: "1px solid var(--border)", color: "var(--fg-muted)" }}
            disabled={cleaning}
            onClick={async () => {
              setCleaning(true);
              setCleanupMsg("");
              const res = await fetch("/api/admin/cleanup", { method: "POST" });
              const d = await res.json();
              setCleanupMsg(`${d.cleaned}개 프로젝트 삭제 (${d.freedMB}MB 해제), 남은 프로젝트: ${d.remaining}개`);
              setCleaning(false);
            }}
          >
            {cleaning ? "정리 중..." : "오래된 파일 정리 (24시간+)"}
          </button>
          {cleanupMsg && (
            <span className="text-sm" style={{ color: "var(--success)" }}>{cleanupMsg}</span>
          )}
        </div>
      </div>
      </>
      }
    </main>
  );
}
