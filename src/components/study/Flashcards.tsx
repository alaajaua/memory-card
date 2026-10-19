"use client";
import { useMemo, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { getProgress, priority } from "@/lib/progress";
import { rate, SelfRate, sourceText, type StudyProps } from "./shared";

export default function Flashcards({ set, update, concepts }: StudyProps) {
  // 덜 외운 개념의 카드부터 (목록은 처음 열 때 한 번만 정한다)
  const cards = useMemo(
    () =>
      [...concepts]
        .sort((a, b) => priority(getProgress(set, b.id)) - priority(getProgress(set, a.id)))
        .flatMap((c) => c.flashcards.map((f) => ({ ...f, concept: c }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [concepts],
  );
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (!cards.length) return <Card>카드가 없습니다.</Card>;
  if (idx >= cards.length)
    return (
      <Card className="space-y-3 text-center">
        <p>카드 {cards.length}장을 모두 봤습니다.</p>
        <p className="text-sm text-slate-500">이제 실전 테스트로 기억하고 있는지 확인해보세요.</p>
        <Button onClick={() => setIdx(0)}>처음부터 다시</Button>
      </Card>
    );

  const card = cards[idx];
  const next = () => {
    setFlipped(false);
    setIdx((i) => i + 1);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-xs text-slate-500">
        <span>
          {idx + 1} / {cards.length}
        </span>
        <span>{card.concept.title}</span>
      </div>
      <button
        onClick={() => setFlipped((f) => !f)}
        className="flex min-h-56 w-full flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm"
      >
        {!flipped ? (
          <>
            <Badge tone="brand">질문</Badge>
            <p className="mt-3 text-lg font-medium">{card.front}</p>
            <p className="mt-4 text-xs text-slate-400">클릭해서 정답 보기</p>
          </>
        ) : (
          <>
            <Badge tone="green">정답</Badge>
            <p className="mt-3 whitespace-pre-line text-base">{card.back}</p>
            <p className="mt-4 text-xs text-slate-400">출처: {sourceText(card.concept)}</p>
          </>
        )}
      </button>
      {flipped ? (
        <SelfRate
          current={undefined}
          onRate={(r) => {
            rate(update, card.concept.id, r);
            next();
          }}
        />
      ) : (
        <div className="flex justify-between">
          <Button variant="ghost" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)}>
            ← 이전
          </Button>
          <Button variant="ghost" onClick={next}>
            건너뛰기 →
          </Button>
        </div>
      )}
    </div>
  );
}
