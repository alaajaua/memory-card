"use client";
import { Badge, Card } from "@/components/ui";
import { getProgress } from "@/lib/progress";
import { rate, SelfRate, sourceText, StatusBadge, type StudyProps } from "./shared";

export default function Summary({ set, update, concepts }: StudyProps) {
  const showBrief = set.settings.types.includes("brief");
  const showEssay = set.settings.types.includes("essay");
  return (
    <div className="space-y-3">
      {concepts.map((c) => (
        <Card key={c.id} className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{c.title}</h3>
            <Badge tone={c.tier === "essential" ? "brand" : "slate"}>{c.tier === "essential" ? "필수" : "선택"}</Badge>
            {c.emphasized && <Badge tone="amber">강조</Badge>}
            <span className="ml-auto">
              <StatusBadge set={set} id={c.id} />
            </span>
          </div>
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700">{c.definition}</p>
          <p className="text-sm text-slate-700">{c.summary}</p>
          {c.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {c.keywords.map((k) => (
                <span key={k} className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-900">
                  {k}
                </span>
              ))}
            </div>
          )}
          {showBrief && c.briefAnswer && (
            <div className="text-sm">
              <p className="text-xs font-semibold text-slate-500">약술형 모범답안</p>
              <p className="text-slate-700">{c.briefAnswer}</p>
            </div>
          )}
          {showEssay && c.essayOutline.length > 0 && (
            <div className="text-sm">
              <p className="text-xs font-semibold text-slate-500">서술형 답안 구조</p>
              <ol className="list-decimal pl-5 text-slate-700">
                {c.essayOutline.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ol>
            </div>
          )}
          {c.confusions.length > 0 && (
            <div className="text-sm">
              <p className="text-xs font-semibold text-slate-500">헷갈리기 쉬운 개념</p>
              {c.confusions.map((x) => (
                <p key={x.other} className="text-slate-700">
                  <b>vs {x.other}</b>: {x.difference}
                </p>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-400">출처: {sourceText(c)}</p>
          <SelfRate current={getProgress(set, c.id).selfRating} onRate={(r) => rate(update, c.id, r)} />
        </Card>
      ))}
    </div>
  );
}
