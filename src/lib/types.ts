// 앱 전체에서 쓰는 데이터 구조

export type QType = "mcq" | "ox" | "short" | "fill" | "brief" | "essay";

export const QTYPES: QType[] = ["mcq", "ox", "short", "fill", "brief", "essay"];

export const QTYPE_LABEL: Record<QType, string> = {
  mcq: "객관식",
  ox: "OX",
  short: "단답형",
  fill: "빈칸 채우기",
  brief: "약술형",
  essay: "서술형",
};

export type Difficulty = "easy" | "normal" | "hard";
export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "쉬움",
  normal: "보통",
  hard: "어려움",
};

export type Goal = "minimum" | "standard" | "high";
export const GOAL_LABEL: Record<Goal, string> = {
  minimum: "최소 암기",
  standard: "일반 학습",
  high: "고득점 대비",
};
export const GOAL_DESC: Record<Goal, string> = {
  minimum: "시험에 필요한 핵심만",
  standard: "주요 개념을 충분히",
  high: "세부 내용까지",
};

export interface ExamSettings {
  types: QType[];
  /** 유형별 비중(%) — 비어 있으면 균등 */
  weights: Partial<Record<QType, number>>;
  difficulty: Difficulty;
  goal: Goal;
  emphasis: string;
  scope: string;
  examDate: string;
  pastExam: string;
}

/** 원본 자료의 한 페이지(또는 슬라이드) */
export interface SourcePage {
  label: string; // 예: "p.3", "슬라이드 5"
  text: string;
}

export interface Material {
  id: string;
  lecture: string; // 강의 구분 이름
  fileName: string;
  pages: SourcePage[];
  warnings: string[];
}

export interface Concept {
  id: string;
  title: string;
  tier: "essential" | "optional";
  summary: string;
  definition: string;
  keywords: string[];
  flashcards: { front: string; back: string }[];
  /** 핵심 키워드를 [[ ]]로 감싼 문장 */
  cloze: string;
  briefAnswer: string;
  essayOutline: string[];
  confusions: { other: string; difference: string }[];
  source: { lecture: string; location: string };
  emphasized: boolean;
}

export interface Strategy {
  overview: string;
  focus: string[];
  methods: string[];
}

export interface Question {
  id: string;
  type: QType;
  conceptId: string;
  question: string;
  choices: string[];
  answer: string;
  explanation: string;
  keyPoint: string;
  requiredKeywords: string[];
  modelAnswer: string;
}

export type Verdict = "correct" | "partial" | "wrong";
export const VERDICT_LABEL: Record<Verdict, string> = {
  correct: "정답",
  partial: "부분 정답",
  wrong: "오답",
};

export interface Attempt {
  id: string;
  at: number;
  question: Question;
  userAnswer: string;
  verdict: Verdict;
  feedback: string;
  missing: string[];
}

export type Status = "unlearned" | "review" | "mastered";
export const STATUS_LABEL: Record<Status, string> = {
  unlearned: "미암기",
  review: "복습 필요",
  mastered: "암기 완료",
};

export type SelfRating = "know" | "unsure" | "dontknow";

export interface ConceptProgress {
  status: Status;
  streak: number; // 연속 정답 수
  correct: number;
  wrong: number;
  selfRating?: SelfRating;
  lastAt: number;
}

export interface StudySet {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  settings: ExamSettings;
  materials: Material[];
  strategy: Strategy | null;
  concepts: Concept[];
  progress: Record<string, ConceptProgress>;
  attempts: Attempt[];
  /** AI 분석 진행 상태 (구간 단위로 나눠 처리) */
  chunksDone: number;
  chunksTotal: number;
  /** AI가 알려준 자료 관련 주의사항 */
  notes: string[];
}
