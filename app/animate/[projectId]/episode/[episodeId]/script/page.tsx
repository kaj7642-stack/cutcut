"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Episode { id: string; title: string; raw_script: string; status: string; }
interface ParsedScene { description: string; dialogue: string; characterNames: string[]; duration: number; cameraDirection: string; }
interface Character { id: string; name: string; }

export default function ScriptPage() {
  const { projectId, episodeId } = useParams<{ projectId: string; episodeId: string }>();
  const router = useRouter();
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [script, setScript] = useState("");
  const [parsed, setParsed] = useState<ParsedScene[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [epRes, charRes] = await Promise.all([
      fetch(`/api/animate/episodes/${episodeId}`),
      fetch(`/api/animate/characters?projectId=${projectId}`),
    ]);
    if (!epRes.ok) { router.push(`/animate/${projectId}`); return; }
    const ep = await epRes.json();
    setEpisode(ep);
    setScript(ep.raw_script || "");
    setCharacters(await charRes.json());
    setLoading(false);
  }, [episodeId, projectId, router]);

  useEffect(() => { load(); }, [load]);

  const handleParse = async () => {
    if (!script.trim()) return;
    setParsing(true);
    const res = await fetch("/api/animate/parse-script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ script }),
    });
    const data = await res.json();
    setParsed(data.scenes || []);
    setParsing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/animate/episodes/${episodeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw_script: script, status: "scripted" }),
    });

    const existing = await fetch(`/api/animate/scenes?episodeId=${episodeId}`);
    const existingScenes = await existing.json();
    for (const s of existingScenes) {
      await fetch(`/api/animate/scenes/${s.id}`, { method: "DELETE" });
    }

    for (let i = 0; i < parsed.length; i++) {
      const p = parsed[i];
      const charIds = p.characterNames
        .map(name => characters.find(c => c.name === name)?.id)
        .filter(Boolean) as string[];

      await fetch("/api/animate/scenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episode_id: episodeId,
          order_index: i,
          description: p.description,
          dialogue: p.dialogue,
          character_ids: charIds,
          duration: p.duration,
          camera_direction: p.cameraDirection,
          subtitle_text: p.dialogue,
        }),
      });
    }

    setSaving(false);
    router.push(`/animate/${projectId}/episode/${episodeId}/generate`);
  };

  const CAMERA_LABELS: Record<string, string> = {
    static: "고정", zoom_in: "줌인", zoom_out: "줌아웃",
    pan_left: "팬 좌", pan_right: "팬 우", pan_up: "팬 상", pan_down: "팬 하", tracking: "트래킹",
  };

  if (loading) return <div className="card animate-pulse" style={{ height: 400 }} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">{episode?.title} - 대본 입력</h2>
      </div>

      {characters.length === 0 && (
        <div className="card mb-4 flex items-center gap-3" style={{ borderColor: "var(--warning)" }}>
          <span>⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-medium">등록된 캐릭터가 없습니다</p>
            <p className="text-xs" style={{ color: "var(--fg-muted)" }}>캐릭터를 먼저 등록하면 대본에서 자동으로 매칭됩니다</p>
          </div>
          <Link href={`/animate/${projectId}/characters`} className="text-sm font-medium" style={{ color: "var(--accent)" }}>캐릭터 등록 →</Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="card">
            <h3 className="font-semibold mb-3">대본 텍스트</h3>
            <p className="text-xs mb-3" style={{ color: "var(--fg-muted)" }}>
              씬 구분: &quot;씬 1:&quot;, &quot;---&quot;, &quot;##&quot; 등으로 구분 | 대사: &quot;캐릭터명: 대사&quot; 형식 | 지문: (괄호) 또는 [괄호]
            </p>
            <textarea
              className="w-full px-4 py-3 rounded-lg text-sm font-mono resize-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg)", minHeight: 300 }}
              value={script}
              onChange={e => setScript(e.target.value)}
              placeholder={`씬 1: 학교 앞 벚꽃길\n(아침, 벚꽃이 흩날리는 통학길)\n하루: 오늘도 좋은 하루가 될 것 같아!\n미카: 어서 와, 하루야. 늦겠다!\n\n---\n\n씬 2: 교실 안\n(수업 시작 직전의 분주한 교실)\n하루: 겨우 도착했다...\n선생님: 자, 수업 시작하겠습니다.`}
            />
            <div className="flex justify-end mt-3">
              <button className="btn-primary text-sm" onClick={handleParse} disabled={!script.trim() || parsing}>
                {parsing ? "파싱 중..." : "씬 분할 미리보기"}
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <h3 className="font-semibold mb-3">파싱 결과 ({parsed.length}개 씬)</h3>
            {parsed.length === 0 ? (
              <div className="text-center py-12" style={{ color: "var(--fg-muted)" }}>
                <p className="text-sm">대본을 입력하고 &quot;씬 분할 미리보기&quot;를 클릭하세요</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {parsed.map((scene, i) => (
                  <div key={i} className="p-3 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "var(--accent)", color: "#fff" }}>씬 {i + 1}</span>
                      <div className="flex gap-2 text-xs" style={{ color: "var(--fg-muted)" }}>
                        <span>{scene.duration}초</span>
                        <span>{CAMERA_LABELS[scene.cameraDirection] || scene.cameraDirection}</span>
                      </div>
                    </div>
                    {scene.description && <p className="text-sm mb-1">{scene.description}</p>}
                    {scene.dialogue && (
                      <div className="text-sm mt-2 p-2 rounded" style={{ background: "var(--bg-card)", color: "var(--fg-muted)" }}>
                        {scene.dialogue.split("\n").map((line, j) => <div key={j}>{line}</div>)}
                      </div>
                    )}
                    {scene.characterNames.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {scene.characterNames.map((name, j) => (
                          <span key={j} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>{name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {parsed.length > 0 && (
              <div className="flex justify-end mt-4">
                <button className="btn-primary text-sm" onClick={handleSave} disabled={saving}>
                  {saving ? "저장 중..." : `${parsed.length}개 씬 저장 & 다음 단계 →`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
