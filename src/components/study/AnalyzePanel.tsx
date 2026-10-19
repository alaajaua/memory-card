"use client";
import { useMemo, useState } from "react";
import { Button, Card, ErrorBox, ProgressBar } from "@/components/ui";
import { postJSON } from "@/lib/api";
import { buildChunks } from "@/lib/chunks";
import type { AnalyzeResult } from "@/lib/schemas";
import { newId } from "@/lib/store";
import type { Concept, StudySet } from "@/lib/types";
import type { Update } from "./shared";

const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();

/** 자료를 구간별로 AI에 보내 개념을 생성한다. 중간에 멈춰도 이어서 진행 가능 */
export default function AnalyzePanel({ set, update }: { set: StudySet; update: Update }) {
  const chunks = useMemo(() => buildChunks(set.materials), [set.materials]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setRunning(true);
    setError("");
    const titles = set.concepts.map((c) => c.title);
    try {
      for (let i = set.chunksDone; i < chunks.length; i++) {
        const res = await postJSON<AnalyzeResult>("/api/analyze", {
          settings: set.settings,
          material: chunks[i].text,
          existingTitles: titles,
          part: `${i + 1}/${chunks.length} (${chunks[i].label})`,
        });
        const seen = new Set(titles.map(norm));
        const fresh: Concept[] = [];
        for (const c of res.concepts) {
          if (seen.has(norm(c.title))) continue;
          seen.add(norm(c.title));
          titles.push(c.title);
          const { sourceLecture, sourceLocation, ...rest } = c;
          fresh.push({ ...rest, id: newId(), source: { lecture: sourceLecture, location: sourceLocation } });
        }
        update((s) => ({
          ...s,
          strategy: s.strategy ?? res.strategy,
          concepts: [...s.concepts, ...fresh],
          notes: [...new Set([...s.notes, ...res.warnings])],
          chunksDone: i + 1,
        }));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const pct = (set.chunksDone / Math.max(1, chunks.length)) * 100;

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">AI 학습 전략 · 핵심 개념 생성</h2>
      <p className="text-sm text-slate-600">
        업로드한 자료를 {chunks.length}개 구간으로 나눠 분석합니다. 자료에 있는 내용만으로 개념을 만들고, 시험 유형·목표에 맞춰
        필수 암기와 선택 학습으로 분류합니다.
      </p>
      <ProgressBar value={pct} />
      <p className="text-xs text-slate-500">
        {set.chunksDone} / {chunks.length} 구간 완료 · 구간마다 1~2분 정도 걸릴 수 있습니다. 진행 중 생성된 개념은 바로 저장됩니다.
      </p>
      {error && <ErrorBox message={error} />}
      <Button onClick={run} disabled={running}>
        {running ? `분석 중… (${set.chunksDone + 1}/${chunks.length})` : set.chunksDone ? "이어서 분석" : "AI 분석 시작"}
      </Button>
    </Card>
  );
}
