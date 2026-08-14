import { TTS_VOICES } from "./types";

function providerFor(voice: string): "google" | "openai" {
  return TTS_VOICES.find((v) => v.id === voice)?.provider ?? "openai";
}

export function ttsAvailable(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.GOOGLE_TTS_API_KEY);
}

async function synthesizeOpenAI(
  text: string,
  voice: string,
  rate: number,
  instructions?: string,
): Promise<ArrayBuffer> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY가 설정되어 있지 않습니다.");

  const body: Record<string, unknown> = {
    model: "gpt-4o-mini-tts",
    voice,
    input: text,
    speed: rate,
    response_format: "mp3",
  };
  if (instructions) body.instructions = instructions;

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`TTS 실패 (${res.status}). ${detail.slice(0, 200)}`);
  }
  return res.arrayBuffer();
}

async function synthesizeGoogle(
  text: string,
  voice: string,
  rate: number,
): Promise<ArrayBuffer> {
  const key = process.env.GOOGLE_TTS_API_KEY;
  if (!key) throw new Error("GOOGLE_TTS_API_KEY가 설정되어 있지 않습니다.");

  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "ko-KR", name: voice },
        audioConfig: { audioEncoding: "MP3", speakingRate: rate, sampleRateHertz: 24000 },
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`TTS 실패 (${res.status}). ${detail.slice(0, 200)}`);
  }

  const data = (await res.json()) as { audioContent?: string };
  if (!data.audioContent) throw new Error("음성 데이터를 받지 못했습니다.");
  return Buffer.from(data.audioContent, "base64").buffer as ArrayBuffer;
}

const TONE_INSTRUCTIONS: Record<string, string> = {
  funny: "예능 프로그램 자막 느낌으로 읽어줘. 약간 장난스럽고 가벼운 톤. 중간중간 살짝 웃음이 섞인 듯한 느낌.",
  hype: "흥분된 e스포츠 실황 중계 느낌. 에너지 넘치고 빠르게. 킬 장면에서 확 올라가는 텐션.",
  documentary: "다큐멘터리 나레이터 톤. 차분하고 진지하게. MBC 인간극장 나레이션 느낌.",
  roast: "담담하고 건조한 톤. 감정 없이 팩트만 말하는 느낌. 자기비하를 담담하게 말하는 코미디.",
};

export async function synthesize(options: {
  text: string;
  voice: string;
  tone?: string;
  rate?: number;
}): Promise<ArrayBuffer> {
  const text = options.text.trim();
  if (!text) throw new Error("읽을 문장이 비어 있습니다.");

  const rate = Math.min(2, Math.max(0.5, options.rate ?? 1.1));
  const preferred = providerFor(options.voice);
  const instructions = options.tone ? TONE_INSTRUCTIONS[options.tone] : undefined;

  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasGoogle = Boolean(process.env.GOOGLE_TTS_API_KEY);

  if (preferred === "openai" && hasOpenAI) return synthesizeOpenAI(text, options.voice, rate, instructions);
  if (preferred === "google" && hasGoogle) return synthesizeGoogle(text, options.voice, rate);

  if (hasOpenAI) return synthesizeOpenAI(text, "nova", rate, instructions);
  if (hasGoogle) return synthesizeGoogle(text, "ko-KR-Neural2-A", rate);

  throw new Error("TTS 키가 없습니다. OPENAI_API_KEY 또는 GOOGLE_TTS_API_KEY를 설정해주세요.");
}
