import { BIBLE_SYSTEM, bibleUserPrompt, type BibleRequest } from "../prompts/bible";
import { generateJson } from "./providers/llm";
import { biblePath, readJsonIfExists, safeId, writeJson } from "./paths";
import { seriesBibleSchema, validatorFor } from "./schemas";
import type { SeriesBible } from "./types";

/**
 * 1단계 — 시리즈 바이블 생성 (시리즈당 최초 1회).
 *
 * 이후 모든 화 생성에 컨텍스트로 주입되므로, 스키마를 통과할 때까지
 * generateJson()이 모델에게 오류를 되먹여 재시도한다.
 */
export async function generateSeriesBible(req: BibleRequest): Promise<SeriesBible> {
  const seriesId = safeId(req.seriesId);

  const bible = await generateJson({
    task: "series_bible",
    system: BIBLE_SYSTEM,
    user: bibleUserPrompt({ ...req, seriesId }),
    validate: validatorFor(seriesBibleSchema),
    maxTokens: 8192,
    mockContext: { seriesId, brief: req.brief },
  });

  // series_id는 저장 경로의 키이므로 모델 응답을 신뢰하지 않고 강제한다.
  return { ...bible, series_id: seriesId };
}

export async function saveSeriesBible(bible: SeriesBible): Promise<string> {
  const path = biblePath(bible.series_id);
  await writeJson(path, bible);
  return path;
}

export async function loadSeriesBible(seriesId: string): Promise<SeriesBible | null> {
  return readJsonIfExists<SeriesBible>(biblePath(seriesId));
}

/** 바이블이 있으면 재사용하고, 없을 때만 생성한다. */
export async function ensureSeriesBible(
  req: BibleRequest,
): Promise<{ bible: SeriesBible; created: boolean; path: string }> {
  const existing = await loadSeriesBible(req.seriesId);
  if (existing) {
    return { bible: existing, created: false, path: biblePath(req.seriesId) };
  }
  const bible = await generateSeriesBible(req);
  const path = await saveSeriesBible(bible);
  return { bible, created: true, path };
}
