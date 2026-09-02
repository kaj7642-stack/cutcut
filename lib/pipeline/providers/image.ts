import { writeFile } from "fs/promises";
import { isMockMode } from "./mock";
import { placeholderImage } from "./png";

/**
 * 이미지 생성 프로바이더 어댑터.
 *
 *   IMAGE_PROVIDER=openai     → OpenAI Images (gpt-image-1)
 *   IMAGE_PROVIDER=stability  → Stability AI SD3
 *   IMAGE_PROVIDER=mock       → 로컬 플레이스홀더 PNG (키 불필요)
 *
 * 미지정 시 사용 가능한 키를 보고 자동 선택하고, 아무것도 없으면 mock으로 떨어진다.
 */
export type ImageProviderName = "openai" | "stability" | "mock";

export interface ImageRequest {
  prompt: string;
  negativePrompt?: string;
  outputPath: string;
  /** 16:9 기본 */
  width?: number;
  height?: number;
  seed?: string;
}

export function resolveImageProvider(): ImageProviderName {
  const explicit = process.env.IMAGE_PROVIDER?.toLowerCase();
  if (explicit === "openai" || explicit === "stability" || explicit === "mock") {
    return explicit;
  }
  if (isMockMode()) return "mock";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.STABILITY_API_KEY) return "stability";
  return "mock";
}

async function generateOpenAI(req: ImageRequest): Promise<Buffer> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY가 설정되어 있지 않습니다.");

  // OpenAI Images API에는 negative prompt 필드가 없어 프롬프트에 병합한다.
  const prompt = req.negativePrompt
    ? `${req.prompt}\n\nDo not include: ${req.negativePrompt}`
    : req.prompt;

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
      prompt,
      size: "1536x1024",
      n: 1,
    }),
    signal: AbortSignal.timeout(180_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`이미지 생성 실패 (${res.status}). ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
  const first = data.data?.[0];
  if (first?.b64_json) return Buffer.from(first.b64_json, "base64");
  if (first?.url) {
    const img = await fetch(first.url, { signal: AbortSignal.timeout(120_000) });
    if (!img.ok) throw new Error(`이미지 다운로드 실패 (${img.status}).`);
    return Buffer.from(await img.arrayBuffer());
  }
  throw new Error("이미지 데이터를 받지 못했습니다.");
}

async function generateStability(req: ImageRequest): Promise<Buffer> {
  const key = process.env.STABILITY_API_KEY;
  if (!key) throw new Error("STABILITY_API_KEY가 설정되어 있지 않습니다.");

  const form = new FormData();
  form.append("prompt", req.prompt);
  if (req.negativePrompt) form.append("negative_prompt", req.negativePrompt);
  form.append("aspect_ratio", "16:9");
  form.append("output_format", "png");
  form.append("model", process.env.STABILITY_MODEL || "sd3.5-large");

  const res = await fetch("https://api.stability.ai/v2beta/stable-image/generate/sd3", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, Accept: "image/*" },
    body: form,
    signal: AbortSignal.timeout(180_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`이미지 생성 실패 (${res.status}). ${detail.slice(0, 300)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/** 지수 백오프 재시도를 포함한 이미지 1장 생성. */
export async function generateImage(
  req: ImageRequest,
  options: { retries?: number } = {},
): Promise<{ provider: ImageProviderName; path: string }> {
  const provider = resolveImageProvider();
  const retries = options.retries ?? 2;

  if (provider === "mock") {
    await writeFile(
      req.outputPath,
      placeholderImage(req.seed ?? req.prompt, req.width ?? 1920, req.height ?? 1080),
    );
    return { provider, path: req.outputPath };
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const bytes =
        provider === "openai" ? await generateOpenAI(req) : await generateStability(req);
      await writeFile(req.outputPath, bytes);
      return { provider, path: req.outputPath };
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
