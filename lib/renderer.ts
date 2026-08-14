import { renderBgm, type BgmMood } from "./bgm";

const SHORTS_WIDTH = 1080;
const SHORTS_HEIGHT = 1920;
const LONGFORM_WIDTH = 1920;
const LONGFORM_HEIGHT = 1080;
const VIDEO_FPS = 30;

export interface SttSegment {
  start: number;
  end: number;
  text: string;
}

export interface RenderClipInput {
  id: string;
  videoUrl: string;
  narrationText: string;
  narrationAudio: ArrayBuffer | null;
  memo: string;
  sttSegments?: SttSegment[];
}

export type RenderQuality = "low" | "medium" | "high";

const QUALITY_BITRATE: Record<RenderQuality, number> = {
  low: 3_000_000,
  medium: 6_000_000,
  high: 10_000_000,
};

const QUALITY_SCALE: Record<RenderQuality, number> = {
  low: 0.5,
  medium: 0.75,
  high: 1,
};

export interface GameRenderOptions {
  clips: RenderClipInput[];
  mode: "shorts" | "longform";
  mood: BgmMood;
  quality?: RenderQuality;
  customBgm?: ArrayBuffer | null;
  onProgress?: (progress: { phase: string; ratio: number; message: string }) => void;
  signal?: AbortSignal;
}

export interface RenderResult {
  blob: Blob;
  durationSeconds: number;
  mimeType: string;
}

export interface SupportCheck {
  supported: boolean;
  mimeType: string | null;
  reason?: string;
}

const CANDIDATE_MIME_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/mp4;codecs=avc1,mp4a.40.2",
  "video/webm",
];

export function checkSupport(): SupportCheck {
  if (typeof window === "undefined") {
    return { supported: false, mimeType: null, reason: "브라우저에서만 동작합니다." };
  }
  if (typeof MediaRecorder === "undefined") {
    return { supported: false, mimeType: null, reason: "이 브라우저는 영상 녹화를 지원하지 않습니다." };
  }
  if (typeof HTMLCanvasElement.prototype.captureStream !== "function") {
    return { supported: false, mimeType: null, reason: "이 브라우저는 화면 캡처를 지원하지 않습니다." };
  }

  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (isIOS) {
    return {
      supported: false,
      mimeType: null,
      reason: "아이폰·아이패드는 영상 합성이 지원되지 않습니다. PC 크롬이나 안드로이드 크롬에서 렌더링해주세요.",
    };
  }

  const mimeType = CANDIDATE_MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
  if (!mimeType) {
    return { supported: false, mimeType: null, reason: "이 브라우저가 지원하는 영상 형식이 없습니다." };
  }

  return { supported: true, mimeType };
}

/* ------------------------------------------------------------------ */
/* Subtitles                                                           */
/* ------------------------------------------------------------------ */

interface SubtitleCue {
  text: string;
  start: number;
  end: number;
}

export function buildCues(narration: string, duration: number): SubtitleCue[] {
  const words = narration.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks: string[] = [];
  for (let i = 0; i < words.length; ) {
    const take = words[i].length >= 6 ? 1 : words[i].length >= 4 ? 2 : 3;
    chunks.push(words.slice(i, i + take).join(" "));
    i += take;
  }

  const weight = (s: string) => {
    const letters = s.replace(/[^\p{L}\p{N}]/gu, "").length;
    const marks = s.length - letters;
    return letters + marks * 0.3;
  };

  const total = chunks.reduce((sum, c) => sum + weight(c), 0) || 1;
  let elapsed = 0;
  return chunks.map((text) => {
    const span = (weight(text) / total) * duration;
    const cue = { text, start: elapsed, end: elapsed + span };
    elapsed += span;
    return cue;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";

  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);

    if (ctx.measureText(word).width <= maxWidth) {
      line = word;
      continue;
    }
    let piece = "";
    for (const ch of word) {
      if (ctx.measureText(piece + ch).width > maxWidth) {
        lines.push(piece);
        piece = ch;
      } else {
        piece += ch;
      }
    }
    line = piece;
  }

  if (line) lines.push(line);
  return lines;
}

