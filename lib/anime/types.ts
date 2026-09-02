// ─────────────────────────────────────────
// CutCut Anime Generator – Type Definitions
// ─────────────────────────────────────────

export type StyleMode = "2d" | "3d";
export type AspectRatio = "9:16" | "16:9";
export type CameraDirection = "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "pan_up" | "pan_down";

export const STYLE_SUFFIXES: Record<StyleMode, string> = {
  "2d": "Japanese 2D anime style, cel-shaded, clean lineart, vibrant colors",
  "3d": "3D rendered, stylized CG animation, soft global illumination, Pixar-quality",
};

export interface AnimeProject {
  id: string;
  name: string;
  description: string;
  style_mode: StyleMode;
  aspect_ratio: AspectRatio;
  created_at: string;
  updated_at: string;
}

export interface Character {
  id: string;
  project_id: string;
  name: string;
  style_mode: StyleMode;
  style_prompt: string;
  voice_preset: string; // JSON string of voice config
  seed_value: number;
  reference_images: string; // JSON array of file paths
  subtitle_color: string;
  subtitle_font: string;
  created_at: string;
  updated_at: string;
}

export interface Episode {
  id: string;
  project_id: string;
  title: string;
  episode_number: number;
  status: "draft" | "generating" | "completed" | "failed";
  created_at: string;
  updated_at: string;
}

export interface Scene {
  id: string;
  episode_id: string;
  scene_number: number;
  description: string;
  dialogue: string;
  character_ids: string; // JSON array of character IDs
  camera_direction: CameraDirection;
  duration_seconds: number;
  generated_image_url: string;
  generated_video_url: string;
  tts_audio_url: string;
  subtitle_text: string;
  status: "pending" | "generating_image" | "generating_video" | "generating_tts" | "completed" | "failed";
  prompt_used: string;
  api_log: string; // JSON
  created_at: string;
  updated_at: string;
}

export interface ApiSetting {
  id: string;
  provider_type: "image_gen" | "video_gen" | "tts";
  provider_name: string;
  api_key: string;
  config: string; // JSON
  created_at: string;
  updated_at: string;
}

export interface RenderJob {
  id: string;
  episode_id: string;
  aspect_ratio: AspectRatio;
  output_path: string;
  status: "queued" | "rendering" | "completed" | "failed";
  progress: number;
  error: string;
  created_at: string;
  updated_at: string;
}

// ── Adapter interfaces ──

export interface ImageGenRequest {
  prompt: string;
  negative_prompt?: string;
  reference_images?: string[];
  width: number;
  height: number;
  seed?: number;
}

export interface ImageGenResponse {
  image_url: string;
  seed_used: number;
  raw_response: unknown;
}

export interface VideoGenRequest {
  prompt: string;
  image_url?: string;        // reference image for img2vid
  reference_images?: string[];
  duration_seconds: number;
  width: number;
  height: number;
  seed?: number;
}

export interface VideoGenResponse {
  video_url: string;
  duration: number;
  raw_response: unknown;
}

export interface TtsRequest {
  text: string;
  voice_id: string;
  speed?: number;
  language?: string;
}

export interface TtsResponse {
  audio_url: string;
  duration: number;
  raw_response: unknown;
}

export interface ImageGenAdapter {
  name: string;
  generate(req: ImageGenRequest): Promise<ImageGenResponse>;
}

export interface VideoGenAdapter {
  name: string;
  generate(req: VideoGenRequest): Promise<VideoGenResponse>;
}

export interface TtsAdapter {
  name: string;
  synthesize(req: TtsRequest): Promise<TtsResponse>;
}
