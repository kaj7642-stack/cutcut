export type MoodTag = "긴장" | "전투" | "드라마" | "전환";

export interface RemotionScene {
  scene_id: string;
  /** publicDir(=output/) 기준 상대 경로 */
  image_src: string;
  audio_src: string;
  /** publicDir 기준 상대 경로. 없으면 BGM 없음 */
  bgm_src?: string;
  narration_text: string;
  duration_actual_sec: number;
  mood_tag: MoodTag;
}

export interface EpisodeProps {
  series_title: string;
  episode_title: string;
  episode_number: number;
  cliffhanger_summary: string;
  scenes: RemotionScene[];
  /** 오프닝 타이틀 카드 길이(초) */
  title_seconds: number;
  /** 엔딩 예고 카드 길이(초) */
  outro_seconds: number;
  /** 씬 사이 크로스페이드 길이(초) */
  crossfade_seconds: number;
  /** 내레이션 대비 BGM 볼륨 (0~1) */
  bgm_volume: number;
}

export const DEFAULT_EPISODE_PROPS: EpisodeProps = {
  series_title: "시리즈 제목",
  episode_title: "에피소드 제목",
  episode_number: 1,
  cliffhanger_summary: "다음 화 예고",
  scenes: [],
  title_seconds: 4,
  outro_seconds: 5,
  crossfade_seconds: 0.6,
  bgm_volume: 0.14,
};

export const FPS = 30;

/** 씬 배열 → 프레임 단위 타임라인. 렌더러와 길이 계산이 같은 함수를 쓴다. */
export function buildTimeline(props: EpisodeProps, fps: number = FPS) {
  const titleFrames = Math.max(1, Math.round(props.title_seconds * fps));
  const outroFrames = Math.max(1, Math.round(props.outro_seconds * fps));
  const overlap = Math.max(0, Math.round(props.crossfade_seconds * fps));

  let cursor = titleFrames;
  const scenes = props.scenes.map((scene, index) => {
    const durationInFrames = Math.max(2, Math.round(scene.duration_actual_sec * fps));
    // 첫 씬을 뺀 나머지는 앞 씬과 crossfade만큼 겹쳐 시작한다.
    const from = index === 0 ? cursor : cursor - overlap;
    cursor = from + durationInFrames;
    return { scene, from, durationInFrames, index };
  });

  const outroFrom = cursor;
  const totalFrames = outroFrom + outroFrames;

  return { titleFrames, outroFrames, outroFrom, scenes, totalFrames, overlap };
}
