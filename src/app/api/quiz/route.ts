import { AppError, errorResponse, generate } from "@/lib/claude";
import { QUIZ_SYSTEM, quizUser } from "@/lib/prompts";
import { QuizSchema } from "@/lib/schemas";
import type { Concept, ExamSettings, QType } from "@/lib/types";

export const maxDuration = 300;

/** 비중(%)에 맞춰 유형별 문제 수를 나눈다 (최대 나머지 방식) */
function splitCounts(types: QType[], weights: Partial<Record<QType, number>>, total: number) {
  const w = types.map((t) => weights[t] || 0);
  const sum = w.reduce((a, b) => a + b, 0);
  const ratio = sum > 0 ? w.map((x) => x / sum) : types.map(() => 1 / types.length);
  const raw = ratio.map((r) => r * total);
  const counts = raw.map(Math.floor);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]);
  let left = total - counts.reduce((a, b) => a + b, 0);
  for (const [, i] of order) {
    if (left <= 0) break;
    counts[i]++;
    left--;
  }
  return Object.fromEntries(types.map((t, i) => [t, counts[i]])) as Partial<Record<QType, number>>;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      settings: ExamSettings;
      concepts: Concept[];
      count: number;
      avoid: string[];
      types?: QType[];
    };
    if (!body.concepts?.length) throw new AppError("NO_CONCEPTS", "출제할 개념이 없습니다.", 400);
    const types = body.types?.length ? body.types : body.settings.types;
    const count = Math.min(Math.max(body.count || 5, 1), 20);
    const counts = splitCounts(types, body.settings.weights, count);
    const result = await generate(
      QuizSchema,
      QUIZ_SYSTEM,
      quizUser(body.settings, body.concepts, counts, body.avoid ?? []),
      "medium",
    );
    const ids = new Set(body.concepts.map((c) => c.id));
    // 검증: 존재하는 개념 id만, 객관식/OX는 정답이 보기 안에 있어야 함
    const questions = result.questions.filter((q) => {
      if (!ids.has(q.conceptId)) return false;
      if (q.type === "ox") q.choices = ["O", "X"];
      if (q.type === "mcq" || q.type === "ox") return q.choices.includes(q.answer);
      return Boolean(q.answer || q.modelAnswer);
    });
    if (!questions.length) throw new AppError("BAD_OUTPUT", "올바른 문제를 만들지 못했습니다. 다시 시도하세요.", 502);
    return Response.json({ questions });
  } catch (e) {
    return errorResponse(e);
  }
}
