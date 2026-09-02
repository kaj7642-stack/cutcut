/**
 * 가상 전쟁 스토리 유튜브 자동화 파이프라인 – 공용 타입.
 *
 * 각 단계는 이 파일의 타입을 계약(contract)으로 삼는다.
 * 단계 산출물은 모두 JSON 직렬화 가능해야 하며,
 * data/series/{seriesId}/episodes/{n}/ 아래에 그대로 저장된다.
 */

export const MOOD_TAGS = ["긴장", "전투", "드라마", "전환"] as const;
export type MoodTag = (typeof MOOD_TAGS)[number];

export const TONE_AND_MANNERS = [
  "다큐 재연풍",
  "극적 내레이션풍",
  "담담한 전황 브리핑풍",
] as const;
export type ToneAndManner = (typeof TONE_AND_MANNERS)[number];

/* ── 1단계: 시리즈 바이블 ────────────────────────────────────────── */

export interface BibleCharacter {
  /** 등장인물 이름 (가상) */
  name: string;
  /** 소속 세력 이름 — factions[].name 중 하나와 일치해야 한다 */
  faction: string;
  role: string;
  personality: string;
  /**
   * 이미지 생성 AI가 매 화 동일 인물로 재현할 수 있도록 하는 고정 키워드.
   * 헤어스타일 / 군복 색상 / 특징적 소품 등을 영문 키워드로 나열한다.
   */
  appearance_keywords: string[];
}

export interface BibleFaction {
  name: string;
  ideology: string;
  military_traits: string;
  /** 실존 국기/휘장과 혼동되지 않는 가상의 문장·색상 체계 */
  insignia: string;
  color_scheme: string[];
}

export interface SeriesBible {
  series_id: string;
  series_title: string;
  /** 시대적 배경 (가상 근현대 / 판타지·SF 혼합 여부 명시) */
  setting: string;
  genre_mix: string;
  factions: BibleFaction[];
  characters: BibleCharacter[];
  core_conflict: string;
  /** 10화 기준 전개 아크 */
  story_arc: { episode: number; beat: string }[];
  tone_and_manner: ToneAndManner;
  /** 시리즈 전체에서 고정되는 아트 스타일 키워드 (3단계 프롬프트 접두어) */
  art_style: string;
  /** 매 화 이미지에서 배제할 요소 (실존 국기·로고·실존 인물 등) */
  global_negative_prompt: string;
  created_at: string;
}

/* ── 2단계: 화별 대본 ───────────────────────────────────────────── */

export interface Scene {
  scene_id: string;
  narration_text: string;
  estimated_duration_sec: number;
  /** 이미지 프롬프트로 바로 쓸 수 있는 구체적 시각 묘사 */
  visual_description: string;
  mood_tag: MoodTag;
  /** 이 씬에 등장하는 인물 이름 (바이블 characters[].name) */
  characters?: string[];
  /** 내레이터가 아닌 캐릭터 대사 씬이면 해당 인물 이름 */
  speaker?: string;

  /* 이후 단계에서 채워지는 필드 */
  image_path?: string;
  audio_path?: string;
  duration_actual_sec?: number;
}

export interface EpisodeScript {
  series_id: string;
  episode_number: number;
  episode_title: string;
  narration_script: Scene[];
  cliffhanger_summary: string;
  /** 다음 화 생성 시 컨텍스트로 넘길 이번 화 요약 (3문장 이내) */
  episode_summary_for_next: string;
}

/* ── 3단계: 이미지 ──────────────────────────────────────────────── */

export interface ImagePrompt {
  scene_id: string;
  image_prompt: string;
  negative_prompt: string;
}

export interface GeneratedImage {
  scene_id: string;
  image_path: string;
  prompt: string;
  provider: string;
}

/* ── 4단계: TTS ─────────────────────────────────────────────────── */

export interface TtsParams {
  /** 0.5 ~ 2.0 */
  rate: number;
  /** TTS 엔진에 전달할 스타일 지시문 */
  style: string;
  /** SSML을 지원하는 엔진용 마크업 (미지원 엔진은 tts_text를 쓴다) */
  ssml?: string;
}

export interface TtsLine {
  scene_id: string;
  speaker_id: string;
  tts_text: string;
  ssml_or_params: TtsParams;
}

export interface TtsResult {
  scene_id: string;
  speaker_id: string;
  audio_path: string;
  duration_actual_sec: number;
}

/* ── 5단계: 조립 ────────────────────────────────────────────────── */

export interface AssembleScene {
  scene_id: string;
  image_path: string;
  audio_path: string;
  narration_text: string;
  duration_actual_sec: number;
  mood_tag: MoodTag;
}

export interface AssembleInput {
  series_id: string;
  episode_id: string;
  series_title: string;
  episode_title: string;
  episode_number: number;
  cliffhanger_summary: string;
  scenes: AssembleScene[];
}

export interface AssembleResult {
  video_path: string;
  duration_sec: number;
  renderer: "remotion" | "ffmpeg";
}

/* ── 6단계: 업로드 ──────────────────────────────────────────────── */

export type PrivacyStatus = "private" | "unlisted" | "public";

export interface UploadResult {
  video_id: string;
  url: string;
  timestamp: string;
  privacy_status: PrivacyStatus;
  upload_status: "processing" | "complete" | "failed";
  title: string;
}

/* ── 7단계: 오케스트레이션 ──────────────────────────────────────── */

export const PIPELINE_STEPS = [
  "bible",
  "script",
  "image_prompts",
  "images",
  "tts",
  "assemble",
  "upload",
] as const;
export type PipelineStep = (typeof PIPELINE_STEPS)[number];

export interface StepLog {
  step: PipelineStep;
  status: "skipped_cached" | "ok" | "failed";
  started_at: string;
  finished_at: string;
  duration_ms: number;
  error?: string;
  detail?: string;
}

export interface EpisodeRunResult {
  series_id: string;
  episode_number: number;
  episode_id: string;
  ok: boolean;
  failed_step?: PipelineStep;
  logs: StepLog[];
  artifacts: Partial<Record<PipelineStep, string>>;
  video_path?: string;
  upload?: UploadResult;
}
