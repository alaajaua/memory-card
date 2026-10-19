import { AppError, errorResponse, generate } from "@/lib/claude";
import { GRADE_SYSTEM, gradeUser } from "@/lib/prompts";
import { GradeSchema } from "@/lib/schemas";
import type { Question } from "@/lib/types";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { question: Question; answer: string };
    if (!body.question) throw new AppError("NO_QUESTION", "문제 정보가 없습니다.", 400);
    if (!body.answer?.trim()) throw new AppError("EMPTY", "답안을 입력하세요.", 400);
    const result = await generate(GradeSchema, GRADE_SYSTEM, gradeUser(body.question, body.answer), "low");
    return Response.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
