"use client";
import { useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { rate, sourceText, StatusBadge, type StudyProps } from "./shared";
import type { Concept } from "@/lib/types";

const norm = (s: string) => s.replace(/[\s.,·()\-]/g, "").toLowerCase();

function parts(text: string) {
  // "[[키워드]]" 부분을 빈칸으로
  return text.split(/(\[\[[^\]]+\]\])/g).map((p) => (p.startsWith("[[") ? { blank: p.slice(2, -2) } : { text: p }));
}

function ClozeCard({ c, ...props }: Omit<StudyProps, "concepts"> & { c: Concept }) {
  const segs = parts(c.cloze || "");
  const blanks = segs.filter((s) => "blank" in s).map((s) => (s as { blank: string }).blank);
  const [inputs, setInputs] = useState<string[]>(blanks.map(() => ""));
  const [checked, setChecked] = useState(false);
  if (!blanks.length) return null;

  const results = blanks.map((b, i) => norm(inputs[i]) === norm(b));
  const check = () => {
    setChecked(true);
    rate(props.update, c.id, results.every(Boolean) ? "know" : "unsure");
  };
  const reset = () => {
    setChecked(false);
    setInputs(blanks.map(() => ""));
  };

  let bi = -1;
  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{c.title}</span>
        {c.tier === "essential" && <Badge tone="brand">필수</Badge>}
        <span className="ml-auto">
          <StatusBadge set={props.set} id={c.id} />
        </span>
      </div>
      <p className="leading-9">
        {segs.map((s, i) => {
          if ("text" in s) return <span key={i}>{s.text}</span>;
          const j = ++bi;
          return (
            <span key={i} className="inline-flex flex-col align-middle">
              <input
                value={inputs[j]}
                disabled={checked}
                onChange={(e) => setInputs((v) => v.map((x, k) => (k === j ? e.target.value : x)))}
                onKeyDown={(e) => e.key === "Enter" && !checked && check()}
                className={`mx-1 w-32 rounded border-b-2 bg-slate-50 px-2 text-center text-sm ${
                  checked ? (results[j] ? "border-emerald-500 text-emerald-700" : "border-red-500 text-red-700") : "border-brand-500"
                }`}
              />
              {checked && !results[j] && <span className="mx-1 text-center text-xs text-emerald-700">{s.blank}</span>}
            </span>
          );
        })}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">출처: {sourceText(c)}</span>
        {checked ? (
          <Button variant="secondary" onClick={reset}>
            다시 풀기
          </Button>
        ) : (
          <Button onClick={check}>정답 확인</Button>
        )}
      </div>
    </Card>
  );
}

export default function Cloze(props: StudyProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">빈칸에 들어갈 핵심 키워드를 입력하고 정답을 확인하세요. 틀린 개념은 복습 목록에 추가됩니다.</p>
      {props.concepts.map((c) => (
        <ClozeCard key={c.id} c={c} set={props.set} update={props.update} />
      ))}
    </div>
  );
}
