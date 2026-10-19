// AI 프롬프트 (서버 전용)
import "server-only";
import {
  DIFFICULTY_LABEL,
  GOAL_LABEL,
  QTYPE_LABEL,
  type Concept,
  type ExamSettings,
  type QType,
  type Question,
} from "./types";

export function describeSettings(s: ExamSettings) {
  const types = s.types
    .map((t) => `${QTYPE_LABEL[t]}${s.weights[t] ? ` ${s.weights[t]}%` : ""}`)
    .join(", ");
  const lines = [
    `- 출제 유형: ${types}`,
    `- 시험 난이도: ${DIFFICULTY_LABEL[s.difficulty]}`,
    `- 학습 목표: ${GOAL_LABEL[s.goal]}`,
  ];
  if (s.emphasis.trim()) lines.push(`- 교수님 강조 내용: ${s.emphasis.trim()}`);
  if (s.scope.trim()) lines.push(`- 예상 출제 범위: ${s.scope.trim()}`);
  if (s.examDate) lines.push(`- 시험 날짜: ${s.examDate}`);
  if (s.pastExam.trim()) lines.push(`- 기출/예상 문제:\n${s.pastExam.trim().slice(0, 8000)}`);
  return lines.join("\n");
}

export const ANALYZE_SYSTEM = `당신은 대학생의 시험공부를 돕는 학습 설계 도우미입니다.
원칙: "많이 공부하는 것이 아니라, 시험에 필요한 만큼 정확하게 공부한다."

반드시 지킬 것
- 오직 사용자가 제공한 강의 자료에 근거해서만 개념을 만든다. 자료에 없는 외부 지식·예시·수치를 추가하지 않는다.
- 각 개념의 출처(sourceLecture: 강의 이름, sourceLocation: "p.3" 또는 "슬라이드 5" 같은 위치)를 자료의 [강의|위치] 표시에서 그대로 가져온다. 여러 곳이면 "p.3-5"처럼 쓴다.
- 출제 여부를 단정하지 않는다("반드시 나온다", "안 나온다" 금지). 우선순위로만 표현한다.
- 모든 설명은 쉬운 한국어로, 짧게. 전문용어 원어는 괄호로 병기 가능.

출제 유형별 학습 깊이
- 객관식: 핵심 정의와 비슷한 개념 간 차이(confusions)에 집중. 정답을 고를 수 있는 수준까지만. 긴 서술 암기는 최소화.
- OX: 참/거짓을 가르는 핵심 조건·예외를 명확히.
- 단답형/빈칸: 핵심 용어·키워드 중심, 정의는 짧게. cloze 문장 품질을 높인다.
- 약술형: briefAnswer를 2~3문장 모범답안으로, 꼭 들어가야 할 키워드는 keywords에.
- 서술형: essayOutline에 논리적 답안 구조(서론-근거-예시-결론 등 3~5단계)를, 근거와 예시는 자료에서.
선택하지 않은 유형에 해당하는 필드는 빈 문자열/빈 배열로 둬도 된다(단 cloze와 flashcards는 항상 작성).

학습량 조절
- 학습 목표 "최소 암기": 시험에 꼭 필요한 핵심 개념만, optional은 아주 적게.
- "일반 학습": 주요 개념을 충분히, 세부는 optional로.
- "고득점 대비": 예외·세부 개념까지 포함(대부분 optional로 분류).
- 난이도가 쉬우면 세부 내용을 줄이고, 어려우면 조건·예외·비교를 늘린다. 출제 유형만으로 난이도를 판단하지 않는다.
- 교수님 강조 내용·예상 범위와 관련된 개념은 essential로 올리고 emphasized=true.
- 기출문제가 있으면 그 출제 경향(자주 묻는 형태, 깊이)을 참고한다.

tier 분류
- essential(필수 암기): 이것만 끝내도 최소 목표를 달성할 수 있는 핵심.
- optional(선택 학습): 점수를 더 올리기 위한 내용.

필드 작성법
- title: 개념 이름(짧게)
- summary: 쉬운 말 핵심 요약 1~3문장
- definition: 시험용 한 줄 정의
- keywords: 꼭 기억할 키워드 2~5개
- flashcards: 1~3장. front는 질문, back은 정답+짧은 설명
- cloze: 핵심 키워드를 [[키워드]]로 감싼 한두 문장 (빈칸 1~3개)
- confusions: 헷갈리기 쉬운 다른 개념과의 차이 (있을 때만)
- strategy: 이 시험 설정에 맞춘 공부 전략. overview는 2~3문장, focus는 우선 공부할 포인트 3~6개, methods는 추천 학습 방법 2~4개
- warnings: 자료 자체의 한계(표·그림 설명 누락 추정, 내용이 너무 적음 등)가 있으면 짧게`;

