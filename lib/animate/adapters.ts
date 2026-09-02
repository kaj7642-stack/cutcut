import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { ImageGenAdapter, VideoGenAdapter, TTSGenAdapter, ImageGenResult, VideoGenResult, TTSResult, ApiSetting } from "./types";

const FILES_DIR = join(process.cwd(), "data", "animate-files");

function ensureDir(dir: string) { mkdirSync(dir, { recursive: true }); }

// ─── Mock Adapters (placeholder when no API is configured) ───

export class MockImageAdapter implements ImageGenAdapter {
  name = "mock";
  async generate(prompt: string, opts: { width?: number; height?: number }): Promise<ImageGenResult> {
    const w = opts.width ?? 1024;
    const h = opts.height ?? 1024;
    const dir = join(FILES_DIR, "generated", "images");
    ensureDir(dir);
    const filename = `${randomUUID()}.svg`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color:#6c5ce7"/>
    <stop offset="100%" style="stop-color:#a29bfe"/>
  </linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <text x="50%" y="45%" text-anchor="middle" fill="white" font-size="24" font-family="sans-serif">Generated Image</text>
  <text x="50%" y="55%" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="14" font-family="sans-serif">${w}x${h}</text>
  <text x="50%" y="70%" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="11" font-family="sans-serif">${prompt.slice(0, 60)}</text>
</svg>`;
    writeFileSync(join(dir, filename), svg);
    return { imageUrl: `/api/animate/files/generated/images/${filename}`, prompt, metadata: { mock: true } };
  }
}

export class MockVideoAdapter implements VideoGenAdapter {
  name = "mock";
  async generate(prompt: string, opts: { duration?: number }): Promise<VideoGenResult> {
    const duration = opts.duration ?? 3;
    return { videoUrl: "", prompt, duration, metadata: { mock: true, message: "Video generation requires a configured API (e.g. Runway, Kling, Pika)" } };
  }
}

export class MockTTSAdapter implements TTSGenAdapter {
  name = "mock";
  async synthesize(text: string): Promise<TTSResult> {
    return { audioUrl: "", duration: text.length * 0.08, metadata: { mock: true, message: "TTS requires a configured API (e.g. OpenAI TTS, ElevenLabs, Google TTS)" } };
  }
}

// ─── Generic HTTP Adapter (works with most REST APIs) ────

export class HttpImageAdapter implements ImageGenAdapter {
  name: string;
  private setting: ApiSetting;
  constructor(setting: ApiSetting) { this.name = setting.provider; this.setting = setting; }

  async generate(prompt: string, opts: { width?: number; height?: number; seed?: number; referenceImageUrl?: string }): Promise<ImageGenResult> {
    const res = await fetch(this.setting.base_url || `https://api.${this.setting.provider}.com/v1/images/generations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.setting.api_key}` },
      body: JSON.stringify({
        model: this.setting.model_name || undefined,
        prompt,
        n: 1,
        size: `${opts.width ?? 1024}x${opts.height ?? 1024}`,
        ...(opts.seed ? { seed: opts.seed } : {}),
      }),
    });
    if (!res.ok) throw new Error(`Image API error: ${res.status} ${await res.text()}`);
    const json = await res.json() as Record<string, unknown>;
    const data = json.data as Array<{ url?: string; b64_json?: string }>;
    let imageUrl = data?.[0]?.url ?? "";
    if (!imageUrl && data?.[0]?.b64_json) {
      const dir = join(FILES_DIR, "generated", "images");
      ensureDir(dir);
      const filename = `${randomUUID()}.png`;
      writeFileSync(join(dir, filename), Buffer.from(data[0].b64_json, "base64"));
      imageUrl = `/api/animate/files/generated/images/${filename}`;
    }
    return { imageUrl, prompt, metadata: json };
  }
}

export class HttpVideoAdapter implements VideoGenAdapter {
  name: string;
  private setting: ApiSetting;
  constructor(setting: ApiSetting) { this.name = setting.provider; this.setting = setting; }

  async generate(prompt: string, opts: { imageUrl?: string; duration?: number }): Promise<VideoGenResult> {
    const res = await fetch(this.setting.base_url || `https://api.${this.setting.provider}.com/v1/videos/generations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.setting.api_key}` },
      body: JSON.stringify({
        model: this.setting.model_name || undefined,
        prompt,
        ...(opts.imageUrl ? { image_url: opts.imageUrl } : {}),
        ...(opts.duration ? { duration: opts.duration } : {}),
      }),
    });
    if (!res.ok) throw new Error(`Video API error: ${res.status} ${await res.text()}`);
    const json = await res.json() as Record<string, unknown>;
    const videoUrl = (json as Record<string, string>).video_url ?? (json as Record<string, Array<{ url: string }>>).data?.[0]?.url ?? "";
    return { videoUrl, prompt, duration: opts.duration ?? 3, metadata: json };
  }
}

export class HttpTTSAdapter implements TTSGenAdapter {
  name: string;
  private setting: ApiSetting;
  constructor(setting: ApiSetting) { this.name = setting.provider; this.setting = setting; }

  async synthesize(text: string, opts: { voice?: string; speed?: number }): Promise<TTSResult> {
    const res = await fetch(this.setting.base_url || `https://api.${this.setting.provider}.com/v1/audio/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.setting.api_key}` },
      body: JSON.stringify({
        model: this.setting.model_name || "tts-1",
        input: text,
        voice: opts.voice || "nova",
        speed: opts.speed || 1.0,
      }),
    });
    if (!res.ok) throw new Error(`TTS API error: ${res.status} ${await res.text()}`);
    const dir = join(FILES_DIR, "generated", "audio");
    ensureDir(dir);
    const filename = `${randomUUID()}.mp3`;
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(join(dir, filename), buf);
    const duration = buf.length / 16000;
    return { audioUrl: `/api/animate/files/generated/audio/${filename}`, duration, metadata: {} };
  }
}

// ─── Factory ─────────────────────────────────────────────

export function createImageAdapter(setting: ApiSetting | undefined): ImageGenAdapter {
  if (!setting || !setting.api_key) return new MockImageAdapter();
  return new HttpImageAdapter(setting);
}

export function createVideoAdapter(setting: ApiSetting | undefined): VideoGenAdapter {
  if (!setting || !setting.api_key) return new MockVideoAdapter();
  return new HttpVideoAdapter(setting);
}

export function createTTSAdapter(setting: ApiSetting | undefined): TTSGenAdapter {
  if (!setting || !setting.api_key) return new MockTTSAdapter();
  return new HttpTTSAdapter(setting);
}
