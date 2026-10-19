"use client";
import { Badge } from "@/components/ui";
import { applySelfRating, getProgress } from "@/lib/progress";
import { STATUS_LABEL, type Concept, type SelfRating, type Status, type StudySet } from "@/lib/types";

export type Update = (fn: (s: StudySet) => StudySet) => void;

export interface StudyProps {
  set: StudySet;
  update: Update;
  concepts: Concept[];
}

export function sourceText(c: Concept) {
  return [c.source.lecture, c.source.location].filter(Boolean).join(" · ");
}

const STATUS_TONE: Record<Status, "slate" | "amber" | "green"> = { unlearned: "slate", review: "amber", mastered: "green" };

export function StatusBadge({ set, id }: { set: StudySet; id: string }) {
  const s = getProgress(set, id).status;
  return <Badge tone={STATUS_TONE[s]}>{STATUS_LABEL[s]}</Badge>;
}

export function rate(update: Update, conceptId: string, r: SelfRating) {
  update((s) => ({ ...s, progress: { ...s.progress, [conceptId]: applySelfRating(getProgress(s, conceptId), r) } }));
}

const RATINGS: { r: SelfRating; label: string; cls: string }[] = [
  { r: "know", label: "알고 있음", cls: "border-emerald-300 text-emerald-700 hover:bg-emerald-50" },
  { r: "unsure", label: "헷갈림", cls: "border-amber-300 text-amber-700 hover:bg-amber-50" },
  { r: "dontknow", label: "모름", cls: "border-red-300 text-red-700 hover:bg-red-50" },
];

export function SelfRate({
  current,
  onRate,
}: {
  current?: SelfRating;
  onRate: (r: SelfRating) => void;
}) {
  return (
    <div className="flex gap-2">
      {RATINGS.map(({ r, label, cls }) => (
        <button
          key={r}
          onClick={() => onRate(r)}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm ${cls} ${current === r ? "font-semibold ring-2 ring-offset-1" : ""}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
