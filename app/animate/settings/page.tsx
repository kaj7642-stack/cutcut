"use client";

import { useEffect, useState, useCallback } from "react";

interface Setting {
  id: string;
  provider: string;
  api_type: string;
  api_key: string;
  base_url: string;
  model_name: string;
  is_active: boolean;
}

const API_TYPES = [
  { key: "image", label: "이미지 생성", icon: "🖼️", providers: ["openai", "stability", "midjourney", "custom"] },
  { key: "video", label: "영상 생성", icon: "🎬", providers: ["runway", "kling", "pika", "custom"] },
  { key: "tts", label: "TTS 음성", icon: "🎙️", providers: ["openai", "elevenlabs", "google", "custom"] },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ provider: "", api_type: "image", api_key: "", base_url: "", model_name: "", is_active: true, id: "" });

  const load = useCallback(async () => {
    const res = await fetch("/api/animate/settings");
    setSettings(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    await fetch("/api/animate/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form.id ? form : { ...form, id: undefined }),
    });
    setEditId(null);
    setForm({ provider: "", api_type: "image", api_key: "", base_url: "", model_name: "", is_active: true, id: "" });
    load();
  };

  const handleEdit = (s: Setting) => {
    setForm({ ...s });
    setEditId(s.id);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/animate/settings?id=${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">API 설정</h1>
      <p className="text-sm mb-6" style={{ color: "var(--fg-muted)" }}>
        이미지/영상 생성, TTS API 키를 설정하세요. API 키가 없으면 Mock(테스트) 모드로 동작합니다.
      </p>

      <div className="grid gap-6">
        {API_TYPES.map(type => {
          const typeSettings = settings.filter(s => s.api_type === type.key);
          return (
            <div key={type.key} className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">{type.icon} {type.label}</h2>
                <button
                  className="text-sm font-medium px-3 py-1 rounded-lg"
                  style={{ color: "var(--accent)", border: "1px solid var(--accent)" }}
                  onClick={() => { setForm({ provider: type.providers[0], api_type: type.key, api_key: "", base_url: "", model_name: "", is_active: true, id: "" }); setEditId("new"); }}
                >
                  + 추가
                </button>
              </div>

              {typeSettings.length === 0 && editId !== "new" && (
                <p className="text-sm" style={{ color: "var(--fg-muted)" }}>설정된 API가 없습니다 (Mock 모드 사용 중)</p>
              )}

              {typeSettings.map(s => (
                <div key={s.id} className="flex items-center gap-3 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className={`w-2 h-2 rounded-full ${s.is_active ? "bg-green-500" : "bg-gray-500"}`} />
                  <span className="font-medium text-sm flex-1">{s.provider}</span>
                  <span className="text-xs" style={{ color: "var(--fg-muted)" }}>{s.model_name || "기본 모델"}</span>
                  <span className="text-xs font-mono" style={{ color: "var(--fg-muted)" }}>
                    {s.api_key ? `${s.api_key.slice(0, 8)}...` : "키 없음"}
                  </span>
                  <button className="text-xs" style={{ color: "var(--accent)" }} onClick={() => handleEdit(s)}>수정</button>
                  <button className="text-xs" style={{ color: "var(--danger)" }} onClick={() => handleDelete(s.id)}>삭제</button>
                </div>
              ))}

              {editId && form.api_type === type.key && (
                <div className="mt-4 p-4 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <label className="block">
                      <span className="text-xs font-medium block mb-1">Provider</span>
                      <select
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--fg)" }}
                        value={form.provider}
                        onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                      >
                        {type.providers.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium block mb-1">모델명</span>
                      <input
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--fg)" }}
                        value={form.model_name}
                        onChange={e => setForm(f => ({ ...f, model_name: e.target.value }))}
                        placeholder="예: dall-e-3, gpt-4o-mini-tts"
                      />
                    </label>
                  </div>
                  <label className="block mb-3">
                    <span className="text-xs font-medium block mb-1">API Key</span>
                    <input
                      type="password"
                      className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--fg)" }}
                      value={form.api_key}
                      onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
                      placeholder="sk-..."
                    />
                  </label>
                  <label className="block mb-3">
                    <span className="text-xs font-medium block mb-1">Base URL (선택, custom provider용)</span>
                    <input
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--fg)" }}
                      value={form.base_url}
                      onChange={e => setForm(f => ({ ...f, base_url: e.target.value }))}
                      placeholder="https://api.example.com/v1/..."
                    />
                  </label>
                  <div className="flex gap-2 justify-end">
                    <button className="btn-ghost text-sm py-1.5 px-4" onClick={() => setEditId(null)}>취소</button>
                    <button className="btn-primary text-sm py-1.5 px-4" onClick={handleSave}>저장</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
