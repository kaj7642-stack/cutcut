import { writeFile } from "fs/promises";
import { isMockMode } from "./mock";
import { runFfmpeg } from "./media";
import type { TtsParams } from "../types";

/**
 * TTS 프로바이더 어댑터.
 *
 *   TTS_PROVIDER=openai  → OpenAI gpt-4o-mini-tts (SSML 미지원, style 지시문 사용)
 *   TTS_PROVIDER=google  → Google Cloud TTS (SSML 지원)
 *   TTS_PROVIDER=mock    → ffmpeg로 무음 mp3 생성 (키 불필요, 길이 측정 가능)
 */
export type TtsProviderName = "openai" | "google" | "mock";

export function resolveTtsProvider(): TtsProviderName {
  const explicit = process.env.TTS_PROVIDER?.toLowerCase();
  if (explicit === "openai" || explicit === "google" || explicit === "mock") return explicit;
  if (isMockMode()) return "mock";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GOOGLE_TTS_API_KEY) return "google";
  return "mock";
}

export function supportsSsml(provider: TtsProviderName): boolean {
  return provider === "google";
}

/** 화자 → 엔진 보이스 매핑. PIPELINE_VOICE_MAP(JSON)으로 덮어쓸 수 있다. */
export function voiceFor(provider: TtsProviderName, speakerId: string): string {
  const raw = process.env.PIPELINE_VOICE_MAP;
  if (raw) {
    try {
      const map = JSON.parse(raw) as Record<string, string>;
      if (map[speakerId]) return map[speakerId];
    } catch {
      // 잘못된 JSON은 무시하고 기본 보이스를 쓴다.
    }
  }

  if (provider === "google") {
    return speakerId === "narrator" ? "ko-KR-Neural2-C" : "ko-KR-Neural2-A";
  }
  return speakerId === "narrator"
    ? process.env.PIPELINE_NARRATOR_VOICE || "fable"
    : process.env.PIPELINE_CHARACTER_VOICE || "nova";
}

async function synthOpenAI(text: string, voice: string, params: TtsParams): Promise<Buffer> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY가 설정되어 있지 않습니다.");

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
      voice,
      input: text,
      speed: params.rate,
      instructions: params.style,
      response_format: "mp3",
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`TTS 실패 (${res.status}). ${detail.slice(0, 300)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function synthGoogle(
  text: string,
  ssml: string | undefined,
  voice: string,
  params: TtsParams,
): Promise<Buffer> {
  const key = process.env.GOOGLE_TTS_API_KEY;
  if (!key) throw new Error("GOOGLE_TTS_API_KEY가 설정되어 있지 않습니다.");

  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: ssml ? { ssml } : { text },
        voice: { languageCode: "ko-KR", name: voice },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: params.rate,
          sampleRateHertz: 24000,
        },
      }),
      signal: AbortSignal.timeout(120_000),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`TTS 실패 (${res.status}). ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as { audioContent?: string };
  if (!data.audioContent) throw new Error("음성 데이터를 받지 못했습니다.");
  return Buffer.from(data.audioContent, "base64");
}

/** mock: 한국어 발화 속도(약 5.5자/초)를 흉내낸 길이의 무음 mp3. */
async function synthMock(text: string, params: TtsParams, outputPath: string): Promise<void> {
  const charsPerSecond = 5.5 * params.rate;
  const seconds = Math.min(120, Math.max(1.5, text.length / charsPerSecond));
  await runFfmpeg([
    "-y",
    "-f", "lavfi",
    "-i", `anullsrc=channel_layout=mono:sample_rate=24000`,
    "-t", seconds.toFixed(3),
    "-c:a", "libmp3lame",
    "-b:a", "96k",
    outputPath,
  ]);
}

/** 지수 백오프 재시도를 포함한 씬 1개 음성 합성. */
export async function synthesizeToFile(args: {
  text: string;
  ssml?: string;
  speakerId: string;
  params: TtsParams;
  outputPath: string;
  retries?: number;
}): Promise<TtsProviderName> {
  const provider = resolveTtsProvider();
  const retries = args.retries ?? 2;

  if (provider === "mock") {
    await synthMock(args.text, args.params, args.outputPath);
    return provider;
  }

  const voice = voiceFor(provider, args.speakerId);
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const bytes =
        provider === "openai"
          ? await synthOpenAI(args.text, voice, args.params)
          : await synthGoogle(args.text, args.ssml, voice, args.params);
      await writeFile(args.outputPath, bytes);
      return provider;
    } catch (err) {
      lastError = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
