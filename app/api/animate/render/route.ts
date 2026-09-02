import { NextRequest, NextResponse } from "next/server";
import { listScenes, getEpisode, updateEpisode } from "@/lib/animate/db";

export async function POST(req: NextRequest) {
  const body = await req.json() as { episode_id?: string; aspect_ratio?: string };
  if (!body.episode_id) return NextResponse.json({ error: "episode_id 필요" }, { status: 400 });

  const episode = getEpisode(body.episode_id);
  if (!episode) return NextResponse.json({ error: "에피소드를 찾을 수 없습니다" }, { status: 404 });

  const scenes = listScenes(body.episode_id);
  if (scenes.length === 0) return NextResponse.json({ error: "씬이 없습니다" }, { status: 400 });

  const completedScenes = scenes.filter(s => s.generated_image_url || s.generated_video_url);
  if (completedScenes.length === 0) return NextResponse.json({ error: "생성된 씬이 없습니다. 먼저 씬을 생성해주세요" }, { status: 400 });

  updateEpisode(body.episode_id, { status: "rendering" });

  const timeline = scenes.map(s => ({
    sceneId: s.id,
    order: s.order_index,
    duration: s.duration,
    hasImage: !!s.generated_image_url,
    hasVideo: !!s.generated_video_url,
    hasAudio: !!s.tts_audio_url,
    subtitle: s.subtitle_text,
  }));

  updateEpisode(body.episode_id, { status: "completed" });

  return NextResponse.json({
    message: "타임라인 데이터가 준비되었습니다. ffmpeg를 설치하면 최종 영상을 렌더링할 수 있습니다.",
    timeline,
    totalDuration: scenes.reduce((sum, s) => sum + s.duration, 0),
    sceneCount: scenes.length,
    readyScenes: completedScenes.length,
  });
}
