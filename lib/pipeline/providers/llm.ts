import Anthropic from "@anthropic-ai/sdk";
import { getMockJson, isMockMode } from "./mock";

export const DEFAULT_MODEL = process.env.PIPELINE_LLM_MODEL || "claude-sonnet-4-6";

export interface ValidationIssue {
  path: string;
  message: string;
}

/**
 * 검증 결과. ok=false면 issues를 모델에게 그대로 돌려주고 재생성시킨다.
 * 이것이 파이프라인의 1차 자동 수정 루프다.
 */
export type Validator<T> =
  | { ok: true; value: T }
  | { ok: false; issues: ValidationIssue[] };

export interface GenerateJsonOptions<T> {
  /** mock 모드에서 어떤 픽스처를 쓸지 결정하는 키 */
  task: string;
  system: string;
  user: string;
  validate: (raw: unknown) => Validator<T>;
  maxTokens?: number;
  /** 검증 실패 시 재시도 횟수 (기본 3) */
  maxRetries?: number;
  /** mock 모드에서 픽스처 생성에 넘길 컨텍스트 */
  mockContext?: unknown;
}

/** 모델 응답에서 JSON 본문만 잘라낸다. 코드펜스/서두 설명을 허용. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;

  const trimmed = candidate.trim();
  const starts = [trimmed.indexOf("{"), trimmed.indexOf("[")].filter((i) => i >= 0);
  if (starts.length === 0) {
    throw new Error("응답에서 JSON을 찾지 못했습니다.");
  }
  const start = Math.min(...starts);
  const opener = trimmed[start];
  const closer = opener === "{" ? "}" : "]";
  const end = trimmed.lastIndexOf(closer);
  if (end <= start) throw new Error("응답 JSON이 닫히지 않았습니다.");

  return JSON.parse(trimmed.slice(start, end + 1));
}

function formatIssues(issues: ValidationIssue[]): string {
  return issues.map((i) => `- ${i.path}: ${i.message}`).join("\n");
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY가 설정되어 있지 않습니다. .env.local에 넣거나 PIPELINE_MOCK=1로 실행하세요.",
    );
  }
  if (!client) client = new Anthropic();
  return client;
}

/**
 * JSON을 요구하는 LLM 호출. 파싱/스키마 검증에 실패하면 오류를 프롬프트에
 * 되먹여 재시도한다.
 */
export async function generateJson<T>(options: GenerateJsonOptions<T>): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;

  if (isMockMode()) {
    const raw = getMockJson(options.task, options.mockContext);
    const result = options.validate(raw);
    if (!result.ok) {
      throw new Error(
        `[mock:${options.task}] 픽스처가 스키마를 만족하지 않습니다.\n${formatIssues(result.issues)}`,
      );
    }
    return result.value;
  }

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: options.user }];
  let lastError = "";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const message = await getClient().messages.create({
      model: DEFAULT_MODEL,
      max_tokens: options.maxTokens ?? 8192,
      system: options.system,
      messages,
    });

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    try {
      const result = options.validate(extractJson(text));
      if (result.ok) return result.value;
      lastError = formatIssues(result.issues);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    messages.push({ role: "assistant", content: text });
    messages.push({
      role: "user",
      content:
        `직전 응답이 요구 스키마를 만족하지 않았습니다. 아래 문제를 모두 고쳐서 ` +
        `JSON만 다시 출력해주세요. 설명 문장은 넣지 마세요.\n\n${lastError}`,
    });
  }

  throw new Error(
    `LLM이 ${maxRetries + 1}회 시도 동안 유효한 JSON을 만들지 못했습니다 (task=${options.task}).\n${lastError}`,
  );
}
