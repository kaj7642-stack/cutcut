import type { AnimCharacter, AnimScene, StyleMode } from "./types";

const STYLE_SUFFIXES: Record<StyleMode, string> = {
  "2d": "Japanese 2D anime style, cel-shaded, clean lineart, vibrant colors, high quality anime illustration",
  "3d": "3D rendered, stylized CG animation, soft global illumination, Pixar-quality rendering, detailed textures",
};

const CAMERA_PROMPTS: Record<string, string> = {
  static: "static camera, fixed angle",
  zoom_in: "camera slowly zooming in",
  zoom_out: "camera slowly zooming out, revealing the scene",
  pan_left: "camera panning left",
  pan_right: "camera panning right",
  pan_up: "camera tilting upward",
  pan_down: "camera tilting downward",
  tracking: "camera tracking the subject, following movement",
};

export function buildImagePrompt(scene: AnimScene, characters: AnimCharacter[], styleMode: StyleMode): string {
  const parts: string[] = [];

  const sceneChars = characters.filter(c => scene.character_ids.includes(c.id));
  if (sceneChars.length > 0) {
    const charDescs = sceneChars.map(c => {
      const desc = [c.name];
      if (c.description) desc.push(`(${c.description})`);
      if (c.style_prompt) desc.push(`[${c.style_prompt}]`);
      return desc.join(" ");
    });
    parts.push(`Characters: ${charDescs.join(", ")}`);
  }

  if (scene.description) parts.push(`Scene: ${scene.description}`);
  if (scene.dialogue) parts.push(`Action/Dialogue context: "${scene.dialogue}"`);
  parts.push(CAMERA_PROMPTS[scene.camera_direction] ?? "");
  parts.push(STYLE_SUFFIXES[styleMode]);

  return parts.filter(Boolean).join(". ");
}

export function buildVideoPrompt(scene: AnimScene, characters: AnimCharacter[], styleMode: StyleMode): string {
  const base = buildImagePrompt(scene, characters, styleMode);
  return `${base}. Smooth animation, ${scene.duration}s clip, cinematic motion`;
}
