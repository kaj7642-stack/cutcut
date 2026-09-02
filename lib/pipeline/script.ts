import { SCRIPT_SYSTEM, scriptUserPrompt } from "../prompts/script";
import { generateJson } from "./providers/llm";
import { artifactPath, readJsonIfExists, writeJson } from "./paths";
import { episodeScriptSchema, validatorFor } from "./schemas";
import type { EpisodeScript, SeriesBible } from "./types";

/**
 * 2단계 — 화별 대본 생성.
 *
 * 직전 화의 episode_summary_for_next를 컨텍스트로 주입해 화 사이 연속성을 유지한다.
 */
export async function generateEpisodeScript(args: {
  bible: SeriesBible;
  episodeNumber: number;
  previousSummary: string | null;
  extraDirection?: string;
}): Promise<EpisodeScript> {
  const script = await generateJson({
    task: "episode_script",
    system: SCRIPT_SYSTEM,
    user: scriptUserPrompt(args),
    validate: validatorFor(episodeScriptSchema),
    maxTokens: 16384,
    mockContext: { bible: args.bible, episodeNumber: args.episodeNumber },
  });

  return {
    ...script,
    series_id: args.bible.series_id,
    episode_number: args.episodeNumber,
  };
}

/** 직전 화 산출물에서 다음 화용 요약을 읽는다. 1화면 null. */
export async function loadPreviousSummary(
  seriesId: string,
  episodeNumber: number,
): Promise<string | null> {
  if (episodeNumber <= 1) return null;

  for (let n = episodeNumber - 1; n >= 1; n--) {
    const prev = await readJsonIfExists<EpisodeScript>(artifactPath(seriesId, n, "script"));
    if (prev?.episode_summary_for_next) return prev.episode_summary_for_next;
  }
  return null;
}

export async function saveEpisodeScript(script: EpisodeScript): Promise<string> {
  const path = artifactPath(script.series_id, script.episode_number, "script");
  await writeJson(path, script);
  return path;
}
