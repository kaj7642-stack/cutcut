"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface Scene {
  id: string; order_index: number; description: string; dialogue: string;
  character_ids: string[]; duration: number; camera_direction: string;
  generated_image_url: string | null; generated_video_url: string | null;
  tts_audio_url: string | null; subtitle_text: string; status: string;
  api_log: string | null;
}

interface Character { id: string; name: string; }

export default function GeneratePage() {
  const { projectId, episodeId } = useParams<{ projectId: string; episodeId: string }>();
  const router = useRouter();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [logView, setLogView] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [sRes, cRes] = await Promise.all([
      fetch(`/api/animate/scenes?episodeId=${episodeId}`),
      fetch(`/api/animate/characters?projectId=${projectId}`),
    ]);
    setScenes(await sRes.json());
    setCharacters(await cRes.json());
    setLoading(false);
  }, [episodeId, projectId]);

  useEffect(() => { load(); }, [load]);

  const generateScene = async (sceneId: string, type: "image" | "video") => {
    setGenerating(g => ({ ...g, [sceneId]: true }));
    await fetch(`/api/animate/scenes/${sceneId}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    setGenerating(g => ({ ...g, [sceneId]: false }));
    load();
  };

  const generateTTS = async (sceneId: string) => {
    setGenerating(g => ({ ...g, [`tts-${sceneId}`]: true }));
    await fetch(`/api/animate/scenes/${sceneId}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setGenerating(g => ({ ...g, [`tts-${sceneId}`]: false }));
    load();
  };

  const generateAll = async () => {
    for (const scene of scenes) {
      if (!scene.generated_image_url) await generateScene(scene.id, "image");
    }
    for (const scene of scenes) {
      if (scene.dialogue && !scene.tts_audio_url) await generateTTS(scene.id);
    }
  };

  const getCharName = (id: string) => characters.find(c => c.id === id)?.name ?? "?";

  const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: "var(--bg)", color: "var(--fg-muted)", label: "대기" },
    generating: { bg: "rgba(255,170,0,0.1)", color: "var(--warning)", label: "생성 중" },
    completed: { bg: "rgba(0,214,143,0.1)", color: "var(--success)", label: "완료" },
    failed: { bg: "rgba(255,71,87,0.1)", color: "var(--danger)", label: "실패" },
  };

  if (loading) return <div className="card animate-pulse" style={{ height: 400 }} />;

  if (scenes.length === 0) {
    return (
      <div className="card text-center py-16">
        <div className="text-3xl mb-3">📝</div>
        <p className="font-medium mb-2">씬이 없습니다</p>
        <p className="text-sm mb-4" style={{ color: "var(--fg-muted)" }}>대본을 먼저 입력하고 씬을 분할해주세요</p>
        <button className="btn-primary text-sm" onClick={() => router.push(`/animate/${projectId}/episode/${episodeId}/script`)}>대본 입력으로 →</button>
      </div>
    );
  }

  const completedCount = scenes.filter(s => s.generated_image_url || s.generated_video_url).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">씬별 생성</h2>
          <p className="text-sm" style={{ color: "var(--fg-muted)" }}>{completedCount}/{scenes.length}개 완료</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary text-sm" onClick={generateAll}>전체 생성</button>
          {completedCount > 0 && (
            <button className="btn-ghost text-sm" onClick={() => router.push(`/animate/${projectId}/episode/${episodeId}/timeline`)}>
              타임라인으로 →
            </button>
          )}
        </div>
      </div>

      <div className="w-full rounded-full h-2 mb-6" style={{ background: "var(--border)" }}>
        <div className="h-2 rounded-full transition-all" style={{ width: `${(completedCount / scenes.length) * 100}%`, background: "var(--accent)" }} />
      </div>

      <div className="space-y-4">
        {scenes.map(scene => {
          const st = STATUS_STYLE[scene.status] || STATUS_STYLE.pending;
          const isGen = generating[scene.id] || generating[`tts-${scene.id}`];
          return (
            <div key={scene.id} className="card">
              <div className="flex items-start gap-4">
                <div className="w-32 h-20 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  {scene.generated_image_url ? (
                    <img src={scene.generated_image_url} alt={`씬 ${scene.order_index + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">🖼️</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "var(--accent)", color: "#fff" }}>씬 {scene.order_index + 1}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    <span className="text-xs" style={{ color: "var(--fg-muted)" }}>{scene.duration}초 · {scene.camera_direction}</span>
                  </div>
                  <p className="text-sm mb-1 line-clamp-2">{scene.description}</p>
                  {scene.dialogue && <p className="text-xs" style={{ color: "var(--fg-muted)" }}>{scene.dialogue.split("\n")[0]}</p>}
                  {scene.character_ids.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {scene.character_ids.map(id => (
                        <span key={id} className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>{getCharName(id)}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    className="text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{ background: "var(--accent)", color: "#fff", opacity: isGen ? 0.5 : 1 }}
                    onClick={() => generateScene(scene.id, "image")}
                    disabled={isGen}
                  >
                    {generating[scene.id] ? "생성 중..." : scene.generated_image_url ? "재생성" : "이미지 생성"}
                  </button>
                  {scene.dialogue && (
                    <button
                      className="text-xs px-3 py-1.5 rounded-lg font-medium"
                      style={{ border: "1px solid var(--accent)", color: "var(--accent)", opacity: isGen ? 0.5 : 1 }}
                      onClick={() => generateTTS(scene.id)}
                      disabled={isGen}
                    >
                      {generating[`tts-${scene.id}`] ? "생성 중..." : scene.tts_audio_url ? "TTS 재생성" : "TTS 생성"}
                    </button>
                  )}
                  {scene.api_log && (
                    <button
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ color: "var(--fg-muted)", border: "1px solid var(--border)" }}
                      onClick={() => setLogView(logView === scene.id ? null : scene.id)}
                    >
                      로그
                    </button>
                  )}
                </div>
              </div>

              {scene.tts_audio_url && (
                <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                  <span className="text-xs" style={{ color: "var(--fg-muted)" }}>🎙️ TTS:</span>
                  <audio controls className="h-8 flex-1" style={{ maxWidth: 300 }}>
                    <source src={scene.tts_audio_url} />
                  </audio>
                </div>
              )}

              {logView === scene.id && scene.api_log && (
                <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                  <pre className="text-xs p-3 rounded-lg overflow-x-auto" style={{ background: "var(--bg)", color: "var(--fg-muted)", maxHeight: 200 }}>
                    {JSON.stringify(JSON.parse(scene.api_log), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
