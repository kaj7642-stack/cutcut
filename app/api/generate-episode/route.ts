import { NextResponse } from "next/server";
import { runEpisodePipeline } from "@/lib/pipeline/orchestrator";
import { PIPELINE_STEPS, type PipelineStep, type PrivacyStatus } from "@/lib/pipeline/types";
import { episodeId, readJsonIfExists } from "@/lib/pipeline/paths";
import { join } from "path";
import { episodeDir } from "@/lib/pipeline/paths";
import type { EpisodeRunResult } from "@/lib/pipeline/types";

export const runtime = "nodejs";
export const maxDuration = 3600;

const PRIVACY: PrivacyStatus[] = ["private", "unlisted", "public"];

function parseSteps(value: unknown): PipelineStep[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const steps = value.filter((v): v is PipelineStep =>
    PIPELINE_STEPS.includes(v as PipelineStep),
  );
  return steps.length ? steps : undefined;
}

/**
 * 전체 파이프라인 트리거.
 *
 * POST body:
 *   {
 *     series_id: string,            // 필수
 *     episode_number: number,       // 필수
 *     series_brief?: string,        // 바이블이 없을 때 생성 방향
 *     tone_and_manner?: string,
 *     extra_direction?: string,
 *     force?: PipelineStep[],       // 캐시 무시하고 다시 실행할 단계
 *     stop_after?: PipelineStep,    // 여기까지만 실행
 *     upload?: boolean,
 *     privacy_status?: "private" | "unlisted" | "public",
 *     thumbnail_scene_id?: string,
 *     render?: { renderer?, width?, height?, fps?, max_scenes?, max_scene_seconds? }
 *   }
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON 본문을 읽지 못했습니다." }, { status: 400 });
  }

  const seriesId = typeof body.series_id === "string" ? body.series_id.trim() : "";
  const episodeNumber = Number(body.episode_number);

  if (!seriesId) {
    return NextResponse.json({ error: "series_id가 필요합니다." }, { status: 400 });
  }
  if (!Number.isInteger(episodeNumber) || episodeNumber < 1) {
    return NextResponse.json(
      { error: "episode_number는 1 이상의 정수여야 합니다." },
      { status: 400 },
    );
  }

  const privacy = PRIVACY.includes(body.privacy_status as PrivacyStatus)
    ? (body.privacy_status as PrivacyStatus)
    : undefined;

  const render = (body.render ?? {}) as Record<string, unknown>;

  const result = await runEpisodePipeline({
    seriesId,
    episodeNumber,
    seriesBrief: typeof body.series_brief === "string" ? body.series_brief : undefined,
    toneAndManner: typeof body.tone_and_manner === "string" ? body.tone_and_manner : undefined,
    extraDirection: typeof body.extra_direction === "string" ? body.extra_direction : undefined,
    force: parseSteps(body.force),
    stopAfter: PIPELINE_STEPS.includes(body.stop_after as PipelineStep)
      ? (body.stop_after as PipelineStep)
      : undefined,
    upload: body.upload === true,
    privacyStatus: privacy,
    thumbnailSceneId:
      typeof body.thumbnail_scene_id === "string" ? body.thumbnail_scene_id : undefined,
    render: {
      renderer: render.renderer as "remotion" | "ffmpeg" | "auto" | undefined,
      width: typeof render.width === "number" ? render.width : undefined,
      height: typeof render.height === "number" ? render.height : undefined,
      fps: typeof render.fps === "number" ? render.fps : undefined,
      maxScenes: typeof render.max_scenes === "number" ? render.max_scenes : undefined,
      maxSceneSeconds:
        typeof render.max_scene_seconds === "number" ? render.max_scene_seconds : undefined,
    },
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

/** 마지막 실행 로그 조회: /api/generate-episode?series_id=...&episode_number=1 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const seriesId = url.searchParams.get("series_id");
  const episodeNumber = Number(url.searchParams.get("episode_number"));

  if (!seriesId || !Number.isInteger(episodeNumber) || episodeNumber < 1) {
    return NextResponse.json(
      { error: "series_id와 episode_number가 필요합니다." },
      { status: 400 },
    );
  }

  const log = await readJsonIfExists<EpisodeRunResult>(
    join(episodeDir(seriesId, episodeNumber), "run.log.json"),
  );

  if (!log) {
    return NextResponse.json(
      { error: "실행 기록이 없습니다.", episode_id: episodeId(seriesId, episodeNumber) },
      { status: 404 },
    );
  }
  return NextResponse.json(log);
}