/* ------------------------------------------------------------------ */
/* Preparation helpers                                                 */
/* ------------------------------------------------------------------ */

async function loadVideo(url: string, signal?: AbortSignal): Promise<HTMLVideoElement> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`영상을 불러오지 못했습니다 (${res.status}).`);
  const blob = await res.blob();

  const video = document.createElement("video");
  video.src = URL.createObjectURL(blob);
  video.muted = true;
  video.playsInline = true;
  video.loop = true;
  video.preload = "auto";

  await new Promise<void>((resolve, reject) => {
    const onReady = () => { off(); resolve(); };
    const onError = () => { off(); reject(new Error("영상을 재생할 수 없습니다.")); };
    const off = () => {
      video.removeEventListener("canplaythrough", onReady);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("canplaythrough", onReady);
    video.addEventListener("error", onError);
    video.load();
  });

  return video;
}

async function ensureFonts(): Promise<void> {
  if (!document.fonts) return;
  await Promise.all([
    document.fonts.load('800 76px "Noto Sans KR"'),
    document.fonts.load('700 64px "Noto Sans KR"'),
  ]).catch(() => {});
  await document.fonts.ready;
}

/* ------------------------------------------------------------------ */
/* Main render                                                         */
/* ------------------------------------------------------------------ */

export async function renderHighlight(options: GameRenderOptions): Promise<RenderResult> {
  const support = checkSupport();
  if (!support.supported || !support.mimeType) {
    throw new Error(support.reason ?? "이 브라우저에서는 렌더링할 수 없습니다.");
  }

  const { clips, mode, signal, quality = "high" } = options;
  const scale = QUALITY_SCALE[quality];
  const WIDTH = Math.round((mode === "shorts" ? SHORTS_WIDTH : LONGFORM_WIDTH) * scale);
  const HEIGHT = Math.round((mode === "shorts" ? SHORTS_HEIGHT : LONGFORM_HEIGHT) * scale);

  const report = (phase: string, ratio: number, message: string) =>
    options.onProgress?.({ phase, ratio, message });

  const audioCtx = new AudioContext();
  const videos: HTMLVideoElement[] = [];
  const objectUrls: string[] = [];

  const cleanup = () => {
    for (const v of videos) {
      v.pause();
      v.removeAttribute("src");
      v.load();
    }
    for (const url of objectUrls) URL.revokeObjectURL(url);
    audioCtx.close().catch(() => {});
  };

  try {
    report("prepare", 0.02, "글꼴을 준비하는 중…");
    await ensureFonts();

    report("prepare", 0.05, "나레이션 음성을 디코딩하는 중…");
    const narrationBuffers = await Promise.all(
      clips.map(async (clip) => {
        if (!clip.narrationAudio || clip.narrationAudio.byteLength === 0) return null;
        return audioCtx.decodeAudioData(clip.narrationAudio.slice(0));
      })
    );

    const durations = clips.map((clip, i) => {
      const audio = narrationBuffers[i];
      if (audio) return audio.duration + 0.5;
      return 10;
    });
    const totalDuration = durations.reduce((a, b) => a + b, 0);

    const starts: number[] = [];
    durations.reduce((acc, d) => {
      starts.push(acc);
      return acc + d;
    }, 0);

    const cues = clips.map((clip, i) =>
      buildCues(clip.narrationText, durations[i] - 0.35)
    );

    for (let i = 0; i < clips.length; i++) {
      if (signal?.aborted) throw new Error("취소되었습니다.");
      report("prepare", 0.1 + (0.5 * i) / clips.length, `${i + 1}번째 클립 영상을 받는 중…`);
      const video = await loadVideo(clips[i].videoUrl, signal);
      objectUrls.push(video.src);
      videos.push(video);
    }

    report("prepare", 0.65, "배경음악을 만드는 중…");
    let bgmBuffer: AudioBuffer | null = null;
    if (options.customBgm && options.customBgm.byteLength > 0) {
      bgmBuffer = await audioCtx.decodeAudioData(options.customBgm.slice(0)).catch(() => null);
    }
    if (!bgmBuffer) {
      bgmBuffer = await renderBgm(options.mood, totalDuration);
    }

    report("prepare", 0.75, "녹화를 준비하는 중…");

    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("캔버스를 만들 수 없습니다.");

    const stream = canvas.captureStream(VIDEO_FPS);
    const dest = audioCtx.createMediaStreamDestination();

    const narrationGain = audioCtx.createGain();
    narrationGain.gain.value = 1;
    narrationGain.connect(dest);

    const bgmGain = audioCtx.createGain();
    bgmGain.gain.value = 0.1;
    bgmGain.connect(dest);

    // Game audio mixed in at lower volume behind narration
    const gameAudioGain = audioCtx.createGain();
    gameAudioGain.gain.value = 0.25;
    gameAudioGain.connect(dest);

    for (const track of dest.stream.getAudioTracks()) stream.addTrack(track);

    const recorder = new MediaRecorder(stream, {
      mimeType: support.mimeType,
      videoBitsPerSecond: QUALITY_BITRATE[quality],
      audioBitsPerSecond: 128_000,
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const finished = new Promise<void>((resolve, reject) => {
      recorder.onstop = () => resolve();
      recorder.onerror = () => reject(new Error("녹화 중 오류가 발생했습니다."));
    });

    await audioCtx.resume();
    for (const video of videos) await video.play().catch(() => {});

    const t0 = audioCtx.currentTime + 0.15;

    narrationBuffers.forEach((buffer, i) => {
      if (!buffer) return;
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(narrationGain);
      source.start(t0 + starts[i]);
    });

    if (bgmBuffer) {
      const source = audioCtx.createBufferSource();
      source.buffer = bgmBuffer;
      source.loop = true;
      source.connect(bgmGain);
      source.start(t0);
      source.stop(t0 + totalDuration);
    }

    recorder.start(1000);

    let aborted: string | null = null;
    const onHidden = () => {
      if (document.visibilityState === "hidden") {
        aborted = "탭이 백그라운드로 가서 녹화가 중단되었습니다. 화면을 켜둔 채로 다시 시도해주세요.";
      }
    };
    document.addEventListener("visibilitychange", onHidden);

    await new Promise<void>((resolve) => {
      const frame = () => {
        const t = audioCtx.currentTime - t0;

        if (aborted || signal?.aborted) {
          resolve();
          return;
        }
        if (t >= totalDuration) {
          resolve();
          return;
        }

        if (t >= 0) {
          drawFrame(ctx, {
            t,
            clips,
            starts,
            durations,
            cues,
            videos,
            width: WIDTH,
            height: HEIGHT,
          });
          report("record", 0.8 + 0.2 * (t / totalDuration), `녹화 중… ${Math.ceil(totalDuration - t)}초 남음`);
        }

        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });

    document.removeEventListener("visibilitychange", onHidden);

    recorder.stop();
    await finished;

    if (aborted) throw new Error(aborted);
    if (signal?.aborted) throw new Error("취소되었습니다.");

    const blob = new Blob(chunks, { type: support.mimeType });
    if (blob.size === 0) throw new Error("녹화 결과가 비어 있습니다. 다시 시도해주세요.");

    report("done", 1, "완성되었습니다.");
    return { blob, durationSeconds: totalDuration, mimeType: support.mimeType };
  } finally {
    cleanup();
  }
}

/* ------------------------------------------------------------------ */
/* Frame drawing                                                       */
/* ------------------------------------------------------------------ */

interface FrameContext {
  t: number;
  clips: RenderClipInput[];
  starts: number[];
  durations: number[];
  cues: SubtitleCue[][];
  videos: HTMLVideoElement[];
  width: number;
  height: number;
}

const BG = "#12081f";
const CAPTION_COLOR = "#ffffff";
const CAPTION_HIGHLIGHT = "#6c5ce7";
const CUT_FADE = 0.15;

function drawFrame(ctx: CanvasRenderingContext2D, frame: FrameContext) {
  const { t, starts, durations, cues, videos, width, height } = frame;

  let index = starts.length - 1;
  for (let i = 0; i < starts.length; i++) {
    if (t >= starts[i] && t < starts[i] + durations[i]) {
      index = i;
      break;
    }
  }

  const local = t - starts[index];
  const progress = Math.min(1, Math.max(0, local / durations[index]));

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);

  const video = videos[index];
  if (video && video.videoWidth > 0) {
    ctx.save();
    if (local < CUT_FADE) ctx.globalAlpha = local / CUT_FADE;
    drawGameClip(ctx, video, index, progress, width, height);
    ctx.restore();
  }

  drawGradientScrim(ctx, width, height);
  drawCaption(ctx, frame.clips[index].memo, cues[index], local, width, height);

  const stt = frame.clips[index].sttSegments;
  if (stt && stt.length > 0) {
    drawSttSubtitle(ctx, stt, local, width, height);
  }
}

function drawGameClip(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  index: number,
  progress: number,
  canvasW: number,
  canvasH: number,
) {
  const zoom = 1.02 + 0.04 * progress;
  const panX = (index % 2 === 0 ? 1 : -1) * 15 * (progress - 0.5);
  const panY = (index % 3 === 0 ? 10 : -10) * (progress - 0.5);

  const scale = Math.max(canvasW / video.videoWidth, canvasH / video.videoHeight) * zoom;
  const drawW = video.videoWidth * scale;
  const drawH = video.videoHeight * scale;

  ctx.drawImage(
    video,
    (canvasW - drawW) / 2 + panX,
    (canvasH - drawH) / 2 + panY,
    drawW,
    drawH,
  );
}

function drawGradientScrim(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const bottom = ctx.createLinearGradient(0, height * 0.6, 0, height);
  bottom.addColorStop(0, "rgba(0,0,0,0)");
  bottom.addColorStop(1, "rgba(0,0,0,0.75)");
  ctx.fillStyle = bottom;
  ctx.fillRect(0, height * 0.6, width, height * 0.4);

  const top = ctx.createLinearGradient(0, 0, 0, height * 0.15);
  top.addColorStop(0, "rgba(0,0,0,0.4)");
  top.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, width, height * 0.15);
}

function drawCaption(
  ctx: CanvasRenderingContext2D,
  headline: string,
  sceneCues: SubtitleCue[],
  local: number,
  width: number,
  height: number,
) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const isPortrait = height > width;
  const headlineSize = isPortrait ? 72 : 48;
  const headlineY = isPortrait ? 380 : 80;

  if (headline) {
    ctx.font = `800 ${headlineSize}px "Noto Sans KR", sans-serif`;
    ctx.lineWidth = 12;
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.fillStyle = CAPTION_HIGHLIGHT;
    const lines = wrapText(ctx, headline, width - 120);
    lines.slice(0, 2).forEach((line, i) => {
      const y = headlineY + i * (headlineSize + 16);
      ctx.strokeText(line, width / 2, y);
      ctx.fillText(line, width / 2, y);
    });
  }

  if (sceneCues.length === 0) return;

  const found = sceneCues.findIndex((c) => local >= c.start && local < c.end);
  const current = found >= 0 ? found : sceneCues.length - 1;

  const from = Math.max(0, current - 1);
  const tokens: Token[] = sceneCues.slice(from, current + 2).map((cue, i) => ({
    text: cue.text,
    active: from + i === current,
  }));

  const captionY = isPortrait ? height - 460 : height - 120;
  const captionFontSize = isPortrait ? 56 : 36;
  const captionFontActiveSize = isPortrait ? 62 : 40;

  drawTokenLines(ctx, tokens, width - 100, captionY, width, captionFontSize, captionFontActiveSize);
}

