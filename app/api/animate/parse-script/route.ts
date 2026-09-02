import { NextRequest, NextResponse } from "next/server";
import type { ParsedScene, CameraDirection } from "@/lib/animate/types";

const SCENE_DELIMITERS = /(?:^|\n)(?:씬\s*\d+|Scene\s*\d+|##+\s|---+\s*\n)/i;

const CAMERA_KEYWORDS: [RegExp, CameraDirection][] = [
  [/줌\s*인|zoom\s*in/i, "zoom_in"],
  [/줌\s*아웃|zoom\s*out/i, "zoom_out"],
  [/팬\s*(?:왼|좌|left)/i, "pan_left"],
  [/팬\s*(?:오른|우|right)/i, "pan_right"],
  [/팬\s*(?:위|up)/i, "pan_up"],
  [/팬\s*(?:아래|down)/i, "pan_down"],
  [/트래킹|tracking|따라/i, "tracking"],
];

function detectCamera(text: string): CameraDirection {
  for (const [re, dir] of CAMERA_KEYWORDS) {
    if (re.test(text)) return dir;
  }
  return "static";
}

function parseScript(rawScript: string): ParsedScene[] {
  const blocks = rawScript.split(SCENE_DELIMITERS).map(b => b.trim()).filter(Boolean);
  if (blocks.length === 0 && rawScript.trim()) {
    blocks.push(rawScript.trim());
  }

  return blocks.map((block) => {
    const cleaned = block.replace(/^[:\s]+/, "").replace(/^씬\s*\d+\s*[:\s]*/i, "").replace(/^Scene\s*\d+\s*[:\s]*/i, "");
    const lines = cleaned.split("\n").map(l => l.trim()).filter(Boolean);
    const dialogueLines: string[] = [];
    const descLines: string[] = [];
    const charNames = new Set<string>();

    for (const line of lines) {
      const dialogueMatch = line.match(/^([가-힣a-zA-Z_]+)\s*[:：]\s*(.+)/);
      if (dialogueMatch) {
        charNames.add(dialogueMatch[1]);
        dialogueLines.push(`${dialogueMatch[1]}: ${dialogueMatch[2]}`);
      } else if (line.startsWith("(") || line.startsWith("[") || line.startsWith("*")) {
        descLines.push(line.replace(/^[(\[*]+|[)\]*]+$/g, ""));
      } else {
        descLines.push(line);
      }
    }

    const description = descLines.join(" ").slice(0, 500);
    const dialogue = dialogueLines.join("\n");
    const camera = detectCamera(block);
    const wordCount = block.length;
    const duration = Math.max(2, Math.min(10, Math.round(wordCount / 30)));

    return { description, dialogue, characterNames: [...charNames], duration, cameraDirection: camera } satisfies ParsedScene;
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { script?: string };
  if (!body.script?.trim()) return NextResponse.json({ error: "대본 텍스트를 입력해주세요" }, { status: 400 });
  const scenes = parseScript(body.script);
  return NextResponse.json({ scenes, count: scenes.length });
}
