import type { ActivityRecord, TransferAnswer } from './types';

/** 도전 5점 + 해결 5점. 재시도는 학습이지만 점수를 반복 지급하지 않는다. */
export function nextActivityRecord(previous: ActivityRecord | undefined, result: { done: boolean; correct?: boolean }, at: string): ActivityRecord {
  const firstCorrect = previous?.firstCorrect ?? previous?.correct ?? result.correct;
  const earned = result.done ? (result.correct === true ? 10 : 5) : 0;
  return {
    ...result,
    firstCorrect,
    attempts: (previous?.attempts ?? (previous?.done ? 1 : 0)) + 1,
    points: Math.max(previous?.points ?? 0, earned),
    at,
  };
}

export function nextTransferAnswer(previous: TransferAnswer | undefined, value: number, correct: boolean, at: string): TransferAnswer {
  return { value, correct, submittedAt: at, firstCorrect: previous?.firstCorrect ?? correct, attempts: (previous?.attempts ?? 0) + 1 };
}
