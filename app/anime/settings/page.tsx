"use client";

import { useState, useEffect, useCallback } from "react";

interface ApiSetting {
  id: string;
  provider_type: "image_gen" | "video_gen" | "tts";
  provider_name: string;
  api_key: string;
  config: string;
  created_at: string;
  updated_at: string;
}

const PROVIDER_OPTIONS: Record<string, { label: string; providers: string[] }> = {
  image_gen: {
    label: "🖼 이미지 생성 API",
    providers: ["mock", "stability", "dalle", "midjourney", "flux"],
  },
  video_gen: {
    label: "🎥 영상 생성 API",
    providers: ["mock", "runway", "pika", "kling", "luma"],
  },
  tts: {
    label: "🔊 TTS API",
    providers: ["mock", "openai", "elevenlabs", "google", "naver_clova"],
  },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<ApiSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Local form state per provider type
  const [forms, setForms] = useState<Record<string, { provider_name: string; api_key: string; config: string }>>({
    image_gen: { provider_name: "mock", api_key: "", config: "{}" },
    video_gen: { provider_name: "mock", api_key: "", config: "{}" },
    tts: { provider_name: "mock", api_key: "", config: "{}" },
  });

  const load = useCallback(async () => {
    const res = await fetch("/api/anime/settings");
    const data: ApiSetting[] = await res.json();
    setSettings(data);

    // Populate form from existing settings
    const newForms = { ...forms };
    for (const s of data) {
      newForms[s.provider_type] = {
        provider_name: s.provider_name,
        api_key: s.api_key,
        config: s.config,
      };
    }
    setForms(newForms);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (type: string) => {
    setSaving(type);
    const form = forms[type];
    await fetch("/api/anime/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider_type: type,
        provider_name: form.provider_name,
        api_key: form.api_key,
        config: (() => { try { return JSON.parse(form.config); } catch { return {}; } })(),
      }),
    });
    setSaving(null);
    load();
  };

  const updateForm = (type: string, field: string, value: string) => {
    setForms(f => ({
      ...f,
      [type]: { ...f[type], [field]: value },
    }));
  };

  if (loading) return <div className="text-center py-20 text-[var(--fg-muted)]">로딩 중...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">⚙️ API 설정</h1>
      <p className="text-[var(--fg-muted)] mb-6">
        사용할 AI API를 선택하고 키를 입력하세요. 모든 키는 로컬 SQLite에만 저장됩니다.
        <br />&ldquo;mock&rdquo;은 API 키 없이 더미 결과를 생성하는 테스트 모드입니다.
      </p>

      <div className="space-y-6">
        {Object.entries(PROVIDER_OPTIONS).map(([type, opt]) => {
          const form = forms[type];
          const existing = settings.find(s => s.provider_type === type);
          return (
            <div key={type} className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{opt.label}</h2>
                {existing && (
                  <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                    ✓ {existing.provider_name} 설정됨
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-[var(--fg-muted)] mb-1">프로바이더</label>
                  <select
                    className="w-full rounded-lg bg-[var(--bg)] border border-[var(--border)] px-3 py-2 text-[var(--fg)]"
                    value={form.provider_name}
                    onChange={e => updateForm(type, "provider_name", e.target.value)}
                  >
                    {opt.providers.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[var(--fg-muted)] mb-1">API Key</label>
                  <input
                    type="password"
                    className="w-full rounded-lg bg-[var(--bg)] border border-[var(--border)] px-3 py-2 text-[var(--fg)] focus:border-[var(--accent)] focus:outline-none"
                    value={form.api_key}
                    onChange={e => updateForm(type, "api_key", e.target.value)}
                    placeholder={form.provider_name === "mock" ? "mock은 키 불필요" : "API 키 입력"}
                    disabled={form.provider_name === "mock"}
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--fg-muted)] mb-1">추가 설정 (JSON)</label>
                  <input
                    className="w-full rounded-lg bg-[var(--bg)] border border-[var(--border)] px-3 py-2 text-[var(--fg)] font-mono text-sm focus:border-[var(--accent)] focus:outline-none"
                    value={form.config}
                    onChange={e => updateForm(type, "config", e.target.value)}
                    placeholder='{"model": "..."}'
                  />
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => save(type)}
                  disabled={saving === type}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  {saving === type ? "저장 중..." : "💾 저장"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
