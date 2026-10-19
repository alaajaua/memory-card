"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import Quiz from "@/components/study/Quiz";
import { sourceText, StatusBadge } from "@/components/study/shared";
import Dashboard from "@/components/study/Dashboard";
import { Badge, Button, Card } from "@/components/ui";
import { getProgress, weakConcepts } from "@/lib/progress";
import { useStudySet } from "@/lib/store";
import { QTYPE_LABEL, VERDICT_LABEL } from "@/lib/types";

type Tab = "weak" | "wrong" | "test";

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { set, update } = useStudySet(id);
  const [tab, setTab] = useState<Tab>("weak");

  if (set === undefined) return <p className="text-sm text-slate-500">불러오는 중…</p>;
  if (set === null) return <Card>학습 세트를 찾을 수 없습니다.</Card>;

  const weak = weakConcepts(set);
  // 문제별 최신 시도만, 틀리거나 부분 정답인 것
  const latest = new Map<string, (typeof set.attempts)[number]>();
  for (const a of set.attempts) latest.set(a.question.question, a);
  const wrong = [...latest.values()].filter((a) => a.verdict !== "correct").sort((a, b) => b.at - a.at);
  const conceptMap = new Map(set.concepts.map((c) => [c.id, c]));

  const tabs: { id: Tab; label: string }[] = [
    { id: "weak", label: `취약 개념 ${weak.length}` },
    { id: "wrong", label: `오답 목록 ${wrong.length}` },
    { id: "test", label: "취약 개념 테스트" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">복습 · {set.name}</h1>
        <Link href={`/set/${set.id}`}>
          <Button variant="secondary">← 학습 화면</Button>
        </Link>
      </div>
      <Dashboard set={set} />
      <div className="flex gap-1 rounded-lg bg-white p-1 shadow-sm">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm ${
              tab === t.id ? "bg-brand-600 font-medium text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "weak" && (
        <div className="space-y-3">
          {weak.length === 0 ? (
            <Card className="text-center text-sm text-slate-500">취약 개념이 없습니다. 실전 테스트로 기억을 확인해보세요.</Card>
          ) : (
            <>
              <p className="text-xs text-slate-500">
                틀렸거나 헷갈린 개념만 모았습니다. 우선순위 높은 순 · 반복해서 맞히면 목록에서 빠집니다.
              </p>
              {weak.map((c) => {
                const p = getProgress(set, c.id);
                return (
                  <Card key={c.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{c.title}</span>
                      {c.tier === "essential" && <Badge tone="brand">필수</Badge>}
                      <span className="ml-auto">
                        <StatusBadge set={set} id={c.id} />
                      </span>
                    </div>
                    <p className="text-sm font-medium text-brand-700">{c.definition}</p>
                    <p className="text-sm text-slate-700">{c.summary}</p>
                    {c.keywords.length > 0 && <p className="text-xs text-slate-600">키워드: {c.keywords.join(", ")}</p>}
                    {c.confusions.map((x) => (
                      <p key={x.other} className="text-xs text-slate-600">
                        vs {x.other}: {x.difference}
                      </p>
                    ))}
                    <p className="text-xs text-slate-400">
                      출처: {sourceText(c)} · 오답 {p.wrong}회 · 연속 정답 {p.streak}회
                    </p>
                  </Card>
                );
              })}
              <Button className="w-full" onClick={() => setTab("test")}>
                취약 개념만 테스트하기
              </Button>
            </>
          )}
        </div>
      )}

      {tab === "wrong" && (
        <div className="space-y-3">
          {wrong.length === 0 && <Card className="text-center text-sm text-slate-500">아직 틀린 문제가 없습니다.</Card>}
          {wrong.map((a) => {
            const c = conceptMap.get(a.question.conceptId);
            const long = a.question.type === "brief" || a.question.type === "essay";
            return (
              <Card key={a.id} className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge>{QTYPE_LABEL[a.question.type]}</Badge>
                  <Badge tone={a.verdict === "partial" ? "amber" : "red"}>{VERDICT_LABEL[a.verdict]}</Badge>
                  <span className="ml-auto text-xs text-slate-400">{new Date(a.at).toLocaleDateString("ko-KR")}</span>
                </div>
                <p className="font-medium">{a.question.question}</p>
                <p>
                  <span className="text-slate-500">내 답: </span>
                  {a.userAnswer}
                </p>
                <p className="rounded bg-emerald-50 px-2 py-1 text-emerald-800">
                  <span className="font-medium">{long ? "모범답안" : "정답"}: </span>
                  {long ? a.question.modelAnswer || a.question.answer : a.question.answer}
                </p>
                {a.missing.length > 0 && <p className="text-red-700">부족한 내용: {a.missing.join(", ")}</p>}
                <p className="text-slate-700">{a.question.explanation}</p>
                <p className="text-yellow-900">암기 포인트: {a.question.keyPoint}</p>
                {c && <p className="text-xs text-slate-400">출처: {sourceText(c)}</p>}
              </Card>
            );
          })}
        </div>
      )}

      {tab === "test" && <Quiz set={set} update={update} defaultScope="weak" />}
    </div>
  );
}
