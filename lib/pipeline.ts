import { execFile } from "child_process";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { promisify } from "util";
import type { VolumeSpike, Clip } from "./types";
import { v4 as uuid } from "uuid";

const exec = promisify(execFile);

const WORK_DIR = process.env.WORK_DIR || join(process.cwd(), "workdir");

export async function ensureWorkDir(projectId: string): Promise<string> {
  const dir = join(WORK_DIR, projectId);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function extractAudio(
  projectDir: string,
  inputPath: string,
  sampleRate = 16000,
): Promise<string> {
  const outputPath = join(projectDir, "audio.wav");
  await exec("ffmpeg", [
    "-y", "-i", inputPath,
    "-vn", "-acodec", "pcm_s16le",
    "-ar", String(sampleRate), "-ac", "1",
    outputPath,
  ]);
  return outputPath;
}

export async function detectVolumeSpikes(
  projectDir: string,
  audioPath: string,
  options: {
    sampleRate?: number;
    spikeThreshold?: number;
    windowSeconds?: number;
    minGapSeconds?: number;
  } = {},
): Promise<VolumeSpike[]> {
  const sr = options.sampleRate ?? 16000;
  const threshold = options.spikeThreshold ?? 2.5;
  const windowSec = options.windowSeconds ?? 0.5;
  const minGap = options.minGapSeconds ?? 3.0;

  const script = `
import json, sys, librosa, numpy as np

sr = ${sr}
y, _ = librosa.load("${audioPath.replace(/\\/g, "\\\\")}", sr=sr, mono=True)
window = int(${windowSec} * sr)
hop = window // 2
rms = librosa.feature.rms(y=y, frame_length=window, hop_length=hop)[0]
mean_rms = np.mean(rms)
thresh = mean_rms * ${threshold}

spike_frames = np.where(rms > thresh)[0]
if len(spike_frames) == 0:
    print("[]")
    sys.exit(0)

times = librosa.frames_to_time(spike_frames, sr=sr, hop_length=hop)
vals = rms[spike_frames]

spikes = []
for t, v in zip(times, vals):
    if spikes and (t - spikes[-1]["timestamp"]) < ${minGap}:
        if v > spikes[-1]["rms"]:
            spikes[-1] = {"timestamp": round(float(t), 2), "rms": round(float(v), 4)}
    else:
        spikes.append({"timestamp": round(float(t), 2), "rms": round(float(v), 4)})

mx = max(s["rms"] for s in spikes)
for s in spikes:
    s["intensity"] = round(s["rms"] / mx * 10, 1)

print(json.dumps(spikes))
`;

  const scriptPath = join(projectDir, "_detect.py");
  await writeFile(scriptPath, script);
  const { stdout } = await exec("python3", [scriptPath], { maxBuffer: 10 * 1024 * 1024 });
  return JSON.parse(stdout.trim());
}

export async function cutClips(
  projectDir: string,
  videoPath: string,
  spikes: VolumeSpike[],
  options: {
    preBuffer?: number;
    postBuffer?: number;
    mergeOverlapping?: boolean;
    maxDuration?: number;
  } = {},
): Promise<Clip[]> {
  const pre = options.preBuffer ?? 8.0;
  const post = options.postBuffer ?? 5.0;
  const merge = options.mergeOverlapping ?? true;
  const maxDur = options.maxDuration ?? 60.0;
  const clipsDir = join(projectDir, "clips");
  await mkdir(clipsDir, { recursive: true });

  let regions: { start: number; end: number; spikes: VolumeSpike[] }[] = spikes.map((s) => ({
    start: Math.max(0, s.timestamp - pre),
    end: s.timestamp + post,
    spikes: [s],
  }));

  if (merge) {
    regions.sort((a, b) => a.start - b.start);
    const merged: typeof regions = [regions[0]];
    for (let i = 1; i < regions.length; i++) {
      const last = merged[merged.length - 1];
      if (regions[i].start <= last.end) {
        last.end = Math.max(last.end, regions[i].end);
        last.spikes.push(...regions[i].spikes);
      } else {
        merged.push({ ...regions[i] });
      }
    }
    regions = merged.map((r) => ({
      ...r,
      end: r.end - r.start > maxDur ? r.start + maxDur : r.end,
    }));
  }

  const clips: Clip[] = [];
  for (let i = 0; i < regions.length; i++) {
    const r = regions[i];
    const filename = `clip_${String(i + 1).padStart(3, "0")}.mp4`;
    const outPath = join(clipsDir, filename);
    const duration = r.end - r.start;

    await exec("ffmpeg", [
      "-y", "-ss", String(r.start),
      "-i", videoPath,
      "-t", String(duration),
      "-c", "copy",
      outPath,
    ]);

    clips.push({
      id: uuid(),
      index: i + 1,
      file: filename,
      start: Math.round(r.start * 100) / 100,
      end: Math.round(r.end * 100) / 100,
      duration: Math.round(duration * 100) / 100,
      spikes: r.spikes,
      selected: true,
      memo: "",
    });
  }

  return clips;
}

export function getClipPath(projectId: string, filename: string): string {
  return join(WORK_DIR, projectId, "clips", filename);
}

export function getProjectDir(projectId: string): string {
  return join(WORK_DIR, projectId);
}
