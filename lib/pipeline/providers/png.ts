import { deflateSync } from "zlib";

/**
 * 의존성 없는 최소 PNG 인코더.
 * mock 모드에서 씬별 플레이스홀더 이미지를 만들 때 쓴다
 * (이미지 API 키 없이 5단계 렌더까지 실제로 돌려보기 위한 것).
 */

function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** RGB 픽셀 버퍼(width*height*3)를 PNG 바이트로 인코딩한다. */
export function encodePng(width: number, height: number, rgb: Buffer): Buffer {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type: none
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 6 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * 시드 문자열에서 결정론적으로 만들어지는 플레이스홀더 이미지.
 * 세로 그라디언트 + 지평선 + 실루엣 블록으로 Ken Burns 움직임이 보이게 한다.
 */
export function placeholderImage(seed: string, width = 1920, height = 1080): Buffer {
  const h = hash(seed);
  const baseR = 30 + (h & 0x3f);
  const baseG = 40 + ((h >> 6) & 0x3f);
  const baseB = 55 + ((h >> 12) & 0x3f);
  const horizon = Math.floor(height * (0.55 + ((h >> 18) & 0x0f) / 100));

  const rgb = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    const t = y / height;
    const sky = y < horizon;
    const r = Math.min(255, Math.round(sky ? baseR + (1 - t) * 90 : baseR * 0.5));
    const g = Math.min(255, Math.round(sky ? baseG + (1 - t) * 80 : baseG * 0.5));
    const b = Math.min(255, Math.round(sky ? baseB + (1 - t) * 70 : baseB * 0.6));
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      rgb[i] = r;
      rgb[i + 1] = g;
      rgb[i + 2] = b;
    }
  }

  // 지평선 위 실루엣 (시드에 따라 위치·높이가 달라진다)
  const shapes = 5 + (h % 4);
  for (let s = 0; s < shapes; s++) {
    const sh = hash(`${seed}:${s}`);
    const w = 60 + (sh % 220);
    const x0 = sh % Math.max(1, width - w);
    const hh = 80 + ((sh >> 8) % 380);
    const y0 = Math.max(0, horizon - hh);
    for (let y = y0; y < horizon; y++) {
      for (let x = x0; x < x0 + w; x++) {
        const i = (y * width + x) * 3;
        rgb[i] = Math.round(rgb[i] * 0.35);
        rgb[i + 1] = Math.round(rgb[i + 1] * 0.35);
        rgb[i + 2] = Math.round(rgb[i + 2] * 0.4);
      }
    }
  }

  return encodePng(width, height, rgb);
}
