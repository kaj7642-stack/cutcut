/**
 * 페이드 인/아웃 불투명도 계산.
 *
 * Remotion의 interpolate()는 inputRange가 엄격히 증가해야 하는데,
 * 페이드 길이가 0이거나 컴포지션이 아주 짧으면(검증용 초안 렌더 등)
 * 그 조건이 쉽게 깨진다. 여기서는 두 개의 클램프된 램프를 곱하지 않고
 * 최솟값으로 합성해 그 문제 자체를 없앤다.
 */
export function fadeOpacity(args: {
  frame: number;
  durationInFrames: number;
  fadeIn: number;
  fadeOut: number;
}): number {
  const total = Math.max(1, Math.round(args.durationInFrames));

  let inFrames = Math.max(0, Math.round(args.fadeIn));
  let outFrames = Math.max(0, Math.round(args.fadeOut));

  // 두 페이드가 겹치면 비례해서 줄인다.
  if (inFrames + outFrames > total) {
    const scale = total / (inFrames + outFrames);
    inFrames = Math.floor(inFrames * scale);
    outFrames = Math.floor(outFrames * scale);
  }

  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const rise = inFrames > 0 ? clamp(args.frame / inFrames) : 1;
  const fall = outFrames > 0 ? clamp((total - args.frame) / outFrames) : 1;

  return Math.min(rise, fall);
}
