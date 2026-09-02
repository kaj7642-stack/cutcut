import { NextRequest, NextResponse } from "next/server";
import { run, get, all } from "@/lib/anime/db";
import { v4 as uuid } from "uuid";
import type { Scene, Character } from "@/lib/anime/types";

/**
 * Parse a script text into scenes.
 * Expected format (each scene separated by blank line):
 *
 * [씬 1] 숲속 길
 * 캐릭터: 하나, 유키
 * 카메라: zoom_in
 * 시간: 5초
 * 하나: "안녕, 오늘 모험을 떠나자!"
 * (유키가 고개를 끄덕인다)
 *
 * Or simple format (auto-numbered):
 * 하나: "대사 내용"
 * 나레이션: 숲은 고요했다.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { episode_id, script_text } = body;

  if (!episode_id || !script_text) {
    return NextResponse.json({ error: "episode_id and script_text required" }, { status: 400 });
  }

  // Get characters for matching
  const ep = get<{ project_id: string }>("SELECT project_id FROM episodes WHERE id = $id", { id: episode_id });
  if (!ep) return NextResponse.json({ error: "Episode not found" }, { status: 404 });

  const characters = all<Character>(
    "SELECT * FROM characters WHERE project_id = $pid",
    { pid: ep.project_id }
  );
  const charMap = new Map(characters.map(c => [c.name.toLowerCase(), c]));

  // Split into scene blocks
  const blocks = script_text.split(/\n\s*\n/).filter((b: string) => b.trim());
  const now = new Date().toISOString();

  // Delete existing scenes for this episode
  run("DELETE FROM scenes WHERE episode_id = $eid", { eid: episode_id });

  const scenes: Scene[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    const lines = block.split("\n").map((l: string) => l.trim()).filter(Boolean);

    let description = "";
    let dialogue = "";
    let matchedCharIds: string[] = [];
    let cameraDirection = "static";
    let durationSeconds = 3;

    for (const line of lines) {
      // [씬 N] description header
      const sceneHeader = line.match(/^\[씬\s*\d+\]\s*(.+)/);
      if (sceneHeader) {
        description = sceneHeader[1];
        continue;
      }

      // 캐릭터: name1, name2
      const charLine = line.match(/^캐릭터:\s*(.+)/i);
      if (charLine) {
        const names = charLine[1].split(",").map((n: string) => n.trim().toLowerCase());
        matchedCharIds = names
          .map((n: string) => charMap.get(n)?.id)
          .filter((cid: string | undefined): cid is string => !!cid);
        continue;
      }

      // 카메라: direction
      const camLine = line.match(/^카메라:\s*(.+)/i);
      if (camLine) {
        const dir = camLine[1].trim().toLowerCase().replace(/\s+/g, "_");
        if (["static","zoom_in","zoom_out","pan_left","pan_right","pan_up","pan_down"].includes(dir)) {
          cameraDirection = dir;
        }
        continue;
      }

      // 시간: Ns
      const timeLine = line.match(/^시간:\s*(\d+)/);
      if (timeLine) {
        durationSeconds = parseInt(timeLine[1]);
        continue;
      }

      // Character dialogue: 이름: "대사"
      const dialogueLine = line.match(/^(.+?):\s*["""](.+?)["""]$/);
      if (dialogueLine) {
        const charName = dialogueLine[1].trim().toLowerCase();
        const charMatch = charMap.get(charName);
        if (charMatch && !matchedCharIds.includes(charMatch.id)) {
          matchedCharIds.push(charMatch.id);
        }
        dialogue += (dialogue ? "\n" : "") + `${dialogueLine[1]}: ${dialogueLine[2]}`;
        continue;
      }

      // Stage direction (in parentheses) → description
      const stageDir = line.match(/^\((.+)\)$/);
      if (stageDir) {
        description += (description ? " " : "") + stageDir[1];
        continue;
      }

      // Anything else → description
      description += (description ? " " : "") + line;
    }

    const id = uuid();
    run(
      `INSERT INTO scenes (id, episode_id, scene_number, description, dialogue, character_ids, camera_direction, duration_seconds, subtitle_text, status, created_at, updated_at)
       VALUES ($id, $episode_id, $scene_number, $description, $dialogue, $character_ids, $camera_direction, $duration_seconds, $subtitle_text, 'pending', $now, $now)`,
      {
        id,
        episode_id,
        scene_number: i + 1,
        description: description || `씬 ${i + 1}`,
        dialogue,
        character_ids: JSON.stringify(matchedCharIds),
        camera_direction: cameraDirection,
        duration_seconds: durationSeconds,
        subtitle_text: dialogue || description,
        now,
      }
    );

    const scene = get<Scene>("SELECT * FROM scenes WHERE id = $id", { id });
    if (scene) scenes.push(scene);
  }

  return NextResponse.json({ scenes, count: scenes.length });
}
