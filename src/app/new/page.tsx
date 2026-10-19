"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ApiKeyNotice from "@/components/ApiKeyNotice";
import { Badge, Button, Card, ErrorBox } from "@/components/ui";
import { uploadFile } from "@/lib/api";
import { buildChunks } from "@/lib/chunks";
import { newId, saveSet, timestamp } from "@/lib/store";
import {
  DIFFICULTY_LABEL,
  GOAL_DESC,
  GOAL_LABEL,
  QTYPES,
  QTYPE_LABEL,
  type Difficulty,
  type ExamSettings,
  type Goal,
  type Material,
  type QType,
  type SourcePage,
} from "@/lib/types";

interface Upload {
  key: string;
  fileName: string;
  lecture: string;
  state: "parsing" | "done" | "error";
  pages?: SourcePage[];
  warnings?: string[];
  error?: string;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm ${
        active ? "border-brand-500 bg-brand-50 font-medium text-brand-700" : "border-slate-300 bg-white text-slate-600"
      }`}
    >
      {children}
    </button>
  );
}

export default function NewSetPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [types, setTypes] = useState<QType[]>([]);
  const [weights, setWeights] = useState<Partial<Record<QType, number>>>({});
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [goal, setGoal] = useState<Goal | null>(null);
  const [showExtra, setShowExtra] = useState(false);
  const [extra, setExtra] = useState({ emphasis: "", scope: "", examDate: "", pastExam: "" });
  const [error, setError] = useState("");

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const key = newId();
      const lecture = file.name.replace(/\.[^.]+$/, "");
      setUploads((u) => [...u, { key, fileName: file.name, lecture, state: "parsing" }]);
      uploadFile<{ pages: SourcePage[]; warnings: string[] }>("/api/parse", file)
        .then((r) =>
          setUploads((u) => u.map((x) => (x.key === key ? { ...x, state: "done", pages: r.pages, warnings: r.warnings } : x))),
        )
        .catch((e: Error) =>
          setUploads((u) => u.map((x) => (x.key === key ? { ...x, state: "error", error: e.message } : x))),
        );
    }
  };

  const toggleType = (t: QType) => setTypes((ts) => (ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]));

  const done = uploads.filter((u) => u.state === "done");
  const parsing = uploads.some((u) => u.state === "parsing");
  const weightSum = types.reduce((a, t) => a + (weights[t] || 0), 0);
  const weightOk = weightSum === 0 || weightSum === 100;
  const canStart = done.length > 0 && !parsing && types.length > 0 && goal && weightOk;

  const totalChars = done.reduce((a, u) => a + (u.pages ?? []).reduce((b, p) => b + p.text.length, 0), 0);

  const start = async () => {
    if (!canStart || !goal) return;
    const materials: Material[] = done.map((u) => ({
      id: u.key,
      lecture: u.lecture.trim() || u.fileName,
      fileName: u.fileName,
      pages: u.pages!,
      warnings: u.warnings ?? [],
    }));
    const settings: ExamSettings = {
      types: QTYPES.filter((t) => types.includes(t)),
      weights: Object.fromEntries(types.map((t) => [t, weights[t] || 0])),
      difficulty,
      goal,
      ...extra,
    };
    const id = newId();
    const now = timestamp();
    try {
      await saveSet({
        id,
        name: name.trim() || materials[0].lecture,
        createdAt: now,
        updatedAt: now,
        settings,
        materials,
        strategy: null,
        concepts: [],
        progress: {},
        attempts: [],
        chunksDone: 0,
        chunksTotal: buildChunks(materials).length,
        notes: [],
      });
      router.push(`/set/${id}`);
    } catch {
      setError("브라우저 저장소에 저장하지 못했습니다. 시크릿 모드이거나 저장 공간이 부족할 수 있습니다.");
    }
  };

  return (
    <div className="space-y-4">
      <ApiKeyNotice />
      <h1 className="text-xl font-bold">시험 설정</h1>

      <Card className="space-y-3">
        <h2 className="font-semibold">1. 강의 자료 업로드</h2>
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="학습 세트 이름 (예: 운영체제 중간고사) — 비우면 첫 자료 이름 사용"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="block cursor-pointer rounded-lg border-2 border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 hover:border-brand-500">
          <input
            type="file"
            multiple
            accept=".pdf,.pptx,.txt,.md"
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          클릭해서 파일 선택 (PDF · PPTX · TXT, 여러 개 가능)
        </label>
        <p className="text-xs text-slate-500">
          이미지로만 된 페이지, 복잡한 표·도표는 텍스트로 정확히 읽지 못할 수 있습니다. 그런 부분은 학습 내용에 반영되지 않습니다.
        </p>
        {uploads.map((u) => (
          <div key={u.key} className="rounded-lg border border-slate-200 p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="flex-1 truncate text-slate-700">{u.fileName}</span>
              {u.state === "parsing" && <Badge>읽는 중…</Badge>}
              {u.state === "done" && <Badge tone="green">{u.pages!.length}페이지 추출</Badge>}
              {u.state === "error" && <Badge tone="red">실패</Badge>}
              <button className="text-slate-400 hover:text-red-500" onClick={() => setUploads((x) => x.filter((y) => y.key !== u.key))}>
                ✕
              </button>
            </div>
            {u.state === "done" && (
              <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                강의 이름
                <input
                  className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm text-slate-700"
                  value={u.lecture}
                  onChange={(e) => setUploads((x) => x.map((y) => (y.key === u.key ? { ...y, lecture: e.target.value } : y)))}
                />
              </label>
            )}
            {u.warnings?.map((w) => (
              <p key={w} className="mt-2 text-xs text-amber-700">
                ⚠ {w}
              </p>
            ))}
            {u.error && <p className="mt-2 text-xs text-red-600">{u.error}</p>}
          </div>
        ))}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">
          2. 시험 출제 유형 <span className="text-xs font-normal text-slate-500">(복수 선택)</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          {QTYPES.map((t) => (
            <Chip key={t} active={types.includes(t)} onClick={() => toggleType(t)}>
              {QTYPE_LABEL[t]}
            </Chip>
          ))}
        </div>
        {types.length > 1 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">유형별 비중(%) — 선택 사항. 입력하면 합계 100%가 되어야 합니다.</p>
            <div className="flex flex-wrap gap-3">
              {QTYPES.filter((t) => types.includes(t)).map((t) => (
                <label key={t} className="flex items-center gap-1 text-sm">
                  {QTYPE_LABEL[t]}
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="w-16 rounded border border-slate-300 px-2 py-1"
                    value={weights[t] ?? ""}
                    onChange={(e) => setWeights((w) => ({ ...w, [t]: Number(e.target.value) || 0 }))}
                  />
                  %
                </label>
              ))}
            </div>
            {!weightOk && <p className="text-xs text-red-600">비중 합계가 {weightSum}%입니다. 100%로 맞추거나 모두 비워두세요.</p>}
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">3. 학습 목표</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(GOAL_LABEL) as Goal[]).map((g) => (
            <Chip key={g} active={goal === g} onClick={() => setGoal(g)}>
              <span className="block">{GOAL_LABEL[g]}</span>
              <span className="block text-xs text-slate-500">{GOAL_DESC[g]}</span>
            </Chip>
          ))}
        </div>
        <h3 className="pt-2 text-sm font-medium">시험 난이도</h3>
        <div className="flex gap-2">
          {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((d) => (
            <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
              {DIFFICULTY_LABEL[d]}
            </Chip>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <button className="flex w-full items-center justify-between font-semibold" onClick={() => setShowExtra((v) => !v)}>
          4. 추가 시험 정보 <span className="text-xs font-normal text-slate-500">{showExtra ? "접기" : "선택 사항 · 펼치기"}</span>
        </button>
        {showExtra && (
          <div className="space-y-2 text-sm">
            <textarea
              className="w-full rounded-lg border border-slate-300 p-2"
              rows={2}
              placeholder="교수님이 강조한 내용 (예: 3강 스케줄링 알고리즘 비교 중요)"
              value={extra.emphasis}
              onChange={(e) => setExtra({ ...extra, emphasis: e.target.value })}
            />
            <input
              className="w-full rounded-lg border border-slate-300 p-2"
              placeholder="예상 출제 범위 (예: 1~6강)"
              value={extra.scope}
              onChange={(e) => setExtra({ ...extra, scope: e.target.value })}
            />
            <label className="flex items-center gap-2">
              시험 날짜
              <input
                type="date"
                className="rounded-lg border border-slate-300 p-2"
                value={extra.examDate}
                onChange={(e) => setExtra({ ...extra, examDate: e.target.value })}
              />
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-300 p-2"
              rows={4}
              placeholder="기출문제 또는 예상 문제 (붙여넣기)"
              value={extra.pastExam}
              onChange={(e) => setExtra({ ...extra, pastExam: e.target.value })}
            />
          </div>
        )}
      </Card>

      {error && <ErrorBox message={error} />}

      <div className="flex flex-col items-end gap-1">
        <Button onClick={start} disabled={!canStart} className="px-6 py-3">
          학습 시작
        </Button>
        <p className="text-xs text-slate-500">
          {!done.length
            ? "강의 자료를 올려주세요."
            : !types.length
              ? "출제 유형을 선택해주세요."
              : !goal
                ? "학습 목표를 선택해주세요."
                : `추출된 텍스트 약 ${totalChars.toLocaleString()}자 · AI 분석 ${buildChunks(
                    done.map((u) => ({ id: u.key, lecture: u.lecture, fileName: u.fileName, pages: u.pages!, warnings: [] })),
                  ).length}회 호출 예정 (API 요금 발생)`}
        </p>
      </div>
    </div>
  );
}
