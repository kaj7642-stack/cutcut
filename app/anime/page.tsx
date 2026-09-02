"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  description: string;
  style_mode: "2d" | "3d";
  aspect_ratio: "9:16" | "16:9";
  created_at: string;
  updated_at: string;
}

export default function AnimeProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    style_mode: "2d" as "2d" | "3d",
    aspect_ratio: "16:9" as "9:16" | "16:9",
  });

  const load = useCallback(async () => {
    const res = await fetch("/api/anime/projects");
    const data = await res.json();
    setProjects(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.name.trim()) return;
    await fetch("/api/anime/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", description: "", style_mode: "2d", aspect_ratio: "16:9" });
    setShowCreate(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("이 프로젝트를 삭제할까요?")) return;
    await fetch(`/api/anime/projects/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">AI 애니메이션 프로젝트</h1>
          <p className="text-[var(--fg-muted)] mt-1">스크립트 → AI 이미지/영상 → TTS → 최종 영상 자동 생성</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="btn-primary flex items-center gap-2"
        >
          <span className="text-xl">+</span> 새 프로젝트
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card mb-6 animate-in">
          <h2 className="text-lg font-semibold mb-4">새 프로젝트 만들기</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--fg-muted)] mb-1">프로젝트명</label>
              <input
                className="w-full rounded-lg bg-[var(--bg)] border border-[var(--border)] px-3 py-2 text-[var(--fg)] focus:border-[var(--accent)] focus:outline-none"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="예: 나의 첫 애니메이션"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--fg-muted)] mb-1">설명</label>
              <input
                className="w-full rounded-lg bg-[var(--bg)] border border-[var(--border)] px-3 py-2 text-[var(--fg)] focus:border-[var(--accent)] focus:outline-none"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="프로젝트 간단 설명"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--fg-muted)] mb-1">스타일 모드</label>
              <div className="flex gap-3">
                {(["2d", "3d"] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setForm(f => ({ ...f, style_mode: mode }))}
                    className={`flex-1 rounded-lg border px-4 py-3 text-center transition-all ${
                      form.style_mode === mode
                        ? "border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent)]"
                        : "border-[var(--border)] hover:border-[var(--border-hover)]"
                    }`}
                  >
                    {mode === "2d" ? "🎨 2D 애니" : "🧊 3D 렌더"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-[var(--fg-muted)] mb-1">화면 비율</label>
              <div className="flex gap-3">
                {(["16:9", "9:16"] as const).map(ar => (
                  <button
                    key={ar}
                    onClick={() => setForm(f => ({ ...f, aspect_ratio: ar }))}
                    className={`flex-1 rounded-lg border px-4 py-3 text-center transition-all ${
                      form.aspect_ratio === ar
                        ? "border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent)]"
                        : "border-[var(--border)] hover:border-[var(--border-hover)]"
                    }`}
                  >
                    {ar === "16:9" ? "📺 롱폼 (16:9)" : "📱 쇼츠 (9:16)"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--border-hover)] transition-colors"
            >
              취소
            </button>
            <button onClick={create} className="btn-primary">
              만들기
            </button>
          </div>
        </div>
      )}

      {/* Project list */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card animate-pulse h-40" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 text-[var(--fg-muted)]">
          <div className="text-6xl mb-4">🎬</div>
          <p className="text-lg">아직 프로젝트가 없습니다</p>
          <p className="mt-1">위의 &ldquo;새 프로젝트&rdquo; 버튼으로 시작해보세요!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <Link
              key={p.id}
              href={`/anime/${p.id}`}
              className="card group cursor-pointer hover:border-[var(--accent)] transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg group-hover:text-[var(--accent)] transition-colors">
                    {p.name}
                  </h3>
                  {p.description && (
                    <p className="text-sm text-[var(--fg-muted)] mt-1 line-clamp-2">{p.description}</p>
                  )}
                </div>
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); remove(p.id); }}
                  className="text-[var(--fg-muted)] hover:text-[var(--danger)] transition-colors ml-2 p-1"
                  title="삭제"
                >
                  ✕
                </button>
              </div>
              <div className="flex gap-2 mt-4">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  p.style_mode === "2d"
                    ? "bg-purple-500/20 text-purple-300"
                    : "bg-blue-500/20 text-blue-300"
                }`}>
                  {p.style_mode === "2d" ? "🎨 2D 애니" : "🧊 3D 렌더"}
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-[var(--bg)] text-[var(--fg-muted)]">
                  {p.aspect_ratio === "16:9" ? "📺 16:9" : "📱 9:16"}
                </span>
              </div>
              <p className="text-xs text-[var(--fg-muted)] mt-3">
                {new Date(p.updated_at).toLocaleDateString("ko-KR")} 수정
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
