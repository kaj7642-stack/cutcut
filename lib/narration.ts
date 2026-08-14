import Anthropic from "@anthropic-ai/sdk";
import type { Clip, NarrationTone } from "./types";

const SYSTEM_PROMPT = `너는 게임 하이라이트 쇼츠의 나레이션 대본을 쓰는 작가야.
각 클립의 상황 메모를 읽고, 요청된 톤으로 짧은 나레이션을 써줘.
쇼츠용이니까 2~4문장, 15초 이내 분량.

톤 가이드:
- funny (웃긴 해설): 예능 자막 느낌. 상황을 웃기게 풀어주는 톤.
- hype (하이프 실황): 흥분된 e스포츠 실황 중계 느낌. 텐션 높게.
- documentary (인간극장): 다큐 나레이터. 차분하고 서사적으로.
- roast (자학개그): 자기비하 유머. 실수를 담담하게 까기.

JSON 배열로 응답해:
[{"clip_id": "...", "tone": "...", "text": "나레이션 대본"}]`;

export async function generateNarrations(
  clips: Clip[],
  tone: NarrationTone,
): Promise<{ clip_id: string; tone: string; text: string }[]> {
  const client = new Anthropic();

  const userText = clips
    .filter((c) => c.selected && c.memo)
    .map(
      (c) =>
        `[${c.id}] clip ${c.index} (${c.start}s ~ ${c.end}s, 강도 ${Math.max(...c.spikes.map((s) => s.intensity))}/10)\n상황: ${c.memo}`,
    )
    .join("\n\n");

  if (!userText) return [];

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `톤: ${tone}\n\n${userText}`,
      },
    ],
  });

  const responseText = message.content[0].type === "text" ? message.content[0].text : "";
  const start = responseText.indexOf("[");
  const end = responseText.lastIndexOf("]") + 1;
  if (start === -1 || end === 0) return [];

  return JSON.parse(responseText.slice(start, end));
}
