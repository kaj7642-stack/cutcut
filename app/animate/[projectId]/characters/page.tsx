"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Character {
  id: string; project_id: string; name: string; description: string;
  style_prompt: string; voice_preset: string; seed_value: number | null;
  reference_images: string[]; created_at: string;
}

export default function CharactersPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [chars, setChars] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editChar, setEditChar] = useState<Character | null>(null);
  const [form, setForm] = useState({ name: "", description: "", style_prompt: "", voice_preset: "", seed_value: "" });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/animate/characters?projectId=${projectId}`);
    setChars(await res.json());
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditChar(null);
    setForm({ name: "", description: "", style_prompt: "", voice_preset: "", seed_value: "" });
    setShowModal(true);
  };

  const openEdit = (c: Character) => {
    setEditChar(c);
    setForm({ name: c.name, description: c.description, style_prompt: c.style_prompt, voice_preset: c.voice_preset, seed_value: c.seed_value?.toString() ?? "" });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const payload = { ...form, seed_value: form.seed_value ? parseInt(form.seed_value) : null, project_id: projectId };
    if (editChar) {
      await fetch(`/api/animate/characters/${editChar.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      await fetch("/api/animate/characters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    setShowModal(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("캐릭터를 삭제하시겠습니까?")) return;
    await fetch(`/api/animate/characters/${id}`, { method: "DELETE" });
    load();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !uploadTarget) return;
    const fd = new FormData();
    fd.append("file", e.target.files[0]);
    await fetch(`/api/animate/characters/${uploadTarget}/reference`, { method: "POST", body: fd });
    e.target.value = "";
    setUploadTarget(null);
    load();
  };

  if (loading) return <div className="card animate-pulse" style={{ height: 400 }} />;

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Link href={`/animate/${projectId}`} className="text-sm" style={{ color: "var(--fg-muted)" }}>← 프로젝트</Link>
      </div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">캐릭터 라이브러리</h1>
        <button className="btn-primary text-sm" onClick={openCreate}>+ 새 캐릭터</button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      {chars.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-4xl mb-4">👤</div>
          <p className="text-lg font-medium mb-2">캐릭터를 등록하세요</p>
          <p className="text-sm mb-4" style={{ color: "var(--fg-muted)" }}>레퍼런스 이미지와 스타일 프롬프트를 설정하면 씬 생성 시 자동으로 적용됩니다</p>
          <button className="btn-primary" onClick={openCreate}>첫 캐릭터 등록</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {chars.map(c => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-lg">{c.name}</h3>
                <div className="flex gap-1">
                  <button className="text-xs px-2 py-1 rounded" style={{ color: "var(--accent)" }} onClick={() => openEdit(c)}>수정</button>
                  <button className="text-xs px-2 py-1 rounded" style={{ color: "var(--danger)" }} onClick={() => handleDelete(c.id)}>삭제</button>
                </div>
              </div>

              {c.description && <p className="text-sm mb-2" style={{ color: "var(--fg-muted)" }}>{c.description}</p>}

              {c.reference_images.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                  {c.reference_images.map((img, i) => (
                    <img key={i} src={img} alt={`${c.name} ref ${i}`} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" style={{ border: "1px solid var(--border)" }} />
                  ))}
                </div>
              )}

              <button
                className="w-full text-sm py-2 rounded-lg mb-3 transition-colors"
                style={{ border: "1px dashed var(--border)", color: "var(--fg-muted)" }}
                onClick={() => { setUploadTarget(c.id); fileRef.current?.click(); }}
              >
                + 레퍼런스 이미지 추가
              </button>

              <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: "var(--fg-muted)" }}>
                {c.style_prompt && <div><span className="font-medium">스타일:</span> {c.style_prompt.slice(0, 30)}</div>}
                {c.voice_preset && <div><span className="font-medium">목소리:</span> {c.voice_preset}</div>}
                {c.seed_value && <div><span className="font-medium">시드:</span> {c.seed_value}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setShowModal(false)}>
          <div className="card w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">{editChar ? "캐릭터 수정" : "새 캐릭터"}</h2>

            <label className="block mb-3">
              <span className="text-sm font-medium mb-1 block">이름 *</span>
              <input className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg)" }} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="캐릭터 이름" autoFocus />
            </label>

            <label className="block mb-3">
              <span className="text-sm font-medium mb-1 block">설명</span>
              <textarea className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg)" }} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="외모, 성격 등" />
            </label>

            <label className="block mb-3">
              <span className="text-sm font-medium mb-1 block">스타일 프롬프트</span>
              <input className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg)" }} value={form.style_prompt} onChange={e => setForm(f => ({ ...f, style_prompt: e.target.value }))} placeholder="예: blue hair, school uniform, cheerful expression" />
            </label>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <label className="block">
                <span className="text-sm font-medium mb-1 block">목소리 프리셋</span>
                <input className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg)" }} value={form.voice_preset} onChange={e => setForm(f => ({ ...f, voice_preset: e.target.value }))} placeholder="예: nova, alloy" />
              </label>
              <label className="block">
                <span className="text-sm font-medium mb-1 block">시드값</span>
                <input type="number" className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg)" }} value={form.seed_value} onChange={e => setForm(f => ({ ...f, seed_value: e.target.value }))} placeholder="일관성을 위한 시드" />
              </label>
            </div>

            <div className="flex gap-2 justify-end">
              <button className="btn-ghost text-sm" onClick={() => setShowModal(false)}>취소</button>
              <button className="btn-primary text-sm" onClick={handleSave} disabled={!form.name.trim()}>{editChar ? "저장" : "추가"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
