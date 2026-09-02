import { join } from "path";
import { IMAGE_PROMPT_SYSTEM, imagePromptUserPrompt } from "../prompts/images";
import { generateJson } from "./providers/llm";
import { generateImage } from "./providers/image";
import { artifactPath, ensureDir, imagesDir, writeJson } from "./paths";
import { imagePromptListSchema, listValidatorCovering } from "./schemas";
import type { GeneratedImage, ImagePrompt, Scene, SeriesBible } from "./types";

/** 실존 국기·휘장·로고를 배제하는 최소 보장 문구. */
const SAFETY_NEGATIVES = [
  "real-world national flags",
  "real military insignia",
  "real corporate logos",
  "recognizable real people",
];

/** 스타일 접두어와 안전 negative가 빠졌으면 보정한다 (모델 응답 후처리). */
export function enforcePromptInvariants(
  prompts: ImagePrompt[],
  bible: SeriesBible,
): ImagePrompt[] {
  const stylePrefix = bible.art_style.trim();

  return prompts.map((p) => {
    const image_prompt = p.image_prompt.trim().toLowerCase().startsWith(stylePrefix.toLowerCase())
      ? p.image_prompt.trim()
      : `${stylePrefix}, ${p.image_prompt.trim()}`;

    const negativeParts = p.negative_prompt
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const lowered = negativeParts.map((s) => s.toLowerCase());
    for (const required of SAFETY_NEGATIVES) {
      if (!lowered.some((s) => s.includes(required.split(" ").slice(-1)[0]))) {
        negativeParts.push(required);
      }
    }

    return { ...p, image_prompt, negative_prompt: negativeParts.join(", ") };
  });
}

/**
 * 3단계-a — visual_description을 이미지 생성 프롬프트로 변환한다.
 * 스타일 접두어 고정 + 캐릭터 외형 키워드 재사용으로 화별 그림체·인물을 일관되게 유지.
 */
export async function generateImagePrompts(args: {
  bible: SeriesBible;
  scenes: Scene[];
}): Promise<ImagePrompt[]> {
  const sceneIds = args.scenes.map((s) => s.scene_id);

  const prompts = await generateJson({
    task: "image_prompts",
    system: IMAGE_PROMPT_SYSTEM,
    user: imagePromptUserPrompt(args),
    validate: listValidatorCovering(imagePromptListSchema, sceneIds),
    maxTokens: 16384,
    mockContext: { scenes: args.scenes, bible: args.bible },
  });

  // 모델이 순서를 바꿔도 씬 순서를 기준으로 정렬한다.
  const byId = new Map(prompts.map((p) => [p.scene_id, p]));
  const ordered = sceneIds.map((id) => byId.get(id)!).filter(Boolean);

  return enforcePromptInvariants(ordered, args.bible);
}

export async function saveImagePrompts(
  seriesId: string,
  episodeNumber: number,
  prompts: ImagePrompt[],
): Promise<string> {
  const path = artifactPath(seriesId, episodeNumber, "image_prompts");
  await writeJson(path, prompts);
  return path;
}

/** 3단계-b — 씬별 이미지를 실제로 생성해 output/images/{episodeId}/ 에 저장. */
export async function renderSceneImages(args: {
  episodeId: string;
  prompts: ImagePrompt[];
  /** 이미 있는 파일은 건너뛴다 (단계 재실행 비용 절감) */
  skipExisting?: boolean;
}): Promise<GeneratedImage[]> {
  const dir = await ensureDir(imagesDir(args.episodeId));
  const results: GeneratedImage[] = [];

  for (const p of args.prompts) {
    const outputPath = join(dir, `${p.scene_id}.png`);
    const { provider } = await generateImage({
      prompt: p.image_prompt,
      negativePrompt: p.negative_prompt,
      outputPath,
      seed: `${args.episodeId}:${p.scene_id}`,
    });
    results.push({
      scene_id: p.scene_id,
      image_path: outputPath,
      prompt: p.image_prompt,
      provider,
    });
  }

  return results;
}

export async function saveGeneratedImages(
  seriesId: string,
  episodeNumber: number,
  images: GeneratedImage[],
): Promise<string> {
  const path = artifactPath(seriesId, episodeNumber, "images");
  await writeJson(path, images);
  return path;
}
