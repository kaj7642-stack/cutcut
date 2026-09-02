export type StyleMode = "2d" | "3d";
export type AspectRatio = "9:16" | "16:9";
export type CameraDirection =
  | "static"
  | "zoom_in"
  | "zoom_out"
  | "pan_left"
  | "pan_right"
  | "pan_up"
  | "pan_down"
  | "tracking";
export type GenerationStatus = "pending" | "generating" | "completed" | "failed";
export type EpisodeStatus = "draft" | "scripted" | "generating" | "generated" | "rendering" | "completed";
export type ApiType = "image" | "video" | "tts";

export interface AnimProject {
  id: string;
  name: string;
  description: string;
  style_mode: StyleMode;
  default_aspect_ratio: AspectRatio;
  created_at: string;
  updated_at: string;
}

export interface AnimCharacter {
  id: string;
  project_id: string;
  name: string;
  description: string;
  style_prompt: string;
  voice_preset: string;
  seed_value: number | null;
  reference_images: string[];
  created_at: string;
}

export interface AnimEpisode {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: EpisodeStatus;
  raw_script: string;
  created_at: string;
  updated_at: string;
}

export interface AnimScene {
  id: string;
  episode_id: string;
  order_index: number;
  description: string;
  dialogue: string;
  character_ids: string[];
  duration: number;
  camera_direction: CameraDirection;
  generated_image_url: string | null;
  generated_video_url: string | null;
  tts_audio_url: string | null;
  subtitle_text: string;
  subtitle_color: string;
  status: GenerationStatus;
  api_log: string | null;
  created_at: string;
}

export interface ApiSetting {
  id: string;
  provider: string;
  api_type: ApiType;
  api_key: string;
  base_url: string;
  model_name: string;
  is_active: boolean;
  created_at: string;
}

export interface ImageGenResult {
  imageUrl: string;
  prompt: string;
  metadata?: Record<string, unknown>;
}

export interface VideoGenResult {
  videoUrl: string;
  prompt: string;
  duration: number;
  metadata?: Record<string, unknown>;
}

export interface TTSResult {
  audioUrl: string;
  duration: number;
  metadata?: Record<string, unknown>;
}

export interface ImageGenAdapter {
  name: string;
  generate(prompt: string, opts: {
    width?: number;
    height?: number;
    seed?: number;
    referenceImageUrl?: string;
  }): Promise<ImageGenResult>;
}

export interface VideoGenAdapter {
  name: string;
  generate(prompt: string, opts: {
    imageUrl?: string;
    duration?: number;
    width?: number;
    height?: number;
    seed?: number;
  }): Promise<VideoGenResult>;
}

export interface TTSGenAdapter {
  name: string;
  synthesize(text: string, opts: {
    voice?: string;
    speed?: number;
    language?: string;
  }): Promise<TTSResult>;
}

export interface ParsedScene {
  description: string;
  dialogue: string;
  characterNames: string[];
  duration: number;
  cameraDirection: CameraDirection;
}
