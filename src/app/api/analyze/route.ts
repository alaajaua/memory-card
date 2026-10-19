import { AppError, errorResponse, generate } from "@/lib/claude";
import { ANALYZE_SYSTEM, analyzeUser } from "@/lib/prompts";
import { AnalyzeSchema } from "@/lib/schemas";
import type { ExamSettings } from "@/lib/types";

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      settings: ExamSettings;
      material: string;
      existingTitles: string[];
      part: string;
    };
    if (!body.material?.trim()) throw new AppError("EMPTY", "분석할 자료 내용이 없습니다.", 400);
    if (!body.settings?.types?.length) throw new AppError("NO_TYPES", "시험 유형을 하나 이상 선택하세요.", 400);
    const result = await generate(
      AnalyzeSchema,
      ANALYZE_SYSTEM,
      analyzeUser(body.settings, body.material, body.existingTitles ?? [], body.part ?? ""),
      "medium",
    );
    return Response.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
