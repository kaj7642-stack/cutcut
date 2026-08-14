export interface VolumeSpike {
  timestamp: number;
  rms: number;
  intensity: number;
}

export interface Clip {
  id: string;
  index: number;
  file: string;
  start: number;
  end: number;
  duration: number;
  spikes: VolumeSpike[];
  selected: boolean;
  memo: string;
}

export interface NarrationDraft {
  clip_id: string;
  tone: string;
  text: string;
}

export type ProjectStatus =
  | "idle"
  | "uploading"
  | "downloading"
  | "extracting_audio"
  | "detecting_spikes"
  | "cutting_clips"
  | "generating_scripts"
  | "generating_tts"
  | "rendering"
  | "done"
  | "error";

export interface Project {
  id: string;
  filename: string;
  status: ProjectStatus;
  progress: number;
  clips: Clip[];
  drafts: NarrationDraft[];
  outputUrl?: string;
  error?: string;
  createdAt: number;
}

export type OutputMode = "shorts" | "longform";

export interface TtsVoice {
  id: string;
  name: string;
  provider: "openai" | "google";
  gender: "male" | "female";
}

export const TTS_VOICES: TtsVoice[] = [
  { id: "nova", name: "노바 (여성, 밝은)", provider: "openai", gender: "female" },
  { id: "onyx", name: "오닉스 (남성, 깊은)", provider: "openai", gender: "male" },
  { id: "echo", name: "에코 (남성, 자연스러운)", provider: "openai", gender: "male" },
  { id: "shimmer", name: "시머 (여성, 부드러운)", provider: "openai", gender: "female" },
  { id: "fable", name: "페이블 (남성, 나레이션)", provider: "openai", gender: "male" },
  { id: "ko-KR-Neural2-A", name: "수진 (여성, 차분한)", provider: "google", gender: "female" },
  { id: "ko-KR-Neural2-C", name: "민수 (남성, 신뢰감)", provider: "google", gender: "male" },
];

export const NARRATION_TONES = [
  {
    key: "funny",
    name: "웃긴 해설",
    description: "예능 자막 느낌. 상황을 웃기게 풀어주는 톤.",
    icon: "😂",
  },
  {
    key: "hype",
    name: "하이프 실황",
    description: "흥분된 실황 중계 톤. 킬/역전 장면에 어울림.",
    icon: "🔥",
  },
  {
    key: "documentary",
    name: "인간극장",
    description: "다큐 나레이션 톤. 담담하게 서사적으로 풀어줌.",
    icon: "🎬",
  },
  {
    key: "roast",
    name: "자학개그",
    description: "자기비하 유머. 본인의 실수를 담담하게 까는 톤.",
    icon: "💀",
  },
] as const;

export type NarrationTone = (typeof NARRATION_TONES)[number]["key"];
