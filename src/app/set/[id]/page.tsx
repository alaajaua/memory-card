"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import ApiKeyNotice from "@/components/ApiKeyNotice";
import AnalyzePanel from "@/components/study/AnalyzePanel";
import Cloze from "@/components/study/Cloze";
import Dashboard from "@/components/study/Dashboard";
import Flashcards from "@/components/study/Flashcards";
import Quiz from "@/components/study/Quiz";
import Summary from "@/components/study/Summary";
import { Badge, Button, Card } from "@/components/ui";
import { useStudySet } from "@/lib/store";
import { DIFFICULTY_LABEL, GOAL_LABEL, QTYPE_LABEL, type ExamSettings, type QType } from "@/lib/types";

type Tab = "summary" | "cards" | "cloze" | "quiz";
const TABS: { id: Tab; label: string }[] = [
  { id: "summary", label: "핵심 요약" },
  { id: "cards", label: "암기 카드" },
  { id: "cloze", label: "빈칸 암기" },
  { id: "quiz", label: "실전 테스트" },
];

/** 비중이 가장 큰 시험 유형에 맞는 학습 방식을 기본으로 */
function defaultTab(s: ExamSettings): Tab {
  const main = [...s.types].sort((a, b) => (s.weights[b] || 0) - (s.weights[a] || 0))[0];
  const map: Record<QType, Tab> = { mcq: "cards", ox: "cards", short: "cloze", fill: "cloze", brief: "summary", essay: "summary" };
  return map[main] ?? "summary";
}

export default function StudyPage() {
  const { id } = useParams<{ id: string }>();
  const { set, update } = useStudySet(id);
  const [tab, setTab] = useState<Tab | null>(null);
  const [onlyEssential, setOnlyEssential] = useState(true);
  const [showStrategy, setShowStrategy] = useState(true);

  if (set === undefined) return <p className="text-sm text-slate-500">불러오는 중…</p>;
  if (set === null)
    return (
      <Card>
        학습 세트를 찾을 수 없습니다. <Link href="/" className="text-brand-600 underline">홈으로</Link>
      </Card>
    );

  const current = tab ?? defaultTab(set.settings);
  const concepts = onlyEssential ? set.concepts.filter((c) => c.tier === "essential") : set.concepts;
  const analyzing = set.chunksDone < set.chunksTotal;
  const warnings = [...set.materials.flatMap((m) => m.warnings.map((w) => `${m.lecture}: ${w}`)), ...set.notes];

  return (
    <div className="space-y-4">
      <ApiKeyNotice />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">{set.name}</h1>
          <div className="mt-1 flex flex-wrap gap-1">
            {set.settings.types.map((t) => (
              <Badge key={t}>
                {QTYPE_LABEL[t]}
                {set.settings.weights[t] ? ` ${set.settings.weights[t]}%` : ""}
              </Badge>
            ))}
            <Badge tone="brand">{GOAL_LABEL[set.settings.goal]}</Badge>
            <Badge>난이도 {DIFFICULTY_LABEL[set.settings.difficulty]}</Badge>
          </div>
        </div>
        <Link href={`/set/${set.id}/review`}>
          <Button variant="secondary">복습 화면 →</Button>
        </Link>
      </div>

      {analyzing && <AnalyzePanel set={set} update={update} />}

      {set.concepts.length > 0 && <Dashboard set={set} />}

      {set.strategy && (
        <Card className="space-y-2">
          <button className="flex w-full justify-between font-semibold" onClick={() => setShowStrategy((v) => !v)}>
            AI 맞춤 학습 전략 <span className="text-xs font-normal text-slate-500">{showStrategy ? "접기" : "펼치기"}</span>
          </button>
          {showStrategy && (
            <div className="space-y-2 text-sm text-slate-700">
              <p>{set.strategy.overview}</p>
              <div>
                <p className="text-xs font-semibold text-slate-500">우선 공부할 포인트</p>
                <ul className="list-disc pl-5">
                  {set.strategy.focus.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">추천 학습 방법</p>
                <ul className="list-disc pl-5">
                  {set.strategy.methods.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-slate-400">
                ※ 출제 여부를 확정하는 것이 아니라 우선순위 제안입니다. 필수 암기만 완료해도 최소 목표를 달성할 수 있도록 구성했습니다.
              </p>
            </div>
          )}
        </Card>
      )}

      {warnings.length > 0 && (
        <details className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <summary className="cursor-pointer font-medium">자료 관련 안내 {warnings.length}건</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </details>
      )}

      {set.concepts.length > 0 && (
        <>
          <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-2 bg-[#f7f8fa]/95 px-4 py-2 backdrop-blur">
            <div className="flex flex-1 gap-1 overflow-x-auto rounded-lg bg-white p-1 shadow-sm">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${
                    current === t.id ? "bg-brand-600 font-medium text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {current !== "quiz" && (
              <label className="flex items-center gap-1 text-xs text-slate-600">
                <input type="checkbox" checked={onlyEssential} onChange={(e) => setOnlyEssential(e.target.checked)} />
                필수만 ({set.concepts.filter((c) => c.tier === "essential").length}/{set.concepts.length})
              </label>
            )}
          </div>

          {current === "summary" && <Summary set={set} update={update} concepts={concepts} />}
          {current === "cards" && <Flashcards key={String(onlyEssential)} set={set} update={update} concepts={concepts} />}
          {current === "cloze" && <Cloze set={set} update={update} concepts={concepts} />}
          {current === "quiz" && <Quiz set={set} update={update} />}
        </>
      )}
    </div>
  );
}
