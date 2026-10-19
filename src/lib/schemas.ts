// AI 응답 JSON 구조 (구조화 출력 + 검증에 사용)
import { z } from "zod";

const qtype = z.enum(["mcq", "ox", "short", "fill", "brief", "essay"]);

export const AnalyzeSchema = z.object({
  strategy: z.object({
    overview: z.string(),
    focus: z.array(z.string()),
    methods: z.array(z.string()),
  }),
  concepts: z.array(
    z.object({
      title: z.string(),
      tier: z.enum(["essential", "optional"]),
      summary: z.string(),
      definition: z.string(),
      keywords: z.array(z.string()),
      flashcards: z.array(z.object({ front: z.string(), back: z.string() })),
      cloze: z.string(),
      briefAnswer: z.string(),
      essayOutline: z.array(z.string()),
      confusions: z.array(z.object({ other: z.string(), difference: z.string() })),
      sourceLecture: z.string(),
      sourceLocation: z.string(),
      emphasized: z.boolean(),
    }),
  ),
  warnings: z.array(z.string()),
});
export type AnalyzeResult = z.infer<typeof AnalyzeSchema>;

export const QuizSchema = z.object({
  questions: z.array(
    z.object({
      type: qtype,
      conceptId: z.string(),
      question: z.string(),
      choices: z.array(z.string()),
      answer: z.string(),
      explanation: z.string(),
      keyPoint: z.string(),
      requiredKeywords: z.array(z.string()),
      modelAnswer: z.string(),
    }),
  ),
});
export type QuizResult = z.infer<typeof QuizSchema>;

export const GradeSchema = z.object({
  verdict: z.enum(["correct", "partial", "wrong"]),
  feedback: z.string(),
  missing: z.array(z.string()),
});
export type GradeResult = z.infer<typeof GradeSchema>;
