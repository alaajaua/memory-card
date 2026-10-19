"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import ApiKeyNotice from "@/components/ApiKeyNotice";
import { Badge, Button, Card, ProgressBar } from "@/components/ui";
import { stats } from "@/lib/progress";
import { deleteSet, listSets } from "@/lib/store";
import { GOAL_LABEL, QTYPE_LABEL, type StudySet } from "@/lib/types";

function daysLeft(date: string) {
  if (!date) return null;
  const d = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  return d >= 0 ? `D-${d === 0 ? "Day" : d}` : null;
}

export default function Home() {
  const [sets, setSets] = useState<StudySet[] | null>(null);
  useEffect(() => {
    listSets().then(setSets);
  }, []);

  const remove = async (s: StudySet) => {
    if (!confirm(`"${s.name}" 학습 세트를 삭제할까요? 학습 기록도 함께 삭제됩니다.`)) return;
    await deleteSet(s.id);
    setSets((prev) => prev?.filter((x) => x.id !== s.id) ?? null);
  };

  const totals = sets?.reduce(
    (acc, s) => {
      const st = stats(s);
      acc.total += st.essentialTotal;
      acc.done += st.essential.mastered;
      return acc;
    },
    { total: 0, done: 0 },
  );

  return (
    <div className="space-y-4">
      <ApiKeyNotice />
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold">내 학습</h1>
          <p className="text-sm text-slate-500">많이 공부하는 것이 아니라, 시험에 필요한 만큼 정확하게.</p>
        </div>
        <Link href="/new">
          <Button className="whitespace-nowrap">+ 새 자료 추가</Button>
        </Link>
      </div>

      {totals && totals.total > 0 && (
        <Card>
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium">전체 필수 개념 암기 진행률</span>
            <span className="text-slate-500">
              {totals.done} / {totals.total}
            </span>
          </div>
          <ProgressBar value={(totals.done / totals.total) * 100} />
        </Card>
      )}

      {sets === null && <p className="text-sm text-slate-500">불러오는 중…</p>}
      {sets?.length === 0 && (
        <Card className="py-10 text-center">
          <p className="text-slate-600">아직 학습 자료가 없습니다.</p>
          <p className="mt-1 text-sm text-slate-500">강의 자료(PDF·PPTX·TXT)를 올리고 시험 정보를 설정해 보세요.</p>
          <Link href="/new">
            <Button className="mt-4">시작하기</Button>
          </Link>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {sets?.map((s) => {
          const st = stats(s);
          const dday = daysLeft(s.settings.examDate);
          const analyzing = s.chunksDone < s.chunksTotal;
          return (
            <Card key={s.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/set/${s.id}`} className="font-semibold hover:text-brand-600">
                  {s.name}
                </Link>
                {dday && <Badge tone="amber">{dday}</Badge>}
              </div>
              <div className="flex flex-wrap gap-1">
                {s.settings.types.map((t) => (
                  <Badge key={t}>{QTYPE_LABEL[t]}</Badge>
                ))}
                <Badge tone="brand">{GOAL_LABEL[s.settings.goal]}</Badge>
              </div>
              <p className="text-xs text-slate-500">
                자료 {s.materials.length}개 · 개념 {s.concepts.length}개{analyzing && " · 분석 미완료"}
              </p>
              <div>
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>필수 개념 암기</span>
                  <span>{st.percent}%</span>
                </div>
                <ProgressBar value={st.percent} />
              </div>
              <div className="mt-auto flex gap-2">
                <Link href={`/set/${s.id}`} className="flex-1">
                  <Button className="w-full">{analyzing ? "분석 계속" : "학습하기"}</Button>
                </Link>
                <Link href={`/set/${s.id}/review`}>
                  <Button variant="secondary">복습</Button>
                </Link>
                <Button variant="ghost" onClick={() => remove(s)} aria-label="삭제">
                  삭제
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
