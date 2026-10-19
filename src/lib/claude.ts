// 서버 전용: Anthropic API 호출 (API Key는 서버 환경변수에서만 읽는다)
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

// 서버 측 거절 대체(fallback)를 지원하는 모델
const FALLBACK_MODELS = new Set([
  "claude-opus-5-5",
  "claude-opus-5",
  "claude-fable-5-1",
  "claude-sonnet-5-5",
]);

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}

export function hasApiKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function generate<T extends z.ZodType>(
  schema: T,
  system: string,
  user: string,
  effort: "low" | "medium" | "high" = "medium",
): Promise<z.infer<T>> {
  if (!hasApiKey()) {
    throw new AppError(
      "NO_API_KEY",
      "ANTHROPIC_API_KEY가 설정되지 않았습니다. 프로젝트 루트의 .env.local 파일에 키를 넣고 서버를 다시 시작하세요.",
      503,
    );
  }
  const client = new Anthropic();
  const fallback = FALLBACK_MODELS.has(MODEL)
    ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
    : {};

  let res;
  try {
    res = await client.beta.messages
      .stream({
        model: MODEL,
        max_tokens: 64000,
        system,
        messages: [{ role: "user", content: user }],
        output_config: { effort, format: betaZodOutputFormat(schema) },
        ...fallback,
      })
      .finalMessage();
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError)
      throw new AppError("INVALID_KEY", "API Key가 올바르지 않습니다. .env.local의 ANTHROPIC_API_KEY를 확인하세요.", 401);
    if (e instanceof Anthropic.PermissionDeniedError)
      throw new AppError("FORBIDDEN", "이 API Key로는 해당 모델을 사용할 수 없습니다.", 403);
    if (e instanceof Anthropic.RateLimitError)
      throw new AppError("RATE_LIMIT", "요청이 너무 많습니다. 잠시 후 다시 시도하세요.", 429);
    if (e instanceof Anthropic.BadRequestError)
      throw new AppError("BAD_REQUEST", `AI 요청 형식 오류: ${e.message}`, 400);
    if (e instanceof Anthropic.APIConnectionError)
      throw new AppError("NETWORK", "AI 서버에 연결하지 못했습니다. 네트워크를 확인하세요.", 502);
    if (e instanceof Anthropic.APIError)
      throw new AppError("API_ERROR", `AI 서버 오류(${e.status ?? "?"}). 잠시 후 다시 시도하세요.`, 502);
    if (e instanceof Anthropic.AnthropicError)
      throw new AppError("BAD_OUTPUT", "AI 응답 형식을 해석하지 못했습니다. 다시 시도하세요.", 502);
    throw e;
  }

  if (res.stop_reason === "refusal")
    throw new AppError("REFUSAL", "AI가 이 요청에 응답하지 않았습니다. 자료 내용을 확인하세요.", 422);
  if (res.stop_reason === "max_tokens")
    throw new AppError("TRUNCATED", "AI 응답이 너무 길어 잘렸습니다. 자료를 더 작게 나눠 업로드하세요.", 422);
  if (!res.parsed_output)
    throw new AppError("BAD_OUTPUT", "AI 응답 형식을 해석하지 못했습니다. 다시 시도하세요.", 502);
  return res.parsed_output as z.infer<T>;
}

export function errorResponse(e: unknown) {
  if (e instanceof AppError) {
    return Response.json({ error: e.message, code: e.code }, { status: e.status });
  }
  console.error(e);
  return Response.json({ error: "알 수 없는 서버 오류가 발생했습니다.", code: "UNKNOWN" }, { status: 500 });
}
