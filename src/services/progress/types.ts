import type { StageKey } from '../../content/types';

export type StageStatus = 'not_started' | 'in_progress' | 'done';

export interface AnswerRecord {
  /** 선택형은 선지 번호(0부터), 서술형은 학생이 쓴 글 */
  value: number | string;
  submittedAt: string;
  /** 선택형 자동 채점 결과. 서술형은 null */
  correct: boolean | null;
  /** 서술형 자기 점검 */
  selfMark?: 'ok' | 'partial' | 'no';
}

export interface UnitProgress {
  /** step: 마지막으로 보던 화면 번호(0부터) */
  stages: Partial<Record<StageKey, { status: StageStatus; step?: number; updatedAt: string }>>;
  answers: Record<string, AnswerRecord>;
  /** 카드 활동 결과. key = stageKey/stepIndex/activityIndex */
  activities?: Record<string, ActivityRecord>;
  activityDrafts?: Record<string, unknown>;
  notebookChecks?: Record<string, NotebookCheck>;
  transferAnswers?: Record<string, TransferAnswer>;
  note?: string;
  noteUpdatedAt?: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ActivityRecord {
  done: boolean;
  correct?: boolean;
  firstCorrect?: boolean;
  attempts?: number;
  points?: number;
  at: string;
}

export interface NotebookCheck {
  writtenAt?: string;
  mark?: 'matched' | 'corrected' | 'revisit';
  checkedAt?: string;
}

export interface TransferAnswer {
  value: number;
  correct: boolean;
  submittedAt: string;
  /** 설명을 본 뒤 재응답하더라도 최초 독립 응답은 보존한다. */
  firstCorrect: boolean;
  attempts: number;
}

export interface LastPosition {
  unitId: string;
  stageKey: StageKey;
  step?: number;
  semester: 1 | 2;
  at: string;
}

export interface ProgressState {
  version: 1;
  uid: string;
  lastPosition?: LastPosition;
  units: Record<string, UnitProgress>;
  exams: Record<string, AnswerRecord>;
  updatedAt: string;
}

export interface ProgressBackend {
  load(uid: string): Promise<ProgressState | null>;
  save(state: ProgressState): Promise<void>;
  readonly label: string;
}
