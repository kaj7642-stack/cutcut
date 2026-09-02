"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface Scene {
  id: string; order_index: number; description: string; dialogue: string;
  duration: number; generated_image_url: string | null; generated_video_url: string | null;
  tts_audio_url: string | null; subtitle_text: string; subtitle_color: string; status: string;
}

export default function TimelinePage() {
  const { projectId, episodeId } = useParams<{ projectId: string; episodeId: string }>();
  const router = useRouter();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [renderResult, setRenderResult] = useState<{ message: string; totalDuration: number } | null>(null);
  const [editScene, setEditScene] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/animate/scenes?episodeId=${episodeId}`);
    setScenes(await res.json());
    setLoading(false);
  }, [episodeId]);

  useEffect(() => { load(); }, [load]);

  const moveScene = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= scenes.length) return;
    const a = scenes[index], b = scenes[target];
    await Promise.all([
      fetch(`/api/animate/scenes/${a.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_index: b.order_index }) }),
      fetch(`/api/animate/scenes/${b.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_index: a.order_index }) }),
    ]);
    load();
  };

  const updateSceneField = async (id: string, field: string, value: string | number) => {
    await fetch(`/api/animate/scenes/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }) });
    load();
  };

  const handleRender = async () => {
    setRendering(true);
    const res = await fetch("/api/animate/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ episode_id: episodeId }),
    });
    setRenderResult(await res.json());
    setRendering(false);
  };

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
  const readyScenes = scenes.filter(s => s.generated_image_url || s.generated_video_url);

  if (loading) return <div className="card animate-pulse" style={{ height: 400 }} />;

  if (scenes.length === 0) {
    return (
      <div className="card text-center py-16">
        <div className="text-3xl mb-3">🎬</div>
        <p className="font-medium mb-2">씬이 없습니다</p>
        <button className="btn-primary text-sm" onClick={() => router.push(`/animate/${projectId}/episode/${episodeId}/script`)}>대본 입력으로 →</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">타임라인</h2>
          <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
            총 {scenes.length}개 씬 · {totalDuration.toFixed(1)}초 · {readyScenes.length}개 생성 완료
          </p>
        </div>
        <button className="btn-primary text-sm" onClick={handleRender} disabled={rendering || readyScenes.length === 0}>
          {rendering ? "렌더링 중..." : "최종 렌더링"}
        </button>
      </div>

      {renderResult && (
        <div className="card mb-4" style={{ borderColor: "var(--success)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--success)" }}>{renderResult.message}</p>
          <p className="text-xs mt-1" style={{ color: "var(--fg-muted)" }}>총 {renderResult.totalDuration?.toFixed(1)}초</p>
        </div>
      )}

      <div className="mb-6 p-4 rounded-xl overflow-x-auto" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex gap-1 min-w-max">
          {scenes.map((scene, i) => {
            const widthPx = Math.max(80, scene.duration * 40);
            const hasContent = !!(scene.generated_image_url || scene.generated_video_url);
            return (
              <div
                key={scene.id}
                className="relative rounded-lg overflow-hidden flex-shrink-0 cursor-pointer transition-all group"
                style={{
                  width: widthPx,
                  height: 60,
                  background: hasContent ? "var(--accent-glow)" : "var(--bg)",
                  border: editScene === scene.id ? "2px solid var(--accent)" : "1px solid var(--border)",
                }}
                onClick={() => setEditScene(editScene === scene.id ? null : scene.id)}
              >
                {scene.generated_image_url && (
                  <img src={scene.generated_image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                )}
                <div className="relative z-10 p-1.5 h-full flex flex-col justify-between">
                  <span className="text-[10px] font-bold" style={{ color: "var(--accent)" }}>S{i + 1}</span>
                  <span className="text-[10px]" style={{ color: "var(--fg-muted)" }}>{scene.duration}s</span>
                </div>
                {scene.tts_audio_url && (
                  <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: "var(--success)" }} />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-[10px]" style={{ color: "var(--fg-muted)" }}>
          <span>0:00</span>
          <span>{Math.floor(totalDuration / 60)}:{String(Math.floor(totalDuration % 60)).padStart(2, "0")}</span>
        </div>
      </div>

      <div className="space-y-3">
        {scenes.map((scene, i) => (
          <div key={scene.id} className="card" style={{ borderColor: editScene === scene.id ? "var(--accent)" : undefined }}>
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-0.5">
                <button className="text-xs p-0.5" style={{ color: "var(--fg-muted)" }} onClick={() => moveScene(i, -1)} disabled={i === 0}>▲</button>
                <button className="text-xs p-0.5" style={{ color: "var(--fg-muted)" }} onClick={() => moveScene(i, 1)} disabled={i === scenes.length - 1}>▼</button>
              </div>

              <div className="w-20 h-14 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                {scene.generated_image_url ? (
                  <img src={scene.generated_image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg">🖼️</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>씬 {i + 1}</span>
                  <span className="text-xs" style={{ color: "var(--fg-muted)" }}>{scene.duration}초</span>
                </div>
                <p className="text-sm line-clamp-1">{scene.description}</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {scene.tts_audio_url && <span className="text-xs" style={{ color: "var(--success)" }}>🎙️</span>}
                {(scene.generated_image_url || scene.generated_video_url) && <span className="text-xs" style={{ color: "var(--success)" }}>✓</span>}
              </div>
            </div>

            {editScene === scene.id && (
              <div className="mt-3 pt-3 grid grid-cols-2 gap-3" style={{ borderTop: "1px solid var(--border)" }}>
                <label className="block">
                  <span className="text-xs font-medium block mb-1">자막</span>
                  <input
                    className="w-full px-2 py-1.5 rounded text-sm"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg)" }}
                    value={scene.subtitle_text}
                    onChange={e => updateSceneField(scene.id, "subtitle_text", e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium block mb-1">자막 색상</span>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={scene.subtitle_color}
                      onChange={e => updateSceneField(scene.id, "subtitle_color", e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer"
                    />
                    <span className="text-xs font-mono" style={{ color: "var(--fg-muted)" }}>{scene.subtitle_color}</span>
                  </div>
                </label>
                <label className="block">
                  <span className="text-xs font-medium block mb-1">지속시간 (초)</span>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    step={0.5}
                    className="w-full px-2 py-1.5 rounded text-sm"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg)" }}
                    value={scene.duration}
                    onChange={e => updateSceneField(scene.id, "duration", parseFloat(e.target.value) || 3)}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium block mb-1">설명</span>
                  <input
                    className="w-full px-2 py-1.5 rounded text-sm"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg)" }}
                    value={scene.description}
                    onChange={e => updateSceneField(scene.id, "description", e.target.value)}
                  />
                </label>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
