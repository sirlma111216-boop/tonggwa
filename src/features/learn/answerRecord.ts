import type { Question, Stage, Unit } from '../../content/types';
import type { AnswerRecord } from '../../services/progress/types';

/** Keep older responses stored, but do not use a written answer to lock a revised choice question. */
export function currentAnswerRecord(question: Question | undefined, record?: AnswerRecord): AnswerRecord | undefined {
  if (!question || !record) return undefined;
  if (question.kind === 'choice') {
    return typeof record.value === 'number' && Number.isInteger(record.value)
      && record.value >= 0 && record.value < (question.choices?.length ?? 0)
      && typeof record.correct === 'boolean' ? record : undefined;
  }
  return typeof record.value === 'string' && record.value.trim().length > 0
    && record.correct === null ? record : undefined;
}

/** A changed question must be answered in its current format before its check stage is complete. */
export function firstUnansweredQuestionStep(unit: Unit, stage: Stage, records?: Record<string, AnswerRecord>): number {
  return stage.steps.findIndex(step => step.type === 'question'
    && !currentAnswerRecord(unit.questions[step.id], records?.[step.id]));
}
