import { NextResponse } from "next/server";
import { extractAudio, detectVolumeSpikes, cutClips, ensureWorkDir } from "@/lib/pipeline";
import { readdir } from "fs/promises";
import { join } from "path";

export const maxDuration = 120;

export async function POST(req: Request) {
  const body = await req.json();
  const { projectId, videoPath } = body;

  if (!projectId || !videoPath) {
    return NextResponse.json({ error: "projectId와 videoPath가 필요합니다." }, { status: 400 });
  }

  const projectDir = await ensureWorkDir(projectId);

  const audioPath = await extractAudio(projectDir, videoPath);

  const spikes = await detectVolumeSpikes(projectDir, audioPath, {
    spikeThreshold: body.spikeThreshold ?? 2.5,
    windowSeconds: body.windowSeconds ?? 0.5,
    minGapSeconds: body.minGapSeconds ?? 3.0,
  });

  const clips = await cutClips(projectDir, videoPath, spikes, {
    preBuffer: body.preBuffer ?? 8.0,
    postBuffer: body.postBuffer ?? 5.0,
    mergeOverlapping: body.mergeOverlapping ?? true,
    maxDuration: body.maxDuration ?? 60.0,
  });

  return NextResponse.json({
    projectId,
    spikeCount: spikes.length,
    clipCount: clips.length,
    clips,
  });
}
