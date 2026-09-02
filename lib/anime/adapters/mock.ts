// ─────────────────────────────────────────
// Mock Adapters – for testing without real API keys
// ─────────────────────────────────────────
import type { ImageGenAdapter, VideoGenAdapter, TtsAdapter } from "./types";
import fs from "node:fs";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "anime-uploads");

function ensureDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const mockImageGen: ImageGenAdapter = {
  name: "mock",
  async generate(req) {
    ensureDir();
    // Create a placeholder SVG image
    const id = `img_${Date.now()}`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${req.width}" height="${req.height}" viewBox="0 0 ${req.width} ${req.height}">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#6c5ce7"/>
          <stop offset="100%" style="stop-color:#a29bfe"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <text x="50%" y="40%" text-anchor="middle" fill="white" font-size="24" font-family="sans-serif">🎬 Mock Scene</text>
      <text x="50%" y="55%" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="14" font-family="sans-serif">${req.prompt.slice(0, 60)}...</text>
      <text x="50%" y="70%" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="12" font-family="sans-serif">${req.width}×${req.height} | seed: ${req.seed ?? 0}</text>
    </svg>`;
    const filename = `${id}.svg`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), svg);
    return {
      image_url: `/anime-uploads/${filename}`,
      seed_used: req.seed ?? Math.floor(Math.random() * 999999),
      raw_response: { mock: true },
    };
  },
};

export const mockVideoGen: VideoGenAdapter = {
  name: "mock",
  async generate(req) {
    ensureDir();
    // For mock, we just return the image URL as "video" placeholder
    return {
      video_url: req.image_url ?? "",
      duration: req.duration_seconds,
      raw_response: { mock: true },
    };
  },
};

export const mockTts: TtsAdapter = {
  name: "mock",
  async synthesize(req) {
    ensureDir();
    // Generate a silent WAV file
    const id = `tts_${Date.now()}`;
    const sampleRate = 22050;
    const durationSec = Math.max(1, Math.ceil(req.text.length / 8));
    const numSamples = sampleRate * durationSec;
    const dataSize = numSamples * 2;
    const buffer = Buffer.alloc(44 + dataSize);

    // WAV header
    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write("WAVE", 8);
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);  // PCM
    buffer.writeUInt16LE(1, 22);  // mono
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write("data", 36);
    buffer.writeUInt32LE(dataSize, 40);
    // samples are zero = silence

    const filename = `${id}.wav`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
    return {
      audio_url: `/anime-uploads/${filename}`,
      duration: durationSec,
      raw_response: { mock: true, text: req.text },
    };
  },
};
