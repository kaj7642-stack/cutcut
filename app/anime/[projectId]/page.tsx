"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

// ── Types ──
interface Project {
  id: string; name: string; description: string;
  style_mode: "2d" | "3d"; aspect_ratio: "9:16" | "16:9";
  created_at: string; updated_at: string;
}
interface Character {
  id: string; project_id: string; name: string;
  style_mode: "2d" | "3d"; style_prompt: string;
  voice_preset: string; seed_value: number;
  reference_images: string; subtitle_color: string; subtitle_font: string;
  created_at: string; updated_at: string;
}
interface Episode {
  id: string; project_id: string; title: string;
  episode_number: number; status: string;
  created_at: string; updated_at: string;
}
interface Scene {
  id: string; episode_id: string; scene_number: number;
  description: string; dialogue: string; character_ids: string;
  camera_direction: string; duration_seconds: number;
  generated_image_url: string; generated_video_url: string;
  tts_audio_url: string; subtitle_text: string;
  status: string; prompt_used: string; api_log: string;
  created_at: string; updated_at: string;
}
interface RenderJob {
  id: string; episode_id: string; output_path: string;
  status: string; progress: number; error: string;
}

const STEPS = [
  { key: "characters", label: "캐릭터 라이브러리", icon: "👤" },
  { key: "script", label: "대본 입력 & 씬 분할", icon: "📝" },
  { key: "generate", label: "씬별 생성", icon: "🎨" },
  { key: "tts", label: "TTS 음성 생성", icon: "🔊" },
  { key: "timeline", label: "타임라인 & 내보내기", icon: "🎬" },
] as const;
type StepKey = typeof STEPS[number]["key"];

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [step, setStep] = useState<StepKey>("characters");
  const [loading, setLoading] = useState(true);

  // ── Data loading ──
  const loadProject = useCallback(async () => {
    const res = await fetch(`/api/anime/projects/${projectId}`);
    if (!res.ok) { router.push("/anime"); return; }
    setProject(await res.json());
  }, [projectId, router]);

  const loadCharacters = useCallback(async () => {
    const res = await fetch(`/api/anime/characters?projectId=${projectId}`);
    setCharacters(await res.json());
  }, [projectId]);

  const loadEpisodes = useCallback(async () => {
    const res = await fetch(`/api/anime/episodes?projectId=${projectId}`);
    const eps = await res.json();
    setEpisodes(eps);
    if (eps.length > 0 && !currentEpisode) setCurrentEpisode(eps[0]);
  }, [projectId, currentEpisode]);

  const loadScenes = useCallback(async (epId: string) => {
    const res = await fetch(`/api/anime/episodes/${epId}/scenes`);
    setScenes(await res.json());
  }, []);

  useEffect(() => {
    Promise.all([loadProject(), loadCharacters(), loadEpisodes()]).then(() => setLoading(false));
  }, [loadProject, loadCharacters, loadEpisodes]);

  useEffect(() => {
    if (currentEpisode) loadScenes(currentEpisode.id);
  }, [currentEpisode, loadScenes]);

  if (loading || !project) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin text-4xl">🎬</div></div>;
  }

  return (
    <div>
      {/* Project header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push("/anime")} className="text-[var(--fg-muted)] hover:text-[var(--fg)]">← 목록</button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-sm text-[var(--fg-muted)]">
            {project.style_mode === "2d" ? "🎨 2D 애니" : "🧊 3D 렌더"} · {project.aspect_ratio}
            {project.description ? ` · ${project.description}` : ""}
          </p>
        </div>
      </div>

      {/* Step navigation */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            onClick={() => setStep(s.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all ${
              step === s.key
                ? "bg-[var(--accent)] text-white font-semibold"
                : "bg-[var(--bg-card)] border border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--border-hover)]"
            }`}
          >
            <span>{s.icon}</span>
            <span className="hidden sm:inline">{i + 1}.</span> {s.label}
          </button>
        ))}
      </div>

      {/* Step panels */}
      {step === "characters" && (
        <CharacterPanel
          projectId={projectId}
          characters={characters}
          projectStyleMode={project.style_mode}
          reload={loadCharacters}
        />
      )}
      {step === "script" && (
        <ScriptPanel
          projectId={projectId}
          episodes={episodes}
          currentEpisode={currentEpisode}
          setCurrentEpisode={setCurrentEpisode}
          scenes={scenes}
          reloadEpisodes={loadEpisodes}
          reloadScenes={(id: string) => loadScenes(id)}
        />
      )}
      {step === "generate" && (
        <GeneratePanel scenes={scenes} reload={() => currentEpisode && loadScenes(currentEpisode.id)} />
      )}
      {step === "tts" && (
        <TtsPanel scenes={scenes} reload={() => currentEpisode && loadScenes(currentEpisode.id)} />
      )}
      {step === "timeline" && (
        <TimelinePanel
          scenes={scenes}
          episode={currentEpisode}
          aspectRatio={project.aspect_ratio}
          reload={() => currentEpisode && loadScenes(currentEpisode.id)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
//  STEP 1: Character Library Panel
// ═══════════════════════════════════════════
function CharacterPanel({
  projectId, characters, projectStyleMode, reload
}: {
  projectId: string; characters: Character[]; projectStyleMode: "2d" | "3d"; reload: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", style_mode: projectStyleMode, style_prompt: "",
    seed_value: 0, subtitle_color: "#FFFFFF", voice_id: "",
  });
  const [uploading, setUploading] = useState<string | null>(null);

  const create = async () => {
    if (!form.name.trim()) return;
    await fetch("/api/anime/characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        name: form.name,
        style_mode: form.style_mode,
        style_prompt: form.style_prompt,
        seed_value: form.seed_value,
        subtitle_color: form.subtitle_color,
        voice_preset: form.voice_id ? { voice_id: form.voice_id } : {},
      }),
    });
    setForm({ name: "", style_mode: projectStyleMode, style_prompt: "", seed_value: 0, subtitle_color: "#FFFFFF", voice_id: "" });
    setShowForm(false);
    reload();
  };

  const remove = async (id: string) => {
    if (!confirm("캐릭터를 삭제할까요?")) return;
    await fetch(`/api/anime/characters/${id}`, { method: "DELETE" });
    reload();
  };

  const uploadRef = async (charId: string, file: File) => {
    setUploading(charId);
    const fd = new FormData();
    fd.append("file", file);
    await fetch(`/api/anime/characters/${charId}/reference`, { method: "POST", body: fd });
    reload();
    setUploading(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">👤 캐릭터 라이브러리</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">+ 캐릭터 추가</button>
      </div>

      {showForm && (
        <div className="card mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--fg-muted)] mb-1">캐릭터 이름</label>
              <input className="w-full rounded-lg bg-[var(--bg)] border border-[var(--border)] px-3 py-2 text-[var(--fg)] focus:border-[var(--accent)] focus:outline-none" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="예: 하나" />
            </div>
            <div>
              <label className="block text-sm text-[var(--fg-muted)] mb-1">스타일 모드</label>
              <div className="flex gap-2">
                {(["2d", "3d"] as const).map(m => (
                  <button key={m} onClick={() => setForm(f => ({ ...f, style_mode: m }))} className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-all ${form.style_mode === m ? "border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent)]" : "border-[var(--border)]"}`}>
                    {m === "2d" ? "🎨 2D" : "🧊 3D"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-[var(--fg-muted)] mb-1">스타일 프롬프트 (추가)</label>
              <input className="w-full rounded-lg bg-[var(--bg)] border border-[var(--border)] px-3 py-2 text-[var(--fg)] focus:border-[var(--accent)] focus:outline-none" value={form.style_prompt} onChange={e => setForm(f => ({ ...f, style_prompt: e.target.value }))} placeholder="예: blue hair, school uniform" />
            </div>
            <div>
              <label className="block text-sm text-[var(--fg-muted)] mb-1">시드값</label>
              <input type="number" className="w-full rounded-lg bg-[var(--bg)] border border-[var(--border)] px-3 py-2 text-[var(--fg)] focus:border-[var(--accent)] focus:outline-none" value={form.seed_value} onChange={e => setForm(f => ({ ...f, seed_value: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="block text-sm text-[var(--fg-muted)] mb-1">자막 색상</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={form.subtitle_color} onChange={e => setForm(f => ({ ...f, subtitle_color: e.target.value }))} className="w-10 h-10 rounded border-0 cursor-pointer" />
                <span className="text-sm text-[var(--fg-muted)]">{form.subtitle_color}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm text-[var(--fg-muted)] mb-1">TTS 음성 ID</label>
              <input className="w-full rounded-lg bg-[var(--bg)] border border-[var(--border)] px-3 py-2 text-[var(--fg)] focus:border-[var(--accent)] focus:outline-none" value={form.voice_id} onChange={e => setForm(f => ({ ...f, voice_id: e.target.value }))} placeholder="예: nova, onyx, shimmer" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--fg-muted)]">취소</button>
            <button onClick={create} className="btn-primary text-sm">저장</button>
          </div>
        </div>
      )}

      {characters.length === 0 ? (
        <div className="text-center py-12 text-[var(--fg-muted)]">
          <div className="text-5xl mb-3">👤</div>
          <p>캐릭터를 등록하면 씬 생성 시 자동으로 프롬프트에 반영됩니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map(c => {
            const imgs: string[] = (() => { try { return JSON.parse(c.reference_images || "[]"); } catch { return []; } })();
            return (
              <div key={c.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{c.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.style_mode === "2d" ? "bg-purple-500/20 text-purple-300" : "bg-blue-500/20 text-blue-300"}`}>
                      {c.style_mode === "2d" ? "2D" : "3D"}
                    </span>
                  </div>
                  <button onClick={() => remove(c.id)} className="text-[var(--fg-muted)] hover:text-[var(--danger)] text-sm">✕</button>
                </div>
                {c.style_prompt && <p className="text-xs text-[var(--fg-muted)] mt-2 italic">{c.style_prompt}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-[var(--fg-muted)]">자막색:</span>
                  <span className="w-4 h-4 rounded-full border border-[var(--border)]" style={{ backgroundColor: c.subtitle_color }} />
                  {c.seed_value > 0 && <span className="text-xs text-[var(--fg-muted)]">seed: {c.seed_value}</span>}
                </div>
                {/* Reference images */}
                <div className="mt-3">
                  <div className="flex gap-2 flex-wrap">
                    {imgs.map((url, i) => (
                      <div key={i} className="w-16 h-16 rounded-lg bg-[var(--bg)] border border-[var(--border)] overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <label className="w-16 h-16 rounded-lg border-2 border-dashed border-[var(--border)] flex items-center justify-center cursor-pointer hover:border-[var(--accent)] transition-colors">
                      {uploading === c.id ? <span className="animate-spin">⏳</span> : <span className="text-[var(--fg-muted)]">+</span>}
                      <input type="file" className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) uploadRef(c.id, f); }} />
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
//  STEP 2: Script Input & Scene Parsing
// ═══════════════════════════════════════════
function ScriptPanel({
  projectId, episodes, currentEpisode, setCurrentEpisode, scenes,
  reloadEpisodes, reloadScenes,
}: {
  projectId: string; episodes: Episode[]; currentEpisode: Episode | null;
  setCurrentEpisode: (ep: Episode) => void; scenes: Scene[];
  reloadEpisodes: () => void; reloadScenes: (id: string) => void;
}) {
  const [scriptText, setScriptText] = useState("");
  const [parsing, setParsing] = useState(false);

  const createEpisode = async () => {
    const res = await fetch("/api/anime/episodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, title: `에피소드 ${episodes.length + 1}` }),
    });
    const ep = await res.json();
    setCurrentEpisode(ep);
    reloadEpisodes();
  };

  const parseScript = async () => {
    if (!currentEpisode || !scriptText.trim()) return;
    setParsing(true);
    await fetch("/api/anime/parse-script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ episode_id: currentEpisode.id, script_text: scriptText }),
    });
    reloadScenes(currentEpisode.id);
    setParsing(false);
  };

  const updateScene = async (sceneId: string, field: string, value: unknown) => {
    await fetch(`/api/anime/scenes/${sceneId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (currentEpisode) reloadScenes(currentEpisode.id);
  };

  const deleteScene = async (sceneId: string) => {
    await fetch(`/api/anime/scenes/${sceneId}`, { method: "DELETE" });
    if (currentEpisode) reloadScenes(currentEpisode.id);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold">📝 대본 입력</h2>
        <div className="flex gap-2 ml-auto">
          {episodes.map(ep => (
            <button
              key={ep.id}
              onClick={() => setCurrentEpisode(ep)}
              className={`px-3 py-1.5 rounded-lg text-sm ${currentEpisode?.id === ep.id ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-card)] border border-[var(--border)]"}`}
            >
              EP{ep.episode_number}
            </button>
          ))}
          <button onClick={createEpisode} className="px-3 py-1.5 rounded-lg text-sm border border-dashed border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--accent)]">
            + 에피소드
          </button>
        </div>
      </div>

      {!currentEpisode ? (
        <div className="text-center py-12 text-[var(--fg-muted)]">
          <p>먼저 에피소드를 만들어주세요</p>
        </div>
      ) : (
        <>
          <div className="card mb-4">
            <label className="block text-sm text-[var(--fg-muted)] mb-2">
              대본을 씬 단위로 입력하세요 (빈 줄로 씬 구분)
            </label>
            <textarea
              className="w-full h-48 rounded-lg bg-[var(--bg)] border border-[var(--border)] px-3 py-2 text-[var(--fg)] text-sm font-mono focus:border-[var(--accent)] focus:outline-none resize-y"
              value={scriptText}
              onChange={e => setScriptText(e.target.value)}
              placeholder={`[씬 1] 숲속 길\n캐릭터: 하나, 유키\n카메라: zoom_in\n시간: 5초\n하나: "안녕, 오늘 모험을 떠나자!"\n(유키가 고개를 끄덕인다)\n\n[씬 2] 마을 입구\n하나: "드디어 도착했어!"`}
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-[var(--fg-muted)]">
                형식: [씬 N] 설명 / 캐릭터: 이름1, 이름2 / 카메라: zoom_in / 시간: 5초 / 이름: &ldquo;대사&rdquo;
              </p>
              <button
                onClick={parseScript}
                disabled={parsing || !scriptText.trim()}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {parsing ? "파싱 중..." : "🔍 씬 분할 실행"}
              </button>
            </div>
          </div>

          {/* Scene list */}
          {scenes.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">분할된 씬 ({scenes.length}개)</h3>
              <div className="space-y-3">
                {scenes.map(scene => (
                  <div key={scene.id} className="card">
                    <div className="flex items-start gap-3">
                      <span className="bg-[var(--accent)] text-white text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                        {scene.scene_number}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-[var(--fg-muted)]">씬 설명</label>
                            <textarea
                              className="w-full rounded-lg bg-[var(--bg)] border border-[var(--border)] px-2 py-1.5 text-sm text-[var(--fg)] focus:border-[var(--accent)] focus:outline-none resize-y"
                              rows={2}
                              defaultValue={scene.description}
                              onBlur={e => updateScene(scene.id, "description", e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[var(--fg-muted)]">대사/자막</label>
                            <textarea
                              className="w-full rounded-lg bg-[var(--bg)] border border-[var(--border)] px-2 py-1.5 text-sm text-[var(--fg)] focus:border-[var(--accent)] focus:outline-none resize-y"
                              rows={2}
                              defaultValue={scene.dialogue}
                              onBlur={e => updateScene(scene.id, "dialogue", e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="flex gap-3 mt-2 flex-wrap">
                          <div>
                            <label className="text-xs text-[var(--fg-muted)]">카메라</label>
                            <select
                              className="block rounded-lg bg-[var(--bg)] border border-[var(--border)] px-2 py-1 text-sm text-[var(--fg)]"
                              defaultValue={scene.camera_direction}
                              onChange={e => updateScene(scene.id, "camera_direction", e.target.value)}
                            >
                              {["static","zoom_in","zoom_out","pan_left","pan_right","pan_up","pan_down"].map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-[var(--fg-muted)]">시간(초)</label>
                            <input
                              type="number" min={1} max={60} step={0.5}
                              className="block w-20 rounded-lg bg-[var(--bg)] border border-[var(--border)] px-2 py-1 text-sm text-[var(--fg)]"
                              defaultValue={scene.duration_seconds}
                              onBlur={e => updateScene(scene.id, "duration_seconds", parseFloat(e.target.value) || 3)}
                            />
                          </div>
                          <div className="flex items-end">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              scene.status === "completed" ? "bg-green-500/20 text-green-300" :
                              scene.status === "failed" ? "bg-red-500/20 text-red-300" :
                              scene.status === "pending" ? "bg-gray-500/20 text-gray-300" :
                              "bg-yellow-500/20 text-yellow-300"
                            }`}>
                              {scene.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => deleteScene(scene.id)} className="text-[var(--fg-muted)] hover:text-[var(--danger)] text-sm shrink-0">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
//  STEP 3: Image/Video Generation
// ═══════════════════════════════════════════
function GeneratePanel({ scenes, reload }: { scenes: Scene[]; reload: () => void }) {
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [batchMode, setBatchMode] = useState(false);

  const generate = async (sceneId: string, mode: "image" | "both") => {
    setGenerating(g => ({ ...g, [sceneId]: true }));
    await fetch(`/api/anime/scenes/${sceneId}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    setGenerating(g => ({ ...g, [sceneId]: false }));
    reload();
  };

  const generateAll = async () => {
    setBatchMode(true);
    for (const scene of scenes) {
      if (scene.status !== "completed" || !scene.generated_image_url) {
        setGenerating(g => ({ ...g, [scene.id]: true }));
        await fetch(`/api/anime/scenes/${scene.id}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "image" }),
        });
        setGenerating(g => ({ ...g, [scene.id]: false }));
      }
    }
    reload();
    setBatchMode(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">🎨 씬별 이미지/영상 생성</h2>
        <button
          onClick={generateAll}
          disabled={batchMode || scenes.length === 0}
          className="btn-primary text-sm disabled:opacity-50"
        >
          {batchMode ? "일괄 생성 중..." : "⚡ 전체 일괄 생성"}
        </button>
      </div>

      {scenes.length === 0 ? (
        <div className="text-center py-12 text-[var(--fg-muted)]">
          <p>먼저 대본을 입력하고 씬을 분할해주세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenes.map(scene => (
            <div key={scene.id} className="card">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-[var(--accent)] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                  {scene.scene_number}
                </span>
                <span className="text-sm font-medium truncate flex-1">{scene.description}</span>
              </div>

              {/* Preview */}
              <div className="aspect-video rounded-lg bg-[var(--bg)] border border-[var(--border)] mb-3 overflow-hidden flex items-center justify-center">
                {scene.generated_image_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={scene.generated_image_url} alt={`씬 ${scene.scene_number}`} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-[var(--fg-muted)] text-sm">미생성</span>
                )}
              </div>

              {/* Prompt used */}
              {scene.prompt_used && (
                <details className="mb-2">
                  <summary className="text-xs text-[var(--fg-muted)] cursor-pointer">사용된 프롬프트</summary>
                  <p className="text-xs text-[var(--fg-muted)] mt-1 p-2 bg-[var(--bg)] rounded-lg font-mono">{scene.prompt_used}</p>
                </details>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => generate(scene.id, "image")}
                  disabled={!!generating[scene.id]}
                  className="flex-1 text-sm px-3 py-2 rounded-lg border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-glow)] transition-colors disabled:opacity-50"
                >
                  {generating[scene.id] ? "생성 중..." : "🖼 이미지 생성"}
                </button>
                <button
                  onClick={() => generate(scene.id, "both")}
                  disabled={!!generating[scene.id]}
                  className="flex-1 text-sm px-3 py-2 rounded-lg border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-glow)] transition-colors disabled:opacity-50"
                >
                  {generating[scene.id] ? "생성 중..." : "🎥 이미지+영상"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
//  STEP 4: TTS Generation
// ═══════════════════════════════════════════
function TtsPanel({ scenes, reload }: { scenes: Scene[]; reload: () => void }) {
  const [generating, setGenerating] = useState<Record<string, boolean>>({});

  const generateTts = async (sceneId: string) => {
    setGenerating(g => ({ ...g, [sceneId]: true }));
    await fetch(`/api/anime/scenes/${sceneId}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setGenerating(g => ({ ...g, [sceneId]: false }));
    reload();
  };

  const generateAll = async () => {
    for (const scene of scenes) {
      if (!scene.tts_audio_url && (scene.dialogue || scene.subtitle_text)) {
        setGenerating(g => ({ ...g, [scene.id]: true }));
        await fetch(`/api/anime/scenes/${scene.id}/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        setGenerating(g => ({ ...g, [scene.id]: false }));
      }
    }
    reload();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">🔊 TTS 음성 생성</h2>
        <button onClick={generateAll} disabled={scenes.length === 0} className="btn-primary text-sm disabled:opacity-50">
          ⚡ 전체 TTS 생성
        </button>
      </div>

      {scenes.length === 0 ? (
        <div className="text-center py-12 text-[var(--fg-muted)]"><p>씬이 없습니다</p></div>
      ) : (
        <div className="space-y-3">
          {scenes.map(scene => (
            <div key={scene.id} className="card flex items-center gap-4">
              <span className="bg-[var(--accent)] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                {scene.scene_number}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{scene.dialogue || scene.subtitle_text || scene.description}</p>
                <p className="text-xs text-[var(--fg-muted)]">{scene.duration_seconds}초</p>
              </div>
              {scene.tts_audio_url ? (
                <div className="flex items-center gap-2">
                  <audio controls src={scene.tts_audio_url} className="h-8" />
                  <span className="text-xs text-green-400">✓</span>
                </div>
              ) : (
                <button
                  onClick={() => generateTts(scene.id)}
                  disabled={!!generating[scene.id]}
                  className="text-sm px-3 py-1.5 rounded-lg border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-glow)] transition-colors disabled:opacity-50 shrink-0"
                >
                  {generating[scene.id] ? "생성 중..." : "🔊 TTS"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
//  STEP 5: Timeline & Export
// ═══════════════════════════════════════════
function TimelinePanel({
  scenes, episode, aspectRatio, reload
}: {
  scenes: Scene[]; episode: Episode | null; aspectRatio: string; reload: () => void;
}) {
  const [rendering, setRendering] = useState(false);
  const [renderResult, setRenderResult] = useState<RenderJob | null>(null);
  const [error, setError] = useState("");

  const startRender = async () => {
    if (!episode) return;
    setRendering(true);
    setError("");
    setRenderResult(null);
    try {
      const res = await fetch("/api/anime/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episode_id: episode.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Render failed");
      setRenderResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setRendering(false);
  };

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration_seconds, 0);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">🎬 타임라인 & 내보내기</h2>

      {/* Timeline visualization */}
      <div className="card mb-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm text-[var(--fg-muted)]">규격: {aspectRatio === "9:16" ? "📱 쇼츠 (9:16)" : "📺 롱폼 (16:9)"}</span>
          <span className="text-sm text-[var(--fg-muted)]">총 {scenes.length}씬 · {totalDuration.toFixed(1)}초</span>
        </div>

        {/* Visual timeline bar */}
        <div className="flex gap-1 rounded-lg overflow-hidden bg-[var(--bg)] p-2">
          {scenes.map(scene => {
            const widthPct = totalDuration > 0 ? (scene.duration_seconds / totalDuration) * 100 : 0;
            return (
              <div
                key={scene.id}
                className="rounded-md flex items-center justify-center text-xs text-white font-medium min-w-[30px] transition-all"
                style={{
                  width: `${widthPct}%`,
                  minHeight: 60,
                  background: scene.generated_image_url
                    ? `linear-gradient(135deg, var(--accent), #a29bfe)`
                    : "var(--bg-card)",
                  border: "1px solid var(--border)",
                }}
                title={`씬 ${scene.scene_number}: ${scene.description} (${scene.duration_seconds}초)`}
              >
                <div className="text-center">
                  <div>{scene.scene_number}</div>
                  <div className="text-[10px] opacity-70">{scene.duration_seconds}s</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scene details */}
        <div className="mt-4 space-y-2">
          {scenes.map(scene => (
            <div key={scene.id} className="flex items-center gap-3 text-sm">
              <span className="w-8 text-center font-mono text-[var(--fg-muted)]">{scene.scene_number}</span>
              <span className="flex-1 truncate">{scene.description}</span>
              <span className={`w-4 h-4 rounded-full ${scene.generated_image_url ? "bg-green-400" : "bg-gray-500"}`} title={scene.generated_image_url ? "이미지 생성됨" : "미생성"} />
              <span className={`w-4 h-4 rounded-full ${scene.tts_audio_url ? "bg-blue-400" : "bg-gray-500"}`} title={scene.tts_audio_url ? "TTS 생성됨" : "미생성"} />
              <span className="text-xs text-[var(--fg-muted)] w-12 text-right">{scene.duration_seconds}초</span>
            </div>
          ))}
        </div>
      </div>

      {/* Render controls */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">최종 영상 렌더링</h3>
            <p className="text-sm text-[var(--fg-muted)]">
              씬 영상 + TTS 음성 + 자막을 합쳐 mp4로 내보냅니다
            </p>
          </div>
          <button
            onClick={startRender}
            disabled={rendering || scenes.length === 0}
            className="btn-primary disabled:opacity-50"
          >
            {rendering ? "렌더링 중..." : "🚀 렌더링 시작"}
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            ❌ {error}
          </div>
        )}

        {renderResult && renderResult.status === "completed" && (
          <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <p className="text-green-300 font-semibold mb-2">✅ 렌더링 완료!</p>
            <a
              href={renderResult.output_path}
              download
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-semibold hover:bg-[var(--accent-hover)] transition-colors"
            >
              📥 MP4 다운로드
            </a>
          </div>
        )}

        {renderResult && renderResult.status === "failed" && (
          <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            ❌ 렌더링 실패: {renderResult.error}
          </div>
        )}
      </div>
    </div>
  );
}