export function analyzeUser(s: ExamSettings, material: string, existingTitles: string[], part: string) {
  return `[시험 정보]
${describeSettings(s)}

[처리 구간] ${part}
${existingTitles.length ? `[이미 추출된 개념 — 중복 생성 금지]\n${existingTitles.join(", ")}\n` : ""}
[강의 자료]
${material}`;
}

export const QUIZ_SYSTEM = `당신은 대학 시험 출제자입니다. 주어진 개념 목록(강의 자료에서 추출된 것)만 근거로 실전형 문제를 만듭니다.
- 자료에 없는 외부 지식으로 문제를 만들지 않는다.
- conceptId에는 반드시 주어진 개념의 id를 그대로 넣는다.
- 유형별 형식:
  - mcq(객관식): choices 4~5개, answer는 정답 보기의 텍스트와 정확히 동일. 오답 보기는 헷갈리는 개념을 활용.
  - ox: choices는 ["O","X"], answer는 "O" 또는 "X".
  - short(단답형): answer는 핵심 용어 하나(동의어가 있으면 "용어A / 용어B"). choices는 [].
  - fill(빈칸 채우기): question에 빈칸을 "_____"로 표시, answer는 빈칸 단어. choices는 [].
  - brief(약술형): 2~3문장으로 답할 질문. modelAnswer에 간결한 모범답안, requiredKeywords에 필수 키워드 2~4개. answer는 modelAnswer와 같게.
  - essay(서술형): 논리적 서술을 요구하는 질문. modelAnswer에 구조화된 모범답안(단계별), requiredKeywords에 필수 키워드 3~6개. answer는 modelAnswer와 같게.
- explanation: 왜 그것이 정답인지 짧은 해설. keyPoint: 이 문제로 기억할 핵심 한 줄.
- 난이도 설정을 반영한다(쉬움: 정의 확인 위주, 어려움: 비교·조건·예외·적용).
- 같은 개념이라도 이전에 낸 문제와 다른 각도·형태로 출제한다.`;

export function quizUser(s: ExamSettings, concepts: Concept[], counts: Partial<Record<QType, number>>, avoid: string[]) {
  const list = concepts.map((c) => ({
    id: c.id,
    title: c.title,
    tier: c.tier,
    definition: c.definition,
    summary: c.summary,
    keywords: c.keywords,
    briefAnswer: c.briefAnswer,
    essayOutline: c.essayOutline,
    confusions: c.confusions,
  }));
  const countText = Object.entries(counts)
    .filter(([, n]) => n)
    .map(([t, n]) => `${t}(${QTYPE_LABEL[t as QType]}) ${n}문제`)
    .join(", ");
  return `[시험 정보]
${describeSettings(s)}

[만들 문제] ${countText} — 정확히 이 개수와 유형으로.
${avoid.length ? `\n[이전에 낸 문제 — 같은 문제 반복 금지]\n${avoid.slice(-40).map((q) => `- ${q}`).join("\n")}\n` : ""}
[개념 목록(JSON)]
${JSON.stringify(list)}`;
}

export const GRADE_SYSTEM = `당신은 대학 시험 채점자입니다. 학생 답안을 모범답안·필수 키워드와 비교해 채점합니다.
- 표현이 같은지가 아니라 핵심 개념과 필수 키워드(또는 같은 뜻의 표현)가 들어 있는지를 기준으로 판단한다.
- verdict: correct(핵심 모두 포함), partial(일부 포함), wrong(핵심 누락·오개념).
- 단답형/빈칸은 동의어·영문 표기·사소한 오타는 정답으로 인정한다.
- feedback: 학생에게 2~3문장으로, 잘한 점과 부족한 점을 쉬운 말로.
- missing: 빠졌거나 틀린 핵심 키워드/내용 목록(없으면 빈 배열).`;

export function gradeUser(q: Question, answer: string) {
  return `[유형] ${QTYPE_LABEL[q.type]}
[문제] ${q.question}
[모범답안] ${q.modelAnswer || q.answer}
[필수 키워드] ${q.requiredKeywords.join(", ") || "(없음)"}
[학생 답안] ${answer}`;
}
