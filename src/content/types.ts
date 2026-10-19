export type StageKey =
  | 'prerequisite'
  | 'concept'
  | 'concept_check'
  | 'advanced'
  | 'advanced_check'
  | 'strategy'
  | 'exam_check';

export type StageKind = 'read' | 'check';

export interface StageMeta {
  key: StageKey;
  label: string;
  kind: StageKind;
}

export interface ManifestUnit {
  id: string;
  code: string;
  /** 영역 안에서의 소단원 번호 (보충 묶음은 null) */
  no: number | null;
  title: string;
  goal: string;
  questionCount: number;
  extra: boolean;
  stageCount: number;
}

export interface ManifestChapter {
  id: string;
  title: string;
  semester: 1 | 2;
  extra: boolean;
  intro: string;
  units: ManifestUnit[];
}

export interface ManifestSemester {
  id: 1 | 2;
  title: string;
  chapters: ManifestChapter[];
}

export interface Manifest {
  contentVersion: string;
  sourceDate: string;
  generatedAt: string;
  stageOrder: StageMeta[];
  semesters: ManifestSemester[];
  stats: { standards: number; units: number; questions: number; kiceQuestions: number; images: number };
}

export interface Activity {
  widget: string;
  title: string;
  intro?: string;
  auto?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any;
}

/** 한 화면에 해당하는 학습 단위 */
export type Step =
  | { type: 'concept'; title: string; md: string; part?: number; parts?: number; activities?: Activity[] }
  | { type: 'remediation'; title: string; md: string; part?: number; parts?: number; activities?: Activity[] }
  | { type: 'question'; id: string };

export interface GlossaryEntry {
  term: string;
  definition?: string;
  definedAt?: { stageKey: StageKey; step: number; title: string };
  mentions: { stageKey: StageKey; step: number; title: string; sentence: string }[];
}

export interface Stage extends StageMeta {
  steps: Step[];
  questionIds: string[];
}

export interface Question {
  id: string;
  label?: string;
  kind: 'choice' | 'short';
  prompt: string;
  choices?: string[];
}

export interface Unit {
  id: string;
  code: string;
  no: number | null;
  title: string;
  goal: string;
  chapter: { id: string; title: string };
  semester: 1 | 2;
  extra: boolean;
  sourceFile: string;
  stages: Stage[];
  questions: Record<string, Question>;
  prerequisite: { topic: string; middleUnits: string[]; summary: string; boundary: string } | null;
  glossary: Record<string, GlossaryEntry>;
  glossaryExtra: Record<string, string>;
  links: Record<string, { label: string; url: string }[]>;
  answerNotes: string;
  chapterOutro?: string;
}

export interface Answer {
  key: string;
  explanation: string;
  choiceIndex?: number;
}

export type AnswerSet = Record<string, Answer>;

export interface KiceItem {
  id: string;
  year: number;
  number: number;
  image: string | null;
  pdfPage: number | null;
  sharedPage: boolean;
  topic: string;
  title: string;
}

export interface KiceIndex {
  intro: string;
  items: KiceItem[];
}

export interface KiceSolution {
  key: string;
  choiceIndex: number;
  startMd: string;
  md: string;
}
