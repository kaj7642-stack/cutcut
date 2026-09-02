"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Project { id: string; name: string; description: string; style_mode: string; default_aspect_ratio: string; }
interface Episode { id: string; title: string; description: string; status: string; created_at: string; }

export default function ProjectDashboardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEpModal, setShowEpModal] = useState(false);
  const [epForm, setEpForm] = useState({ title: "", description: "" });

  const load = useCallback(async () => {
    const [pRes, eRes] = await Promise.all([
      fetch(`/api/animate/projects/${projectId}`),
      fetch(`/api/animate/episodes?projectId=${projectId}`),
    ]);
    if (!pRes.ok) { router.push("/animate"); return; }
    setProject(await pRes.json());
    setEpisodes(await eRes.json());
    setLoading(false);
  }, [projectId, router]);

  useEffect(() => { load(); }, [load]);

  const createEpisode = async () => {
    if (!epForm.title.trim()) return;
    const res = await fetch("/api/animate/episodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, title: epForm.title, description: epForm.description }),
    });
    const ep = await res.json();
    setShowEpModal(false);
    setEpForm({ title: "", description: "" });
    router.push(`/animate/${projectId}/episode/${ep.id}/script`);
  };

  const deleteEpisode = async (id: string) => {
    if (!confirm("에피소드를 삭제하시겠습니까?")) return;
    await fetch(`/api/animate/episodes/${id}`, { method: "DELETE" });
    load();
  };

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    draft: { label: "초안", color: "var(--fg-muted)" },
    scripted: { label: "대본 완료", color: "var(--accent)" },
    generating: { label: "생성 중", color: "var(--warning)" },
    generated: { label: "생성 완료", color: "var(--success)" },
    rendering: { label: "렌더링 중", color: "var(--warning)" },
    completed: { label: "완성", color: "var(--success)" },
  };

  if (loading) return <div className="card animate-pulse" style={{ height: 300 }} />;

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Link href="/animate" className="text-sm" style={{ color: "var(--fg-muted)" }}>← 프로젝트</Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{project?.name}</h1>
          {project?.description && <p className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>{project.description}</p>}
        </div>
        <div className="flex gap-2">
          <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: project?.style_mode === "2d" ? "rgba(108,92,231,0.2)" : "rgba(0,214,143,0.2)", color: project?.style_mode === "2d" ? "var(--accent)" : "var(--success)" }}>
            {project?.style_mode === "2d" ? "2D 애니" : "3D CG"}
          </span>
          <span className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--bg-card)", color: "var(--fg-muted)", border: "1px solid var(--border)" }}>
            {project?.default_aspect_ratio}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">캐릭터</h2>
            </div>
            <Link
              href={`/animate/${projectId}/characters`}
              className="block text-center py-6 rounded-lg transition-colors"
              style={{ border: "2px dashed var(--border)", color: "var(--fg-muted)" }}
            >
              <div className="text-2xl mb-1">👥</div>
              <div className="text-sm font-medium">캐릭터 관리</div>
            </Link>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">에피소드</h2>
            <button className="btn-primary text-sm" onClick={() => setShowEpModal(true)}>+ 새 에피소드</button>
          </div>

          {episodes.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-3xl mb-3">📝</div>
              <p className="font-medium mb-1">에피소드를 만들어보세요</p>
              <p className="text-sm mb-4" style={{ color: "var(--fg-muted)" }}>대본을 입력하고 AI로 씬을 생성합니다</p>
              <button className="btn-primary text-sm" onClick={() => setShowEpModal(true)}>첫 에피소드 만들기</button>
            </div>
          ) : (
            <div className="grid gap-3">
              {episodes.map(ep => {
                const st = STATUS_LABELS[ep.status] || STATUS_LABELS.draft;
                return (
                  <Link key={ep.id} href={`/animate/${projectId}/episode/${ep.id}/script`} className="card group flex items-center justify-between hover:scale-[1.01] transition-transform">
                    <div>
                      <h3 className="font-medium">{ep.title}</h3>
                      {ep.description && <p className="text-sm mt-0.5" style={{ color: "var(--fg-muted)" }}>{ep.description}</p>}
                      <span className="text-xs mt-1 inline-block" style={{ color: "var(--fg-muted)" }}>
                        {new Date(ep.created_at).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ color: st.color, border: `1px solid ${st.color}` }}>
                        {st.label}
                      </span>
                      <button
                        className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: "var(--danger)" }}
                        onClick={(e) => { e.preventDefault(); deleteEpisode(ep.id); }}
                      >
                        삭제
                      </button>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showEpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setShowEpModal(false)}>
          <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">새 에피소드</h2>
            <label className="block mb-3">
              <span className="text-sm font-medium mb-1 block">제목 *</span>
              <input
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg)" }}
                value={epForm.title}
                onChange={e => setEpForm(f => ({ ...f, title: e.target.value }))}
                placeholder="예: EP01 - 첫 만남"
                autoFocus
              />
            </label>
            <label className="block mb-4">
              <span className="text-sm font-medium mb-1 block">설명</span>
              <input
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg)" }}
                value={epForm.description}
                onChange={e => setEpForm(f => ({ ...f, description: e.target.value }))}
                placeholder="간단한 설명 (선택)"
              />
            </label>
            <div className="flex gap-2 justify-end">
              <button className="btn-ghost text-sm" onClick={() => setShowEpModal(false)}>취소</button>
              <button className="btn-primary text-sm" onClick={createEpisode} disabled={!epForm.title.trim()}>만들기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
