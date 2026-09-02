"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  description: string;
  style_mode: string;
  default_aspect_ratio: string;
  created_at: string;
  updated_at: string;
}

export default function AnimateProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", style_mode: "2d" as "2d" | "3d", default_aspect_ratio: "16:9" as "16:9" | "9:16" });

  const load = useCallback(async () => {
    const res = await fetch("/api/animate/projects");
    setProjects(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    await fetch("/api/animate/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowModal(false);
    setForm({ name: "", description: "", style_mode: "2d", default_aspect_ratio: "16:9" });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("프로젝트를 삭제하시겠습니까? 모든 캐릭터, 에피소드, 씬 데이터가 삭제됩니다.")) return;
    await fetch(`/api/animate/projects/${id}`, { method: "DELETE" });
    load();
  };

  if (loading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="card animate-pulse" style={{ height: 180 }} />
      ))}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">내 프로젝트</h1>
        <button className="btn-primary text-sm" onClick={() => setShowModal(true)}>+ 새 프로젝트</button>
      </div>

      {projects.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-4xl mb-4">🎬</div>
          <p className="text-lg font-medium mb-2">아직 프로젝트가 없습니다</p>
          <p style={{ color: "var(--fg-muted)" }} className="mb-4">새 프로젝트를 만들어 AI 애니메이션을 시작하세요</p>
          <button className="btn-primary" onClick={() => setShowModal(true)}>첫 프로젝트 만들기</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <Link key={p.id} href={`/animate/${p.id}`} className="card group cursor-pointer hover:scale-[1.02] transition-transform">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-lg">{p.name}</h3>
                <div className="flex gap-1.5">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: p.style_mode === "2d" ? "rgba(108,92,231,0.2)" : "rgba(0,214,143,0.2)", color: p.style_mode === "2d" ? "var(--accent)" : "var(--success)" }}
                  >
                    {p.style_mode === "2d" ? "2D 애니" : "3D CG"}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--bg)", color: "var(--fg-muted)" }}>
                    {p.default_aspect_ratio}
                  </span>
                </div>
              </div>
              {p.description && <p className="text-sm mb-3 line-clamp-2" style={{ color: "var(--fg-muted)" }}>{p.description}</p>}
              <div className="flex items-center justify-between mt-auto pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
                  {new Date(p.updated_at).toLocaleDateString("ko-KR")}
                </span>
                <button
                  className="text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--danger)" }}
                  onClick={(e) => { e.preventDefault(); handleDelete(p.id); }}
                >
                  삭제
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setShowModal(false)}>
          <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">새 프로젝트</h2>

            <label className="block mb-3">
              <span className="text-sm font-medium mb-1 block">프로젝트 이름 *</span>
              <input
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg)" }}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="예: 나의 첫 애니메이션"
                autoFocus
              />
            </label>

            <label className="block mb-3">
              <span className="text-sm font-medium mb-1 block">설명</span>
              <textarea
                className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg)" }}
                rows={2}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="프로젝트 설명 (선택사항)"
              />
            </label>

            <div className="mb-3">
              <span className="text-sm font-medium mb-2 block">스타일</span>
              <div className="grid grid-cols-2 gap-2">
                {(["2d", "3d"] as const).map(m => (
                  <button
                    key={m}
                    className="px-3 py-3 rounded-lg text-sm font-medium transition-all text-left"
                    style={{
                      border: `2px solid ${form.style_mode === m ? "var(--accent)" : "var(--border)"}`,
                      background: form.style_mode === m ? "var(--accent-glow)" : "var(--bg)",
                    }}
                    onClick={() => setForm(f => ({ ...f, style_mode: m }))}
                  >
                    <div className="font-semibold">{m === "2d" ? "🎨 2D 애니메이션" : "💎 3D CG"}</div>
                    <div className="text-xs mt-1" style={{ color: "var(--fg-muted)" }}>
                      {m === "2d" ? "일본풍 셀 셰이딩" : "3D 렌더 스타일"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <span className="text-sm font-medium mb-2 block">화면 비율</span>
              <div className="grid grid-cols-2 gap-2">
                {(["16:9", "9:16"] as const).map(r => (
                  <button
                    key={r}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      border: `2px solid ${form.default_aspect_ratio === r ? "var(--accent)" : "var(--border)"}`,
                      background: form.default_aspect_ratio === r ? "var(--accent-glow)" : "var(--bg)",
                    }}
                    onClick={() => setForm(f => ({ ...f, default_aspect_ratio: r }))}
                  >
                    {r === "16:9" ? "📺 가로형 (16:9)" : "📱 세로형 (9:16)"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button className="btn-ghost text-sm" onClick={() => setShowModal(false)}>취소</button>
              <button className="btn-primary text-sm" onClick={handleCreate} disabled={!form.name.trim()}>만들기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
