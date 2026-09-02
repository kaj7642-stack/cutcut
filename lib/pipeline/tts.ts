import { join } from "path";
import { TTS_SYSTEM, ttsUserPrompt } from "../prompts/tts";
import { generateJson } from "./providers/llm";
import { probeDuration } from "./providers/media";
import { resolveTtsProvider, supportsSsml, synthesizeToFile } from "./providers/tts";
import { artifactPath, audioDir, ensureDir, writeJson } from "./paths";
import { listValidatorCovering, ttsLineListSchema } from "./schemas";
import type { Scene, SeriesBible, TtsLine, TtsResult } from "./types";

/** 4단계-a — narration_text를 TTS 입력(화자/SSML/템포)으로 변환. */
export async function generateTtsLines(args: {
  bible: SeriesBible;
  scenes: Scene[];
}): Promise<TtsLine[]> {
  const sceneIds = args.scenes.map((s) => s.scene_id);

  const lines = await generateJson({
    task: "tts_lines",
    system: TTS_SYSTEM,
    user: ttsUserPrompt(args),
    validate: listValidatorCovering(ttsLineListSchema, sceneIds),
    maxTokens: 16384,
    mockContext: { scenes: args.scenes },
  });

  const byId = new Map(lines.map((l) => [l.scene_id, l]));
  return sceneIds.map((id) => byId.get(id)!).filter(Boolean);
}

export async function saveTtsLines(
  seriesId: string,
  episodeNumber: number,
  lines: TtsLine[],
): Promise<string> {
  const path = artifactPath(seriesId, episodeNumber, "tts_lines");
  await writeJson(path, lines);
  return path;
}

/**
 * 4단계-b — 씬 단위로 TTS를 호출해
 * output/audio/{episodeId}/{sceneId}.mp3 로 저장하고,
 * 실제 오디오 길이를 측정해 duration_actual_sec으로 돌려준다.
 * 이 값이 5단계 영상 타이밍 동기화의 기준이 된다.
 */
export async function synthesizeEpisodeAudio(args: {
  episodeId: string;
  lines: TtsLine[];
}): Promise<TtsResult[]> {
  const dir = await ensureDir(audioDir(args.episodeId));
  const provider = resolveTtsProvider();
  const ssmlOk = supportsSsml(provider);
  const results: TtsResult[] = [];

  for (const line of args.lines) {
    const outputPath = join(dir, `${line.scene_id}.mp3`);

    await synthesizeToFile({
      text: line.tts_text,
      ssml: ssmlOk ? line.ssml_or_params.ssml : undefined,
      speakerId: line.speaker_id,
      params: line.ssml_or_params,
      outputPath,
    });

    results.push({
      scene_id: line.scene_id,
      speaker_id: line.speaker_id,
      audio_path: outputPath,
      duration_actual_sec: await probeDuration(outputPath),
    });
  }

  return results;
}

/** 씬 메타데이터에 오디오 경로와 실측 길이를 반영한다. */
export function applyTtsResults(scenes: Scene[], results: TtsResult[]): Scene[] {
  const byId = new Map(results.map((r) => [r.scene_id, r]));
  return scenes.map((s) => {
    const r = byId.get(s.scene_id);
    return r
      ? { ...s, audio_path: r.audio_path, duration_actual_sec: r.duration_actual_sec }
      : s;
  });
}

export async function saveTtsResults(
  seriesId: string,
  episodeNumber: number,
  results: TtsResult[],
): Promise<string> {
  const path = artifactPath(seriesId, episodeNumber, "tts");
  await writeJson(path, results);
  return path;
}
