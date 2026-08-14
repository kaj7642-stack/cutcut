"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Clip, NarrationDraft, ProjectStatus, NarrationTone } from "@/lib/types";
import { NARRATION_TONES, TTS_VOICES } from "@/lib/types";
import { BGM_MOODS, type BgmMood } from "@/lib/bgm";
import { checkSupport, renderHighlight, type RenderClipInput, type RenderQuality } from "@/lib/renderer";
import { useToast } from "@/components/toast";
import { OnboardingOverlay } from "@/components/onboarding";
import { trackEvent } from "@/lib/analytics";
import { ThemeToggle } from "@/components/theme-toggle";
import { KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts";
import { VideoThumbnail } from "@/components/video-thumbnail";
import { saveDraft, loadDraft, clearDraft, type DraftData } from "@/lib/draft-storage";
import { RenderProgress } from "@/components/render-progress";
import { ClipPreviewModal } from "@/components/clip-preview-modal";

interface AuthUser {
  id: number;
  email: string;
  nickname: string | null;
}

interface SttSegment {
  start: number;
  end: number;
  text: string;
}

type InputMode = "file" | "youtube";

export default function StudioPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [freeLeft, setFreeLeft] = useState(3);
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/credits/consume").then((r) => r.json()),
    ])
      .then(([auth, cred]) => {
        setUser(auth.user);
        setFreeLeft(cred.freeLeft ?? 0);
        setCredits(cred.credits ?? 0);
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);

  const [status, setStatus] = useState<ProjectStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [projectId, setProjectId] = useState("");
  const [videoPath, setVideoPath] = useState("");
  const [filename, setFilename] = useState("");
  const [clips, setClips] = useState<Clip[]>([]);
  const [drafts, setDrafts] = useState<NarrationDraft[]>([]);
  const [selectedTone, setSelectedTone] = useState<NarrationTone>("funny");
  const [selectedVoice, setSelectedVoice] = useState(TTS_VOICES[0].id);
  const [error, setError] = useState("");
  const [outputMode, setOutputMode] = useState<"shorts" | "longform">("shorts");
  const [dragging, setDragging] = useState(false);
  const [bgmMood, setBgmMood] = useState<BgmMood>("bright");
  const [renderPhase, setRenderPhase] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [inputMode, setInputMode] = useState<InputMode>("file");
  const [ytUrl, setYtUrl] = useState("");

  const [sttResults, setSttResults] = useState<Record<string, SttSegment[]>>({});
  const [sttLoading, setSttLoading] = useState<Record<string, boolean>>({});
  const [includeStt, setIncludeStt] = useState(true);
  const [renderQuality, setRenderQuality] = useState<RenderQuality>("high");
  const [hasDraft, setHasDraft] = useState(false);
  const [previewClipId, setPreviewClipId] = useState<string | null>(null);

  const analyzeVideo = useCallback(async (pid: string, vpath: string) => {
    setStatus("detecting_spikes");
    setProgress(55);

    const analyzeRes = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: pid, videoPath: vpath }),
    });

    if (!analyzeRes.ok) {
      const data = await analyzeRes.json();
      setError(data.error || "분석 실패");
      setStatus("error");
      return;
    }

    const { clips: foundClips } = await analyzeRes.json();
    setClips(foundClips);
    setProgress(100);
    setStatus("done");
    trackEvent("upload_complete", { clips: foundClips.length });
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    setError("");
    setStatus("uploading");
    setProgress(0);
    setFilename(file.name);
    trackEvent("upload_start", { size: file.size, type: file.type });

    const formData = new FormData();
    formData.append("video", file);

    let uploadResult: { projectId: string; videoPath: string };
    try {
      uploadResult = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 50));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            try {
              const data = JSON.parse(xhr.responseText);
              reject(new Error(data.error || "업로드 실패"));
            } catch {
              reject(new Error("업로드 실패"));
            }
          }
        };
        xhr.onerror = () => reject(new Error("네트워크 오류"));
        xhr.send(formData);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 실패");
      setStatus("error");
      return;
    }

    const { projectId: pid, videoPath: vpath } = uploadResult;
    setProjectId(pid);
    setVideoPath(vpath);
    setProgress(50);

    await analyzeVideo(pid, vpath);
  }, [analyzeVideo]);

  const handleYoutubeSubmit = useCallback(async () => {
    if (!ytUrl.trim()) return;
    setError("");
    setStatus("downloading");
    setProgress(0);
    setFilename("");
    trackEvent("youtube_start");

    try {
      const res = await fetch("/api/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: ytUrl.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "유튜브 다운로드 실패");
        setStatus("error");
        return;
      }

      const { projectId: pid, filename: fname, videoPath: vpath } = await res.json();
      setProjectId(pid);
      setVideoPath(vpath);
      setFilename(fname);
      setProgress(50);

      await analyzeVideo(pid, vpath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "유튜브 다운로드 실패");
      setStatus("error");
    }
  }, [ytUrl, analyzeVideo]);

  const handleStt = useCallback(async (clipId: string, clipFile: string) => {
    if (!projectId) return;
    setSttLoading((prev) => ({ ...prev, [clipId]: true }));

    try {
      const res = await fetch("/api/stt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, clipFile }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast(data.error || "음성 인식 실패", "error");
        return;
      }

      const { segments } = await res.json();
      setSttResults((prev) => ({ ...prev, [clipId]: segments }));
      toast(`자막 추출 완료 (${segments.length}개 구간)`, "success");
    } catch {
      toast("음성 인식 중 오류가 발생했습니다.", "error");
    } finally {
      setSttLoading((prev) => ({ ...prev, [clipId]: false }));
    }
  }, [projectId]);

  const handleBatchStt = useCallback(async () => {
    if (!projectId || clips.length === 0) return;
    const pending = clips.filter((c) => !sttResults[c.id] && !sttLoading[c.id]);
    if (pending.length === 0) return;

    for (const clip of pending) {
      await handleStt(clip.id, clip.file);
    }
  }, [projectId, clips, sttResults, sttLoading, handleStt]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  const toggleClip = (id: string) => {
    setClips((prev) => prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c)));
  };

  const selectAll = () => {
    setClips((prev) => prev.map((c) => ({ ...c, selected: true })));
  };

  const deselectAll = () => {
    setClips((prev) => prev.map((c) => ({ ...c, selected: false })));
  };

  const updateMemo = (id: string, memo: string) => {
    setClips((prev) => prev.map((c) => (c.id === id ? { ...c, memo } : c)));
  };

  const updateDraftText = (clipId: string, text: string) => {
    setDrafts((prev) => prev.map((d) => (d.clip_id === clipId ? { ...d, text } : d)));
  };

  const moveClip = (index: number, direction: "up" | "down") => {
    setClips((prev) => {
      const next = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((c, i) => ({ ...c, index: i + 1 }));
    });
  };

  const generateNarrations = async () => {
    const selected = clips.filter((c) => c.selected && c.memo);
    if (selected.length === 0) {
      setError("메모가 작성된 클립을 1개 이상 선택하세요.");
      return;
    }

    setStatus("generating_scripts");
    setProgress(70);

    const res = await fetch("/api/narration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clips: selected, tone: selectedTone }),
    });

    if (!res.ok) {
      setError("나레이션 생성 실패");
      setStatus("error");
      return;
    }

    const { drafts: newDrafts } = await res.json();
    setDrafts(newDrafts);
    setProgress(85);
    setStatus("done");
  };

  const generateTts = async (text: string) => {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: selectedVoice, tone: selectedTone }),
    });

    if (!res.ok) return;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
  };

  const handleRender = async () => {
    if (!user) {
      window.location.href = "/login?redirect=/studio";
      return;
    }

    const support = checkSupport();
    if (!support.supported) {
      setError(support.reason || "렌더링을 지원하지 않는 브라우저입니다.");
      return;
    }

    const selectedClips = clips.filter((c) => c.selected);
    const clipsWithDrafts = selectedClips.filter((c) => drafts.find((d) => d.clip_id === c.id));

    if (clipsWithDrafts.length === 0) {
      setError("나레이션이 생성된 클립이 없습니다. 먼저 나레이션을 생성하세요.");
      return;
    }

    const consumeRes = await fetch("/api/credits/consume", { method: "POST" });
    if (!consumeRes.ok) {
      const data = await consumeRes.json();
      if (data.needCredits) {
        setError("렌더링 크레딧이 부족합니다. 요금제 페이지에서 충전하세요.");
        return;
      }
      setError(data.error || "크레딧 확인에 실패했습니다.");
      return;
    }

    const consumeData = await consumeRes.json();
    if (consumeData.method === "free") {
      setFreeLeft(consumeData.freeLeft);
    } else {
      setCredits(consumeData.credits);
    }

    setStatus("rendering");
    setProgress(0);
    setRenderPhase("TTS 음성을 생성하는 중…");
    trackEvent("render_start", { clips: clipsWithDrafts.length, mode: outputMode });

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const renderInputs: RenderClipInput[] = [];

      for (let i = 0; i < clipsWithDrafts.length; i++) {
        const clip = clipsWithDrafts[i];
        const draft = drafts.find((d) => d.clip_id === clip.id)!;

        setRenderPhase(`TTS 음성 생성 중… (${i + 1}/${clipsWithDrafts.length})`);
        setProgress(Math.round((i / clipsWithDrafts.length) * 30));

        let narrationAudio: ArrayBuffer | null = null;
        const ttsRes = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: draft.text, voice: selectedVoice, tone: selectedTone }),
          signal: abort.signal,
        });

        if (ttsRes.ok) {
          narrationAudio = await ttsRes.arrayBuffer();
        }

        renderInputs.push({
          id: clip.id,
          videoUrl: `/api/clips/${projectId}/${clip.file}`,
          narrationText: draft.text,
          narrationAudio,
          memo: clip.memo,
          sttSegments: includeStt ? sttResults[clip.id] : undefined,
        });
      }

      setRenderPhase("영상을 합성하는 중…");
      setProgress(30);

      const result = await renderHighlight({
        clips: renderInputs,
        mode: outputMode,
        mood: bgmMood,
        quality: renderQuality,
        onProgress: ({ ratio, message }) => {
          setProgress(Math.round(30 + ratio * 70));
          setRenderPhase(message);
        },
        signal: abort.signal,
      });

      const url = URL.createObjectURL(result.blob);
      setResultUrl(url);
      setStatus("done");
      setProgress(100);
      setRenderPhase("");
      trackEvent("render_complete", { clips: clipsWithDrafts.length, mode: outputMode });

      const totalDur = clipsWithDrafts.reduce((s, c) => s + c.end - c.start, 0);
      fetch("/api/renders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          filename,
          mode: outputMode,
          quality: renderQuality,
          clipsCount: clipsWithDrafts.length,
          totalDuration: totalDur,
        }),
      }).catch(() => {});

      if (document.hidden && Notification.permission === "granted") {
        new Notification("클립AI", { body: "영상 렌더링이 완료되었습니다!", icon: "/icon.svg" });
      }
    } catch (err) {
      if (abort.signal.aborted) {
        setStatus("done");
        setRenderPhase("");
        return;
      }
      setError(err instanceof Error ? err.message : "렌더링 실패");
      setStatus("error");
    } finally {
      abortRef.current = null;
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    const ext = resultUrl.includes("mp4") ? "mp4" : "webm";
    const base = filename.replace(/\.[^.]+$/, "");
    a.download = `${base}_${outputMode === "shorts" ? "shorts" : "highlight"}.${ext}`;
    a.click();
  };

  const handleCancelRender = () => {
    abortRef.current?.abort();
  };

  const resetProject = () => {
    setResultUrl("");
    setClips([]);
    setDrafts([]);
    setProjectId("");
    setVideoPath("");
    setFilename("");
    setStatus("idle");
    setProgress(0);
    setError("");
    setYtUrl("");
    setSttResults({});
    setSttLoading({});
    clearDraft();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (previewClipId) return;
      if (e.key === "Escape") {
        if (status === "rendering") {
          handleCancelRender();
        } else if (resultUrl) {
          resetProject();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [status, resultUrl, previewClipId]);

  useEffect(() => {
    const processing = ["uploading", "downloading", "extracting_audio", "detecting_spikes", "cutting_clips", "generating_scripts", "generating_tts", "rendering"].includes(status);
    if (!processing) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [status]);

  const exportNarrations = () => {
    if (drafts.length === 0) return;
    const lines = drafts.map((d, i) => {
      const clip = clips.find((c) => c.id === d.clip_id);
      return `[클립 ${i + 1}] ${clip?.file ?? ""}\n${d.text}\n`;
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${filename.replace(/\.[^.]+$/, "") || "narrations"}_scripts.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  useEffect(() => {
    const draft = loadDraft();
    if (draft && draft.clips.length > 0) {
      setHasDraft(true);
    }
  }, []);

  const restoreDraft = useCallback(() => {
    const draft = loadDraft();
    if (!draft) return;
    setProjectId(draft.projectId);
    setVideoPath(draft.videoPath);
    setFilename(draft.filename);
    setClips(draft.clips as Clip[]);
    setDrafts(draft.drafts as NarrationDraft[]);
    setSelectedTone(draft.selectedTone as NarrationTone);
    setSelectedVoice(draft.selectedVoice);
    setOutputMode(draft.outputMode as "shorts" | "longform");
    setBgmMood(draft.bgmMood as BgmMood);
    setRenderQuality(draft.renderQuality as RenderQuality);
    setIncludeStt(draft.includeStt);
    setSttResults(draft.sttResults as Record<string, SttSegment[]>);
    setStatus("done");
    setHasDraft(false);
    toast("이전 작업을 복원했습니다.", "success");
  }, [toast]);

  const isProcessing = ["uploading", "downloading", "extracting_audio", "detecting_spikes", "cutting_clips", "generating_scripts", "generating_tts", "rendering"].includes(status);

  useEffect(() => {
    if (clips.length === 0 || isProcessing) return;
    const data: DraftData = {
      projectId, videoPath, filename,
      clips, drafts, selectedTone, selectedVoice,
      outputMode, bgmMood, renderQuality, includeStt,
      sttResults, savedAt: Date.now(),
    };
    saveDraft(data);
  }, [clips, drafts, selectedTone, selectedVoice, outputMode, bgmMood, renderQuality, includeStt, sttResults, projectId, videoPath, filename, isProcessing]);
  const selectedCount = clips.filter((c) => c.selected).length;
  const readyCount = clips.filter((c) => c.selected && c.memo).length;
  const canRender = freeLeft > 0 || credits > 0;

  return (
    <main className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
      {status === "idle" && <OnboardingOverlay />}
      <KeyboardShortcutsHelp />
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <a href="/" className="text-xl font-bold" style={{ color: "var(--accent)" }}>
          클립AI
        </a>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="flex gap-2">
            <button
              className={`tone-chip ${outputMode === "shorts" ? "active" : ""}`}
              onClick={() => setOutputMode("shorts")}
            >
              📱 쇼츠
            </button>
            <button
              className={`tone-chip ${outputMode === "longform" ? "active" : ""}`}
              onClick={() => setOutputMode("longform")}
            >
              🖥️ 롱폼
            </button>
          </div>
          {!authLoading && (
            user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>
                  {freeLeft > 0 ? `무료 ${freeLeft}회` : `${credits}크레딧`}
                </span>
                <a
                  href="/mypage"
                  className="text-sm hover:underline"
                  style={{ color: "var(--fg-muted)" }}
                >
                  {user.nickname || user.email.split("@")[0]}
                </a>
                <button
                  className="text-xs px-2 py-1 rounded"
                  style={{ color: "var(--fg-muted)", border: "1px solid var(--border)" }}
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" });
                    setUser(null);
                  }}
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <a
                href="/login?redirect=/studio"
                className="text-sm px-3 py-1.5 rounded-lg"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                로그인
              </a>
            )
          )}
        </div>
      </div>

      {/* Draft Recovery Banner */}
      {hasDraft && status === "idle" && (
        <div
          className="card mb-4 flex items-center justify-between"
          style={{ borderColor: "var(--accent)" }}
        >
          <div>
            <div className="text-sm font-medium">이전 작업이 저장되어 있습니다</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--fg-muted)" }}>
              24시간 이내 작업을 이어서 할 수 있습니다
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="text-sm px-3 py-1.5 rounded-lg"
              style={{ background: "var(--accent)", color: "#fff" }}
              onClick={restoreDraft}
            >
              복원하기
            </button>
            <button
              className="text-sm px-3 py-1.5 rounded-lg"
              style={{ border: "1px solid var(--border)", color: "var(--fg-muted)" }}
              onClick={() => { clearDraft(); setHasDraft(false); }}
            >
              무시
            </button>
          </div>
        </div>
      )}

      {/* Upload Zone */}
      {status === "idle" && (
        <div>
          {/* Input Mode Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              className={`tone-chip ${inputMode === "file" ? "active" : ""}`}
              onClick={() => setInputMode("file")}
            >
              📁 파일 업로드
            </button>
            <button
              className={`tone-chip ${inputMode === "youtube" ? "active" : ""}`}
              onClick={() => setInputMode("youtube")}
            >
              ▶️ 유튜브 URL
            </button>
          </div>

          {inputMode === "file" ? (
            <div
              role="button"
              tabIndex={0}
              aria-label="게임 영상 파일 업로드"
              className={`upload-zone ${dragging ? "dragging" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
            >
              <div className="text-5xl mb-4">🎮</div>
              <div className="text-xl font-semibold mb-2">게임 녹화 파일을 여기에 놓으세요</div>
              <div style={{ color: "var(--fg-muted)" }}>
                MP4, MKV, AVI, MOV, WebM (최대 500MB)
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            <div className="card">
              <div className="text-3xl mb-4 text-center">▶️</div>
              <div className="text-center font-semibold mb-4">유튜브 영상 URL을 입력하세요</div>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=... 또는 https://youtu.be/..."
                  value={ytUrl}
                  onChange={(e) => setYtUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleYoutubeSubmit(); }}
                  className="flex-1 px-4 py-3 rounded-lg text-sm"
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: "var(--fg)",
                  }}
                />
                <button
                  className="btn-primary px-6"
                  disabled={!ytUrl.trim()}
                  onClick={handleYoutubeSubmit}
                >
                  분석 시작
                </button>
              </div>
              <div className="text-xs mt-3 text-center" style={{ color: "var(--fg-muted)" }}>
                공개 영상만 지원 · 최대 60분 · 쇼츠 URL도 가능
              </div>
            </div>
          )}

          {/* Quick tips */}
          <div className="grid sm:grid-cols-3 gap-3 mt-6">
            {[
              { icon: "⚡", text: "음량 스파이크로 킬/클러치를 자동 감지" },
              { icon: "🎤", text: "AI가 상황에 맞는 나레이션 자동 생성" },
              { icon: "📱", text: "쇼츠(9:16)와 롱폼(16:9) 모두 지원" },
            ].map((tip) => (
              <div
                key={tip.text}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <span className="text-lg">{tip.icon}</span>
                <span style={{ color: "var(--fg-muted)" }}>{tip.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processing Status */}
      {isProcessing && (
        <RenderProgress
          status={status}
          progress={progress}
          renderPhase={renderPhase}
          onCancel={handleCancelRender}
        />
      )}

      {/* Error */}
      {error && (
        <div className="card mb-6" style={{ borderColor: "var(--danger)" }}>
          <div className="text-sm" style={{ color: "var(--danger)" }}>{error}</div>
          <div className="flex gap-2 mt-3">
            <button
              className="btn-ghost text-sm"
              onClick={() => { setError(""); setStatus(clips.length > 0 ? "done" : "idle"); }}
            >
              다시 시도
            </button>
            <button className="btn-ghost text-sm" onClick={resetProject}>
              처음부터 다시
            </button>
            {error.includes("크레딧") && (
              <a href="/pricing" className="btn-primary text-sm">
                크레딧 충전
              </a>
            )}
          </div>
        </div>
      )}

      {/* Render Result */}
      {resultUrl && !isProcessing && (
        <div className="card mb-8 text-center">
          <div className="text-3xl mb-3">🎉</div>
          <h3 className="text-xl font-bold mb-4">영상이 완성되었습니다!</h3>
          <div className="mb-4">
            <video
              src={resultUrl}
              controls
              className="mx-auto rounded-lg"
              style={{
                maxWidth: outputMode === "shorts" ? "320px" : "100%",
                maxHeight: "500px",
              }}
            />
          </div>
          <div className="flex gap-3 justify-center flex-wrap">
            <button className="btn-primary" onClick={handleDownload}>
              ⬇️ 다운로드
            </button>
            <button
              className="btn-ghost"
              onClick={async () => {
                if (navigator.share && resultUrl) {
                  const blob = await fetch(resultUrl).then((r) => r.blob());
                  const file = new File([blob], `${filename.replace(/\.[^.]+$/, "")}_clip.webm`, { type: blob.type });
                  try {
                    await navigator.share({ files: [file], title: "클립AI로 만든 하이라이트" });
                    trackEvent("share");
                    toast("공유 완료!", "success");
                  } catch { /* cancelled */ }
                } else {
                  toast("이 브라우저에서는 공유가 지원되지 않습니다. 다운로드 후 공유해주세요.", "info");
                }
              }}
            >
              📤 공유
            </button>
            <button
              className="btn-ghost"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `클립AI로 만든 게임 하이라이트를 확인해보세요!\nhttps://clipai.kr`
                  );
                  toast("클립보드에 복사되었습니다!", "success");
                } catch {
                  toast("복사에 실패했습니다.", "error");
                }
              }}
            >
              📋 링크 복사
            </button>
            <button
              className="btn-ghost"
              onClick={() => { setResultUrl(""); }}
            >
              다시 편집
            </button>
            <button className="btn-ghost" onClick={resetProject}>
              새 프로젝트
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {clips.length > 0 && !isProcessing && (
        <>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {filename} — {clips.length}개 편집점
                <span className="text-sm font-normal ml-2" style={{ color: "var(--fg-muted)" }}>
                  (선택 {Math.round(clips.filter(c => c.selected).reduce((s, c) => s + c.end - c.start, 0))}초)
                </span>
              </h2>
              <div className="flex items-center gap-3">
                <div className="text-sm" style={{ color: "var(--fg-muted)" }}>
                  {selectedCount}개 선택됨
                </div>
                <div className="flex gap-1">
                  <button
                    className="text-xs px-2 py-1 rounded"
                    style={{ border: "1px solid var(--border)", color: "var(--fg-muted)" }}
                    onClick={selectAll}
                  >
                    전체 선택
                  </button>
                  <button
                    className="text-xs px-2 py-1 rounded"
                    style={{ border: "1px solid var(--border)", color: "var(--fg-muted)" }}
                    onClick={deselectAll}
                  >
                    전체 해제
                  </button>
                  <button
                    className="text-xs px-2 py-1 rounded"
                    style={{
                      border: "1px solid var(--border)",
                      color: Object.keys(sttResults).length === clips.length ? "var(--success)" : "var(--accent)",
                    }}
                    onClick={handleBatchStt}
                    disabled={Object.values(sttLoading).some(Boolean)}
                  >
                    {Object.values(sttLoading).some(Boolean)
                      ? "🔤 자막 추출 중..."
                      : Object.keys(sttResults).length === clips.length
                        ? "🔤 자막 완료"
                        : "🔤 전체 자막"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Clip List */}
          <div className="grid gap-4 mb-8">
            {clips.map((clip, clipIdx) => (
              <div key={clip.id} className={`clip-card ${clip.selected ? "selected" : ""}`}>
                <div className="flex gap-4 p-4">
                  {/* Video Preview */}
                  <div className="shrink-0 flex flex-col items-center gap-1">
                    <div
                      className="cursor-pointer"
                      onClick={() => setPreviewClipId(clip.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter") setPreviewClipId(clip.id); }}
                    >
                      <VideoThumbnail
                        src={`/api/clips/${projectId}/${clip.file}`}
                        className="w-48 h-28 object-cover rounded-lg hover:opacity-80 transition-opacity"
                      />
                    </div>
                    {outputMode === "longform" && clip.selected && (
                      <div className="flex gap-1">
                        <button
                          className="text-xs px-2 py-0.5 rounded"
                          style={{ border: "1px solid var(--border)", color: "var(--fg-muted)" }}
                          onClick={() => moveClip(clipIdx, "up")}
                          disabled={clipIdx === 0}
                        >
                          ↑
                        </button>
                        <button
                          className="text-xs px-2 py-0.5 rounded"
                          style={{ border: "1px solid var(--border)", color: "var(--fg-muted)" }}
                          onClick={() => moveClip(clipIdx, "down")}
                          disabled={clipIdx === clips.length - 1}
                        >
                          ↓
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">
                        클립 {clip.index}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          className="text-xs px-2 py-1 rounded"
                          style={{
                            background: sttResults[clip.id] ? "var(--accent-glow)" : "var(--bg)",
                            border: "1px solid var(--border)",
                            color: sttResults[clip.id] ? "var(--accent)" : "var(--fg-muted)",
                          }}
                          disabled={sttLoading[clip.id]}
                          onClick={() => handleStt(clip.id, clip.file)}
                        >
                          {sttLoading[clip.id] ? "인식 중..." : sttResults[clip.id] ? "🔤 자막 갱신" : "🔤 원본 자막"}
                        </button>
                        <button
                          className={`px-3 py-1 rounded-full text-sm ${clip.selected ? "text-white" : ""}`}
                          style={{
                            background: clip.selected ? "var(--accent)" : "var(--bg)",
                            border: "1px solid var(--border)",
                          }}
                          onClick={() => toggleClip(clip.id)}
                        >
                          {clip.selected ? "선택됨" : "선택"}
                        </button>
                      </div>
                    </div>
                    <div className="text-sm mb-2" style={{ color: "var(--fg-muted)" }}>
                      {clip.start}s ~ {clip.end}s ({clip.duration}초)
                      &nbsp;·&nbsp; 강도 {Math.max(...clip.spikes.map((s) => s.intensity))}/10
                    </div>
                    <input
                      type="text"
                      placeholder="무슨 상황이었나요? (예: 1v3 역전 킬, 탑 솔킬 당함)"
                      value={clip.memo}
                      onChange={(e) => updateMemo(clip.id, e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        background: "var(--bg)",
                        border: "1px solid var(--border)",
                        color: "var(--fg)",
                      }}
                    />

                    {/* STT Results */}
                    {sttResults[clip.id] && sttResults[clip.id].length > 0 && (
                      <div className="mt-2 p-3 rounded-lg text-sm" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span style={{ color: "var(--success)" }}>🔤 원본 음성 자막</span>
                          <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
                            {sttResults[clip.id].length}개 구간
                          </span>
                        </div>
                        <div className="space-y-1">
                          {sttResults[clip.id].map((seg, i) => (
                            <div key={i} className="flex gap-2 text-xs">
                              <span className="shrink-0 font-mono" style={{ color: "var(--fg-muted)" }}>
                                {seg.start.toFixed(1)}s
                              </span>
                              <span>{seg.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {sttResults[clip.id] && sttResults[clip.id].length === 0 && (
                      <div className="mt-2 text-xs" style={{ color: "var(--fg-muted)" }}>
                        이 클립에서 음성이 감지되지 않았습니다.
                      </div>
                    )}

                    {/* Editable narration draft */}
                    {drafts.find((d) => d.clip_id === clip.id) && (
                      <div className="mt-2 p-3 rounded-lg text-sm" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                        <div className="flex items-center justify-between mb-1">
                          <span style={{ color: "var(--accent)" }}>나레이션 초안</span>
                          <button
                            className="text-xs px-2 py-1 rounded"
                            style={{ background: "var(--accent-glow)", color: "var(--accent)" }}
                            onClick={() => {
                              const draft = drafts.find((d) => d.clip_id === clip.id);
                              if (draft) generateTts(draft.text);
                            }}
                          >
                            🔊 미리듣기
                          </button>
                        </div>
                        <textarea
                          value={drafts.find((d) => d.clip_id === clip.id)?.text ?? ""}
                          onChange={(e) => updateDraftText(clip.id, e.target.value)}
                          rows={2}
                          className="w-full px-2 py-1.5 rounded text-sm resize-none"
                          style={{
                            background: "var(--bg-card)",
                            border: "1px solid var(--border)",
                            color: "var(--fg)",
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Narration & Render Controls */}
          <div className="card mb-8">
            <h3 className="font-semibold mb-4">나레이션 설정</h3>

            <div className="mb-4">
              <div className="text-sm mb-2" style={{ color: "var(--fg-muted)" }}>톤 선택</div>
              <div className="flex flex-wrap gap-2">
                {NARRATION_TONES.map((tone) => (
                  <button
                    key={tone.key}
                    className={`tone-chip ${selectedTone === tone.key ? "active" : ""}`}
                    onClick={() => setSelectedTone(tone.key as NarrationTone)}
                  >
                    {tone.icon} {tone.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <div className="text-sm mb-2" style={{ color: "var(--fg-muted)" }}>음성 선택</div>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  color: "var(--fg)",
                }}
              >
                {TTS_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <div className="text-sm mb-2" style={{ color: "var(--fg-muted)" }}>배경음악</div>
              <div className="flex flex-wrap gap-2">
                {BGM_MOODS.map((mood) => (
                  <button
                    key={mood.id}
                    className={`tone-chip ${bgmMood === mood.id ? "active" : ""}`}
                    onClick={() => setBgmMood(mood.id)}
                  >
                    {mood.label}
                  </button>
                ))}
              </div>
            </div>

            {Object.keys(sttResults).length > 0 && (
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={includeStt}
                    onChange={(e) => setIncludeStt(e.target.checked)}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <span>렌더링에 원본 음성 자막 포함</span>
                  <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
                    (STT로 추출한 자막이 영상에 표시됩니다)
                  </span>
                </label>
              </div>
            )}

            {/* Quality selector */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm" style={{ color: "var(--fg-muted)" }}>화질:</span>
              <div className="flex gap-1">
                {([
                  { id: "low" as const, label: "저화질", desc: "빠른 렌더링" },
                  { id: "medium" as const, label: "중화질", desc: "균형" },
                  { id: "high" as const, label: "고화질", desc: "최고 품질" },
                ]).map((q) => (
                  <button
                    key={q.id}
                    className={`tone-chip ${renderQuality === q.id ? "active" : ""}`}
                    onClick={() => setRenderQuality(q.id)}
                    title={q.desc}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                className="btn-primary"
                disabled={isProcessing || readyCount === 0}
                onClick={generateNarrations}
              >
                🎙️ 나레이션 생성
              </button>
              {drafts.length > 0 && (
                <button
                  className="btn-primary"
                  disabled={isProcessing}
                  onClick={handleRender}
                >
                  🎬 {outputMode === "shorts" ? "쇼츠" : "롱폼"} 렌더링
                  {user && (
                    <span className="ml-1 text-xs opacity-75">
                      ({freeLeft > 0 ? "무료" : "1크레딧"})
                    </span>
                  )}
                </button>
              )}
              {drafts.length > 0 && (
                <button className="btn-ghost" onClick={exportNarrations} title="나레이션 스크립트를 텍스트 파일로 내보내기">
                  📝 스크립트 저장
                </button>
              )}
              {drafts.length > 0 && !canRender && user && (
                <a href="/pricing" className="btn-ghost">
                  크레딧 충전
                </a>
              )}
            </div>

            {readyCount === 0 && (
              <div className="mt-2 text-sm" style={{ color: "var(--fg-muted)" }}>
                클립을 선택하고 상황 메모를 작성하면 나레이션을 생성할 수 있습니다.
              </div>
            )}

            {drafts.length > 0 && selectedCount > 0 && (
              <div className="mt-2 text-sm" style={{ color: "var(--fg-muted)" }}>
                나레이션 텍스트를 자유롭게 수정한 뒤 렌더링하세요. 탭을 켜둔 상태로 기다려주세요.
              </div>
            )}
          </div>
        </>
      )}

      {/* Clip Preview Modal */}
      {previewClipId && (() => {
        const previewIdx = clips.findIndex((c) => c.id === previewClipId);
        const previewClip = clips[previewIdx];
        if (!previewClip) return null;
        return (
          <ClipPreviewModal
            clip={previewClip}
            projectId={projectId}
            totalClips={clips.length}
            sttSegments={sttResults[previewClip.id]}
            narrationText={drafts.find((d) => d.clip_id === previewClip.id)?.text}
            onClose={() => setPreviewClipId(null)}
            onToggleSelect={toggleClip}
            onUpdateMemo={updateMemo}
            onNavigate={(dir) => {
              const newIdx = dir === "prev" ? previewIdx - 1 : previewIdx + 1;
              if (newIdx >= 0 && newIdx < clips.length) {
                setPreviewClipId(clips[newIdx].id);
              }
            }}
          />
        );
      })()}

      {/* Keyboard hint */}
      <div className="text-center mt-8 text-xs hidden sm:block" style={{ color: "var(--fg-muted)" }}>
        <kbd className="px-1.5 py-0.5 rounded font-mono" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>?</kbd> 단축키 보기
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-bottom-nav">
        <a href="/">
          <span className="text-base">🏠</span>
          <span>홈</span>
        </a>
        <a href="/studio" className="active">
          <span className="text-base">🎬</span>
          <span>스튜디오</span>
        </a>
        <a href="/pricing">
          <span className="text-base">💰</span>
          <span>요금제</span>
        </a>
        <a href={user ? "/mypage" : "/login?redirect=/studio"}>
          <span className="text-base">👤</span>
          <span>{user ? "마이페이지" : "로그인"}</span>
        </a>
      </nav>
    </main>
  );
}
