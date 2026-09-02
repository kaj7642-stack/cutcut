import { NextRequest, NextResponse } from "next/server";
import { get, run, all } from "@/lib/anime/db";
import { v4 as uuid } from "uuid";
import type { Scene, Episode, AnimeProject, RenderJob, Character } from "@/lib/anime/types";
import { renderSceneSegment, concatScenes } from "@/lib/anime/ffmpeg";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { episode_id } = body;

  if (!episode_id) return NextResponse.json({ error: "episode_id required" }, { status: 400 });

  const episode = get<Episode>("SELECT * FROM episodes WHERE id = $id", { id: episode_id });
  if (!episode) return NextResponse.json({ error: "Episode not found" }, { status: 404 });

  const project = get<AnimeProject>("SELECT * FROM projects WHERE id = $pid", { pid: episode.project_id });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const scenes = all<Scene>(
    "SELECT * FROM scenes WHERE episode_id = $eid ORDER BY scene_number ASC",
    { eid: episode_id }
  );

  if (scenes.length === 0) {
    return NextResponse.json({ error: "No scenes to render" }, { status: 400 });
  }

  const jobId = uuid();
  const now = new Date().toISOString();

  run(
    `INSERT INTO render_jobs (id, episode_id, aspect_ratio, status, created_at, updated_at)
     VALUES ($id, $eid, $ar, 'rendering', $now, $now)`,
    { id: jobId, eid: episode_id, ar: project.aspect_ratio, now }
  );

  // Get all characters for subtitle info
  const allChars = all<Character>(
    "SELECT * FROM characters WHERE project_id = $pid",
    { pid: project.id }
  );
  const charMap = new Map(allChars.map(c => [c.id, c]));

  try {
    // Render each scene as a segment
    const segmentPaths: string[] = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const charIds: string[] = JSON.parse(scene.character_ids || "[]");
      const primaryChar = charIds[0] ? charMap.get(charIds[0]) : undefined;

      const progress = ((i + 1) / scenes.length) * 80;
      run("UPDATE render_jobs SET progress = $p, updated_at = $now WHERE id = $id", {
        id: jobId, p: progress, now: new Date().toISOString(),
      });

      const segPath = await renderSceneSegment(
        {
          scene_number: scene.scene_number,
          video_url: scene.generated_video_url || undefined,
          image_url: scene.generated_image_url || undefined,
          audio_url: scene.tts_audio_url || undefined,
          subtitle_text: scene.subtitle_text,
          subtitle_color: primaryChar?.subtitle_color || "#FFFFFF",
          subtitle_font: primaryChar?.subtitle_font || "Noto Sans KR",
          duration_seconds: scene.duration_seconds,
        },
        project.aspect_ratio,
        jobId
      );
      segmentPaths.push(segPath);
    }

    // Concat all segments
    run("UPDATE render_jobs SET progress = 90, updated_at = $now WHERE id = $id", {
      id: jobId, now: new Date().toISOString(),
    });

    const outputPath = await concatScenes(segmentPaths, `render_${jobId}`);

    run(
      "UPDATE render_jobs SET output_path = $path, status = 'completed', progress = 100, updated_at = $now WHERE id = $id",
      { id: jobId, path: outputPath, now: new Date().toISOString() }
    );

    run("UPDATE episodes SET status = 'completed', updated_at = $now WHERE id = $eid", {
      eid: episode_id, now: new Date().toISOString(),
    });

    const job = get<RenderJob>("SELECT * FROM render_jobs WHERE id = $id", { id: jobId });
    return NextResponse.json(job);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    run(
      "UPDATE render_jobs SET status = 'failed', error = $err, updated_at = $now WHERE id = $id",
      { id: jobId, err: msg, now: new Date().toISOString() }
    );
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const episodeId = req.nextUrl.searchParams.get("episodeId");
  if (!episodeId) return NextResponse.json({ error: "episodeId required" }, { status: 400 });
  const jobs = all<RenderJob>(
    "SELECT * FROM render_jobs WHERE episode_id = $eid ORDER BY created_at DESC",
    { eid: episodeId }
  );
  return NextResponse.json(jobs);
}
