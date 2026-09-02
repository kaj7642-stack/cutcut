import { copyFile, readdir } from "fs/promises";
import { join } from "path";
import { ensureDir, fileExists, OUTPUT_DIR } from "./paths";
import { runFfmpeg } from "./providers/media";
import type { MoodTag } from "./types";

/** mood_tag → BGM 트랙 이름 매핑. */
export const MOOD_TRACK: Record<MoodTag, string> = {
  긴장: "tense",
  전투: "hype",
  드라마: "calm",
  전환: "bright",
};

export const TRACK_NAMES = ["tense", "hype", "calm", "bright"] as const;
export type TrackName = (typeof TRACK_NAMES)[number];

interface TrackSpec {
  /** 화음 구성 주파수(Hz) */
  freqs: number[];
  tremoloHz: number;
  lowpassHz: number;
  gain: number;
}

const TRACK_SPEC: Record<TrackName, TrackSpec> = {
  calm: { freqs: [110, 164.81, 220], tremoloHz: 0.2, lowpassHz: 700, gain: 0.5 },
  bright: { freqs: [196, 246.94, 293.66], tremoloHz: 0.5, lowpassHz: 1600, gain: 0.45 },
  tense: { freqs: [82.41, 87.31, 164.81], tremoloHz: 1.6, lowpassHz: 600, gain: 0.55 },
  hype: { freqs: [130.81, 196, 261.63], tremoloHz: 3.2, lowpassHz: 2200, gain: 0.5 },
};

export function bgmDir(): string {
  return join(OUTPUT_DIR, "bgm");
}

export function bgmPathFor(mood: MoodTag): string {
  return join(bgmDir(), `${MOOD_TRACK[mood]}.mp3`);
}

/** ffmpeg 사인 합성으로 무드별 루프 트랙을 만든다. */
async function synthesizeTrack(name: TrackName, seconds: number, outPath: string) {
  const spec = TRACK_SPEC[name];
  const inputs: string[] = [];
  for (const f of spec.freqs) {
    inputs.push("-f", "lavfi", "-i", `sine=frequency=${f}:duration=${seconds}`);
  }
  const mixIn = spec.freqs.map((_, i) => `[${i}:a]`).join("");
  const filter =
    `${mixIn}amix=inputs=${spec.freqs.length}:duration=longest,` +
    `tremolo=f=${spec.tremoloHz}:d=0.45,lowpass=f=${spec.lowpassHz},` +
    `afade=t=in:st=0:d=2,afade=t=out:st=${Math.max(0, seconds - 2)}:d=2,` +
    `volume=${spec.gain}[a]`;

  await runFfmpeg([
    "-y",
    ...inputs,
    "-filter_complex", filter,
    "-map", "[a]",
    "-c:a", "libmp3lame",
    "-b:a", "128k",
    outPath,
  ]);
}

/**
 * BGM 트랙을 준비한다.
 * PIPELINE_BGM_DIR에 {tense,hype,calm,bright}.mp3가 있으면 그것을 쓰고,
 * 없는 트랙만 절차적으로 합성한다.
 */
export async function ensureBgmTracks(seconds = 60): Promise<Record<TrackName, string>> {
  const dir = await ensureDir(bgmDir());
  const userDir = process.env.PIPELINE_BGM_DIR;

  let userFiles: string[] = [];
  if (userDir) {
    userFiles = await readdir(userDir).catch(() => []);
  }

  const result = {} as Record<TrackName, string>;
  for (const name of TRACK_NAMES) {
    const target = join(dir, `${name}.mp3`);
    result[name] = target;

    if (await fileExists(target)) continue;

    const match = userFiles.find((f) => f.toLowerCase().startsWith(`${name}.`));
    if (userDir && match) {
      await copyFile(join(userDir, match), target);
      continue;
    }
    await synthesizeTrack(name, seconds, target);
  }
  return result;
}
