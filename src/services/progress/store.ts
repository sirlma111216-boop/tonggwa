import { useEffect, useState } from 'react';
import type { StageKey } from '../../content/types';
import { localBackend } from './localBackend';
import type { AnswerRecord, LastPosition, NotebookCheck, ProgressBackend, ProgressState, StageStatus, UnitProgress } from './types';
import { nextActivityRecord, nextTransferAnswer } from './evidence';

const backend: ProgressBackend = localBackend;

type Listener = (s: ProgressState | null) => void;

class ProgressStore {
  private state: ProgressState | null = null;
  private listeners = new Set<Listener>();
  private saveTimer: number | null = null;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';

  get current() {
    return this.state;
  }

  async open(uid: string) {
    if (this.state?.uid === uid) return this.state;
    const loaded = await backend.load(uid);
    this.state = loaded ?? { version: 1, uid, units: {}, exams: {}, updatedAt: new Date().toISOString() };
    this.emit();
    return this.state;
  }

  close() {
    this.state = null;
    this.emit();
  }

  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => void this.listeners.delete(l);
  }

  private emit() {
    this.listeners.forEach((l) => l(this.state));
  }

  private mutate(fn: (s: ProgressState) => void) {
    if (!this.state) return;
    const next: ProgressState = JSON.parse(JSON.stringify(this.state));
    fn(next);
    next.updatedAt = new Date().toISOString();
    this.state = next;
    this.emit();
    this.scheduleSave();
  }

  private scheduleSave() {
    if (this.saveTimer) window.clearTimeout(this.saveTimer);
    this.saveStatus = 'saving';
    this.saveTimer = window.setTimeout(async () => {
      try {
        if (this.state) await backend.save(this.state);
        this.saveStatus = 'saved';
      } catch {
        this.saveStatus = 'error';
      }
      this.emit();
    }, 250);
  }

  unit(unitId: string): UnitProgress | undefined {
    return this.state?.units[unitId];
  }

  private ensureUnit(s: ProgressState, unitId: string): UnitProgress {
    const now = new Date().toISOString();
    if (!s.units[unitId]) s.units[unitId] = { stages: {}, answers: {}, startedAt: now, updatedAt: now };
    s.units[unitId].updatedAt = now;
    return s.units[unitId];
  }

  setPosition(pos: Omit<LastPosition, 'at'>) {
    this.mutate((s) => {
      const at = new Date().toISOString();
      s.lastPosition = { ...pos, at };
      const u = this.ensureUnit(s, pos.unitId);
      const st = u.stages[pos.stageKey];
      if (!st || st.status === 'not_started') u.stages[pos.stageKey] = { status: 'in_progress', step: pos.step ?? 0, updatedAt: at };
      else if (st.status !== 'done') u.stages[pos.stageKey] = { ...st, step: pos.step ?? st.step, updatedAt: at };
      else u.stages[pos.stageKey] = { ...st, step: pos.step ?? st.step };
    });
  }

  setStageStatus(unitId: string, stageKey: StageKey, status: StageStatus, allStages: StageKey[]) {
    this.mutate((s) => {
      const u = this.ensureUnit(s, unitId);
      u.stages[stageKey] = { ...u.stages[stageKey], status, updatedAt: new Date().toISOString() };
      const allDone = allStages.every((k) => u.stages[k]?.status === 'done');
      if (allDone && !u.completedAt) u.completedAt = new Date().toISOString();
    });
  }

  recordAnswers(unitId: string, records: Record<string, AnswerRecord>) {
    this.mutate((s) => {
      const u = this.ensureUnit(s, unitId);
      Object.assign(u.answers, records);
    });
  }

  setSelfMark(unitId: string, questionId: string, mark: AnswerRecord['selfMark']) {
    this.mutate((s) => {
      const u = this.ensureUnit(s, unitId);
      if (u.answers[questionId]) u.answers[questionId].selfMark = mark;
    });
  }

  recordActivity(unitId: string, key: string, result: { done: boolean; correct?: boolean }) {
    this.mutate((s) => {
      const u = this.ensureUnit(s, unitId);
      u.activities ??= {};
      u.activities[key] = nextActivityRecord(u.activities[key], result, new Date().toISOString());
    });
  }

  saveActivityDraft(unitId: string, key: string, draft: unknown) {
    this.mutate((s) => {
      const u = this.ensureUnit(s, unitId);
      u.activityDrafts ??= {};
      u.activityDrafts[key] = draft;
    });
  }

  checkNotebook(unitId: string, sheetId: string, check: NotebookCheck) {
    this.mutate((s) => {
      const u = this.ensureUnit(s, unitId);
      u.notebookChecks ??= {};
      u.notebookChecks[sheetId] = { ...u.notebookChecks[sheetId], ...check };
    });
  }

  recordTransfer(unitId: string, questionId: string, value: number, correct: boolean) {
    this.mutate((s) => {
      const u = this.ensureUnit(s, unitId);
      u.transferAnswers ??= {};
      u.transferAnswers[questionId] = nextTransferAnswer(u.transferAnswers[questionId], value, correct, new Date().toISOString());
    });
  }

  appendNote(unitId: string, line: string) {
    this.mutate((s) => {
      const u = this.ensureUnit(s, unitId);
      u.note = (u.note ? u.note.trimEnd() + '\n' : '') + line;
      u.noteUpdatedAt = new Date().toISOString();
    });
  }

  setNote(unitId: string, note: string) {
    this.mutate((s) => {
      const u = this.ensureUnit(s, unitId);
      u.note = note;
      u.noteUpdatedAt = new Date().toISOString();
    });
  }

  recordExam(kiceId: string, rec: AnswerRecord) {
    this.mutate((s) => {
      s.exams[kiceId] = rec;
    });
  }

  get backendLabel() {
    return backend.label;
  }
}

export const progress = new ProgressStore();

export function useProgress(): ProgressState | null {
  const [s, setS] = useState<ProgressState | null>(progress.current);
  useEffect(() => progress.subscribe(setS), []);
  return s;
}

export function unitStageStatus(u: UnitProgress | undefined, key: StageKey): StageStatus {
  return u?.stages[key]?.status ?? 'not_started';
}

export function unitSummary(u: UnitProgress | undefined, stageKeys: StageKey[]) {
  const done = stageKeys.filter((k) => unitStageStatus(u, k) === 'done').length;
  const status: StageStatus = done === stageKeys.length ? 'done' : u && Object.keys(u.stages).length ? 'in_progress' : 'not_started';
  return { done, total: stageKeys.length, status };
}
