// ─────────────────────────────────────────
// Adapter Registry – plug in real APIs here
// ─────────────────────────────────────────
import type { ImageGenAdapter, VideoGenAdapter, TtsAdapter } from "./types";
import { mockImageGen, mockVideoGen, mockTts } from "./mock";
import { get } from "../db";
import type { ApiSetting } from "../types";

// Registry maps
const imageAdapters: Record<string, () => ImageGenAdapter> = {
  mock: () => mockImageGen,
  // Add real adapters here:
  // "stability": () => new StabilityAdapter(apiKey),
  // "dalle": () => new DalleAdapter(apiKey),
  // "midjourney": () => new MidjourneyAdapter(apiKey),
};

const videoAdapters: Record<string, () => VideoGenAdapter> = {
  mock: () => mockVideoGen,
  // "runway": () => new RunwayAdapter(apiKey),
  // "pika": () => new PikaAdapter(apiKey),
  // "kling": () => new KlingAdapter(apiKey),
};

const ttsAdapters: Record<string, () => TtsAdapter> = {
  mock: () => mockTts,
  // "openai": () => new OpenAITtsAdapter(apiKey),
  // "elevenlabs": () => new ElevenLabsAdapter(apiKey),
  // "google": () => new GoogleTtsAdapter(apiKey),
};

function getSettingFor(type: "image_gen" | "video_gen" | "tts"): ApiSetting | undefined {
  return get<ApiSetting>(
    "SELECT * FROM api_settings WHERE provider_type = $type ORDER BY updated_at DESC LIMIT 1",
    { type }
  );
}

export function getImageAdapter(): ImageGenAdapter {
  const setting = getSettingFor("image_gen");
  const name = setting?.provider_name || "mock";
  const factory = imageAdapters[name];
  if (!factory) return mockImageGen;
  return factory();
}

export function getVideoAdapter(): VideoGenAdapter {
  const setting = getSettingFor("video_gen");
  const name = setting?.provider_name || "mock";
  const factory = videoAdapters[name];
  if (!factory) return mockVideoGen;
  return factory();
}

export function getTtsAdapter(): TtsAdapter {
  const setting = getSettingFor("tts");
  const name = setting?.provider_name || "mock";
  const factory = ttsAdapters[name];
  if (!factory) return mockTts;
  return factory();
}

export { imageAdapters, videoAdapters, ttsAdapters };