interface Token {
  text: string;
  active: boolean;
}

function drawTokenLines(
  ctx: CanvasRenderingContext2D,
  tokens: Token[],
  maxWidth: number,
  bottomY: number,
  canvasW: number,
  fontSize: number,
  activeFontSize: number,
) {
  const lineHeight = fontSize + 20;
  const fontNormal = `700 ${fontSize}px "Noto Sans KR", sans-serif`;
  const fontActive = `800 ${activeFontSize}px "Noto Sans KR", sans-serif`;

  const measure = (token: Token) => {
    ctx.font = token.active ? fontActive : fontNormal;
    return ctx.measureText(token.text).width;
  };
  ctx.font = fontNormal;
  const spaceWidth = ctx.measureText(" ").width;

  const lines: { tokens: Token[]; width: number }[] = [];
  let line: Token[] = [];
  let width = 0;

  for (const token of tokens) {
    const tokenWidth = measure(token);
    const added = line.length === 0 ? tokenWidth : width + spaceWidth + tokenWidth;
    if (line.length > 0 && added > maxWidth) {
      lines.push({ tokens: line, width });
      line = [token];
      width = tokenWidth;
    } else {
      line.push(token);
      width = added;
    }
  }
  if (line.length > 0) lines.push({ tokens: line, width });

  const baseY = bottomY - (lines.length - 1) * lineHeight;

  ctx.textAlign = "left";
  lines.forEach(({ tokens: lineTokens, width: lineWidth }, lineIndex) => {
    const y = baseY + lineIndex * lineHeight;
    let x = (canvasW - lineWidth) / 2;

    for (const token of lineTokens) {
      ctx.save();
      ctx.font = token.active ? fontActive : fontNormal;
      ctx.lineWidth = 10;
      ctx.strokeStyle = "rgba(0,0,0,0.9)";
      ctx.fillStyle = token.active ? CAPTION_HIGHLIGHT : CAPTION_COLOR;
      if (token.active) {
        ctx.shadowColor = "rgba(108,92,231,0.6)";
        ctx.shadowBlur = 20;
      }
      ctx.strokeText(token.text, x, y);
      ctx.fillText(token.text, x, y);
      x += ctx.measureText(token.text).width + spaceWidth;
      ctx.restore();
    }
  });
  ctx.textAlign = "center";
}

function drawSttSubtitle(
  ctx: CanvasRenderingContext2D,
  segments: SttSegment[],
  local: number,
  width: number,
  height: number,
) {
  const seg = segments.find((s) => local >= s.start && local < s.end);
  if (!seg) return;

  const isPortrait = height > width;
  const fontSize = isPortrait ? 44 : 30;
  const y = isPortrait ? height - 280 : height - 200;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${fontSize}px "Noto Sans KR", sans-serif`;

  const lines = wrapText(ctx, seg.text, width - 120);
  const lineHeight = fontSize + 12;
  const totalH = lines.length * lineHeight;
  const padV = 14;
  const padH = 24;

  const maxLineW = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const bgW = Math.min(maxLineW + padH * 2, width - 40);
  const bgH = totalH + padV * 2;
  const bgX = (width - bgW) / 2;
  const bgY = y - totalH / 2 - padV;

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.beginPath();
  ctx.roundRect(bgX, bgY, bgW, bgH, 10);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  lines.forEach((line, i) => {
    ctx.fillText(line, width / 2, y - totalH / 2 + lineHeight / 2 + i * lineHeight);
  });

  ctx.restore();
}
