"use client";
import { Card, ProgressBar } from "@/components/ui";
import { stats } from "@/lib/progress";
import { QTYPE_LABEL, type StudySet } from "@/lib/types";

export default function Dashboard({ set }: { set: StudySet }) {
  const st = stats(set);
  const items = [
    { label: "필수 개념", value: st.essentialTotal, cls: "text-slate-800" },
    { label: "암기 완료", value: st.essential.mastered, cls: "text-emerald-600" },
    { label: "복습 필요", value: st.essential.review, cls: "text-amber-600" },
    { label: "미암기", value: st.essential.unlearned, cls: "text-slate-500" },
  ];
  return (
    <Card className="space-y-3">
      <div className="grid grid-cols-4 gap-2 text-center">
        {items.map((i) => (
          <div key={i.label}>
            <div className={`text-xl font-bold ${i.cls}`}>{i.value}</div>
            <div className="text-xs text-slate-500">{i.label}</div>
          </div>
        ))}
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>필수 개념 학습 진행률 (테스트로 확인된 개념 기준)</span>
          <span>{st.percent}%</span>
        </div>
        <ProgressBar value={st.percent} />
      </div>
      {st.byType.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          <span className="text-slate-500">유형별 정답률</span>
          {st.byType.map((t) => (
            <span key={t.type}>
              {QTYPE_LABEL[t.type]} <b>{t.rate}%</b> <span className="text-slate-400">({t.total}문제)</span>
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
