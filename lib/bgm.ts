export const BGM_MOODS = [
  { id: "calm", label: "잔잔한", desc: "정보·교양" },
  { id: "bright", label: "밝은", desc: "일상·리뷰" },
  { id: "tense", label: "긴장감", desc: "미스터리·반전" },
  { id: "hype", label: "흥분", desc: "킬·역전 하이라이트" },
  { id: "none", label: "없음", desc: "나레이션만" },
] as const;

export type BgmMood = (typeof BGM_MOODS)[number]["id"];

function note(semitonesFromA4: number): number {
  return 440 * Math.pow(2, semitonesFromA4 / 12);
}

interface MoodSpec {
  scale: number[];
  step: number;
  cutoff: number;
  waveform: OscillatorType;
  drone: boolean;
}

const MOOD_SPEC: Record<Exclude<BgmMood, "none">, MoodSpec> = {
  calm: { scale: [-24, -19, -17, -12, -7, -5], step: 0.9, cutoff: 900, waveform: "sine", drone: true },
  bright: { scale: [-12, -10, -5, 0, 2, 7], step: 0.5, cutoff: 1800, waveform: "triangle", drone: false },
  tense: { scale: [-25, -24, -13, -12, -1, 0], step: 0.7, cutoff: 700, waveform: "sawtooth", drone: true },
  hype: { scale: [-12, -7, -5, 0, 5, 7], step: 0.35, cutoff: 2200, waveform: "square", drone: false },
};

export async function renderBgm(mood: BgmMood, seconds: number): Promise<AudioBuffer | null> {
  if (mood === "none" || seconds <= 0) return null;

  const spec = MOOD_SPEC[mood];
  const sampleRate = 44100;
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);

  const master = ctx.createGain();
  master.gain.value = 0.9;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = spec.cutoff;
  filter.Q.value = 0.7;
  filter.connect(master);
  master.connect(ctx.destination);

  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.28;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.32;
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(master);

  if (spec.drone) {
    const drone = ctx.createOscillator();
    drone.type = "sine";
    drone.frequency.value = note(spec.scale[0] - 12);
    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0, 0);
    droneGain.gain.linearRampToValueAtTime(0.18, 2);
    droneGain.gain.setValueAtTime(0.18, Math.max(2, seconds - 2));
    droneGain.gain.linearRampToValueAtTime(0, seconds);
    drone.connect(droneGain);
    droneGain.connect(filter);
    drone.start(0);
    drone.stop(seconds);
  }

  let seed = 0x2f6e2b1 ^ Math.round(seconds * 1000);
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };

  for (let t = 0; t < seconds - spec.step; t += spec.step) {
    const semitone = spec.scale[Math.floor(rand() * spec.scale.length)];
    const osc = ctx.createOscillator();
    osc.type = spec.waveform;
    osc.frequency.value = note(semitone);

    const env = ctx.createGain();
    const peak = 0.1 + rand() * 0.05;
    const attack = 0.08;
    const release = spec.step * 1.8;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peak, t + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);

    osc.connect(env);
    env.connect(filter);
    env.connect(delay);
    osc.start(t);
    osc.stop(Math.min(seconds, t + attack + release));
  }

  return ctx.startRendering();
}
