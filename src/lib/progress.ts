// 암기 상태 계산: 테스트 결과를 기준으로 완료 여부를 판단한다
import {
  QTYPES,
  type ConceptProgress,
  type QType,
  type SelfRating,
  type StudySet,
  type Verdict,
} from "./types";

export const EMPTY_PROGRESS: ConceptProgress = { status: "unlearned", streak: 0, correct: 0, wrong: 0, lastAt: 0 };

export function getProgress(s: StudySet, conceptId: string): ConceptProgress {
  return s.progress[conceptId] ?? EMPTY_PROGRESS;
}

/** 문제 채점 결과 반영: 한 번도 틀린 적 없으면 1번, 틀린 적 있으면 연속 2번 맞혀야 암기 완료 */
export function applyVerdict(p: ConceptProgress, v: Verdict): ConceptProgress {
  const now = Date.now();
  if (v === "correct") {
    const streak = p.streak + 1;
    const need = p.wrong > 0 ? 2 : 1;
    return { ...p, streak, correct: p.correct + 1, status: streak >= need ? "mastered" : "review", lastAt: now };
  }
  if (v === "partial") return { ...p, streak: 0, status: "review", lastAt: now };
  return { ...p, streak: 0, wrong: p.wrong + 1, status: "review", lastAt: now };
}

/** 자기 평가 반영: "알고 있음"만으로는 완료 처리하지 않는다 */
export function applySelfRating(p: ConceptProgress, r: SelfRating): ConceptProgress {
  const next = { ...p, selfRating: r, lastAt: Date.now() };
  if (r !== "know" && p.status === "mastered") next.status = "review";
  if (r !== "know" && p.status === "unlearned") next.status = "review";
  return next;
}

/** 복습 우선순위 (클수록 먼저) */
export function priority(p: ConceptProgress) {
  let score = p.wrong * 3 - p.streak * 2;
  if (p.selfRating === "dontknow") score += 3;
  if (p.selfRating === "unsure") score += 2;
  if (p.status === "review") score += 4;
  if (p.status === "unlearned") score += 1;
  if (p.status === "mastered") score -= 10;
  return score;
}

export function isWeak(p: ConceptProgress) {
  return p.status === "review" || (p.status !== "mastered" && (p.selfRating === "unsure" || p.selfRating === "dontknow"));
}

export function weakConcepts(s: StudySet) {
  return s.concepts
    .filter((c) => isWeak(getProgress(s, c.id)))
    .sort((a, b) => priority(getProgress(s, b.id)) - priority(getProgress(s, a.id)));
}

export function stats(s: StudySet) {
  const essential = s.concepts.filter((c) => c.tier === "essential");
  const count = { mastered: 0, review: 0, unlearned: 0 };
  for (const c of essential) count[getProgress(s, c.id).status]++;
  const all = { mastered: 0, review: 0, unlearned: 0 };
  for (const c of s.concepts) all[getProgress(s, c.id).status]++;
  const byType: Partial<Record<QType, { total: number; score: number }>> = {};
  for (const a of s.attempts) {
    const t = (byType[a.question.type] ??= { total: 0, score: 0 });
    t.total++;
    t.score += a.verdict === "correct" ? 1 : a.verdict === "partial" ? 0.5 : 0;
  }
  return {
    essentialTotal: essential.length,
    essential: count,
    all,
    percent: essential.length ? Math.round((count.mastered / essential.length) * 100) : 0,
    byType: QTYPES.filter((t) => byType[t]).map((t) => ({
      type: t,
      total: byType[t]!.total,
      rate: Math.round((byType[t]!.score / byType[t]!.total) * 100),
    })),
  };
}
