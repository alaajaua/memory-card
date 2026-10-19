"use client";
import { useState } from "react";
import { Badge, Button, Card, ErrorBox } from "@/components/ui";
import { postJSON } from "@/lib/api";
import { applyVerdict, getProgress, priority, weakConcepts } from "@/lib/progress";
import type { GradeResult } from "@/lib/schemas";
import { newId } from "@/lib/store";
import { QTYPE_LABEL, VERDICT_LABEL, type Concept, type QType, type Question, type StudySet, type Verdict } from "@/lib/types";
import { sourceText, type Update } from "./shared";

type Scope = "essential" | "all" | "weak";
const SCOPE_LABEL: Record<Scope, string> = { essential: "필수 개념", all: "전체 개념", weak: "취약 개념만" };
const MAX_CONCEPTS = 12;

const norm = (s: string) => s.replace(/[\s.,·()\-"'`]/g, "").toLowerCase();

function pickConcepts(set: StudySet, scope: Scope): Concept[] {
  const pool =
    scope === "weak" ? weakConcepts(set) : set.concepts.filter((c) => scope === "all" || c.tier === "essential");
  // 우선순위가 높은(덜 외운) 개념부터, 같은 순위 안에서는 섞는다
  return pool
    .map((c) => ({ c, p: priority(getProgress(set, c.id)) + Math.random() }))
    .sort((a, b) => b.p - a.p)
    .slice(0, MAX_CONCEPTS)
    .map((x) => x.c);
}

interface Result extends GradeResult {
  userAnswer: string;
}

export default function Quiz({ set, update, defaultScope = "essential" }: { set: StudySet; update: Update; defaultScope?: Scope }) {
  const [scope, setScope] = useState<Scope>(defaultScope);
  const [count, setCount] = useState(5);
  const [types, setTypes] = useState<QType[]>(set.settings.types);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [score, setScore] = useState<Verdict[]>([]);
  const [loading, setLoading] = useState<"" | "quiz" | "grade">("");
  const [error, setError] = useState("");

  const conceptMap = new Map(set.concepts.map((c) => [c.id, c]));

  const generate = async () => {
    const concepts = pickConcepts(set, scope);
    if (!concepts.length) {
      setError(scope === "weak" ? "취약 개념이 없습니다. 먼저 학습·테스트를 진행하세요." : "출제할 개념이 없습니다.");
      return;
    }
    const ids = new Set(concepts.map((c) => c.id));
    const avoid = set.attempts.filter((a) => ids.has(a.question.conceptId)).map((a) => a.question.question);
    setLoading("quiz");
    setError("");
    try {
      const res = await postJSON<{ questions: Omit<Question, "id">[] }>("/api/quiz", {
        settings: set.settings,
        concepts,
        count,
        avoid,
        types,
      });
      setQuestions(res.questions.map((q) => ({ ...q, id: newId() })));
      setIdx(0);
      setScore([]);
      setResult(null);
      setAnswer("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading("");
    }
  };

  const record = (q: Question, userAnswer: string, g: GradeResult) => {
    setResult({ ...g, userAnswer });
    setScore((s) => [...s, g.verdict]);
    update((s) => ({
      ...s,
      attempts: [
        ...s.attempts,
        { id: newId(), at: Date.now(), question: q, userAnswer, verdict: g.verdict, feedback: g.feedback, missing: g.missing },
      ],
      progress: { ...s.progress, [q.conceptId]: applyVerdict(getProgress(s, q.conceptId), g.verdict) },
    }));
  };

  const submit = async (q: Question, userAnswer: string) => {
    if (q.type === "mcq" || q.type === "ox") {
      const ok = userAnswer === q.answer;
      return record(q, userAnswer, { verdict: ok ? "correct" : "wrong", feedback: "", missing: [] });
    }
    if (!userAnswer.trim()) return record(q, "(모름)", { verdict: "wrong", feedback: "답을 작성하지 않았습니다.", missing: q.requiredKeywords });
    if (q.type === "short" || q.type === "fill") {
      const accepted = q.answer.split("/").map(norm);
      if (accepted.includes(norm(userAnswer))) return record(q, userAnswer, { verdict: "correct", feedback: "", missing: [] });
    }
    // 단답형 불일치(동의어 가능성)·약술형·서술형은 AI가 핵심 키워드 기준으로 채점
    setLoading("grade");
    setError("");
    try {
      const g = await postJSON<GradeResult>("/api/grade", { question: q, answer: userAnswer });
      record(q, userAnswer, g);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading("");
    }
  };

  // 1) 설정 화면
  if (!questions) {
    return (
      <Card className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium">출제 범위</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SCOPE_LABEL) as Scope[]).map((s) => (
              <Button key={s} variant={scope === s ? "primary" : "secondary"} onClick={() => setScope(s)}>
                {SCOPE_LABEL[s]}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">출제 유형</p>
          <div className="flex flex-wrap gap-2">
            {set.settings.types.map((t) => (
              <Button
                key={t}
                variant={types.includes(t) ? "primary" : "secondary"}
                onClick={() => setTypes((ts) => (ts.includes(t) ? (ts.length > 1 ? ts.filter((x) => x !== t) : ts) : [...ts, t]))}
              >
                {QTYPE_LABEL[t]}
                {set.settings.weights[t] ? ` ${set.settings.weights[t]}%` : ""}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">문제 수</p>
          <div className="flex gap-2">
            {[5, 10, 15].map((n) => (
              <Button key={n} variant={count === n ? "primary" : "secondary"} onClick={() => setCount(n)}>
                {n}문제
              </Button>
            ))}
          </div>
        </div>
        {error && <ErrorBox message={error} />}
        <Button onClick={generate} disabled={loading === "quiz"} className="w-full py-3">
          {loading === "quiz" ? "AI가 문제를 만드는 중…" : "문제 생성"}
        </Button>
        <p className="text-xs text-slate-500">덜 외운 개념부터 출제되며, 이전에 푼 문제와 다른 형태로 만들어집니다.</p>
      </Card>
    );
  }

  // 3) 결과 요약
  if (idx >= questions.length) {
    const correct = score.filter((v) => v === "correct").length;
    const partial = score.filter((v) => v === "partial").length;
    return (
      <Card className="space-y-3 text-center">
        <p className="text-lg font-semibold">
          {questions.length}문제 중 {correct}개 정답{partial ? `, ${partial}개 부분 정답` : ""}
        </p>
        <p className="text-sm text-slate-500">틀린 문제와 개념은 복습 화면에 자동으로 모였습니다.</p>
        <div className="flex justify-center gap-2">
          <Button onClick={generate} disabled={loading === "quiz"}>
            {loading === "quiz" ? "생성 중…" : "새 문제 풀기"}
          </Button>
          <Button variant="secondary" onClick={() => setQuestions(null)}>
            설정 변경
          </Button>
        </div>
        {error && <ErrorBox message={error} />}
      </Card>
    );
  }

  // 2) 문제 풀이
  const q = questions[idx];
  const concept = conceptMap.get(q.conceptId);
  const choice = q.type === "mcq" || q.type === "ox";
  const longAnswer = q.type === "brief" || q.type === "essay";
  const next = () => {
    setIdx((i) => i + 1);
    setResult(null);
    setAnswer("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          {idx + 1} / {questions.length}
        </span>
        <Badge>{QTYPE_LABEL[q.type]}</Badge>
      </div>
      <Card className="space-y-4">
        <p className="whitespace-pre-line font-medium">{q.question}</p>

        {choice && (
          <div className="space-y-2">
            {q.choices.map((c, i) => {
              const picked = result?.userAnswer === c;
              const isAnswer = result && c === q.answer;
              return (
                <button
                  key={i}
                  disabled={Boolean(result)}
                  onClick={() => submit(q, c)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    isAnswer
                      ? "border-emerald-500 bg-emerald-50"
                      : picked
                        ? "border-red-400 bg-red-50"
                        : "border-slate-300 hover:border-brand-500"
                  }`}
                >
                  {q.type === "mcq" && <span className="mr-2 text-slate-400">{i + 1}.</span>}
                  {c}
                </button>
              );
            })}
          </div>
        )}

        {!choice && !result && (
          <div className="space-y-2">
            {longAnswer ? (
              <textarea
                className="w-full rounded-lg border border-slate-300 p-3 text-sm"
                rows={q.type === "essay" ? 8 : 4}
                placeholder={q.type === "essay" ? "논리적인 순서로 답안을 작성하세요." : "2~3문장으로 핵심만 작성하세요."}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
            ) : (
              <input
                className="w-full rounded-lg border border-slate-300 p-3 text-sm"
                placeholder="정답 입력"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loading !== "grade" && submit(q, answer)}
              />
            )}
            <div className="flex gap-2">
              <Button onClick={() => submit(q, answer)} disabled={loading === "grade"} className="flex-1">
                {loading === "grade" ? "AI 채점 중…" : "제출"}
              </Button>
              <Button variant="secondary" onClick={() => submit(q, "")} disabled={loading === "grade"}>
                모르겠음
              </Button>
            </div>
          </div>
        )}

        {error && <ErrorBox message={error} />}

        {result && (
          <div className="space-y-2 border-t border-slate-100 pt-3 text-sm">
            <Badge tone={result.verdict === "correct" ? "green" : result.verdict === "partial" ? "amber" : "red"}>
              {VERDICT_LABEL[result.verdict]}
            </Badge>
            {!choice && (
              <p>
                <span className="text-slate-500">내 답: </span>
                {result.userAnswer}
              </p>
            )}
            {result.feedback && <p className="text-slate-700">{result.feedback}</p>}
            {result.missing.length > 0 && (
              <p className="text-red-700">
                <span className="font-medium">부족한 내용: </span>
                {result.missing.join(", ")}
              </p>
            )}
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500">{longAnswer ? "모범답안" : "정답"}</p>
              <p className="whitespace-pre-line">{longAnswer ? q.modelAnswer || q.answer : q.answer}</p>
              {q.requiredKeywords.length > 0 && (
                <p className="mt-1 text-xs text-slate-600">필수 키워드: {q.requiredKeywords.join(", ")}</p>
              )}
            </div>
            <p>
              <span className="text-xs font-semibold text-slate-500">해설 </span>
              {q.explanation}
            </p>
            <p className="rounded-lg bg-yellow-50 px-3 py-2 text-yellow-900">
              <span className="font-semibold">암기 포인트 </span>
              {q.keyPoint}
            </p>
            {concept && <p className="text-xs text-slate-400">출처: {sourceText(concept)} · 개념: {concept.title}</p>}
            <Button onClick={next} className="w-full">
              {idx + 1 < questions.length ? "다음 문제" : "결과 보기"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
