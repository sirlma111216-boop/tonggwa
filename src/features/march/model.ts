export type Domain = '물리' | '화학' | '생명과학' | '지구과학' | '탐구';
export interface Question { id: string; exam: string; number: number; page: number; topic: string; domain: Domain; concept: string }
export interface Exam { code: string; title: string; paper: string; solution: string; total: number; selected: number }
export interface Bank { version: number; reviewedAt: string; policy: string; exams: Exam[]; questions: Question[]; audit: { id: string; exam: string; number: number; topic: string; scope: string; reason: string }[] }
export interface Solution { answer: number; hint: string; domain: Domain; title: string; idea: string; trap: string; check: string; correct: boolean; feedback: string }
export type Confidence = 'sure' | 'unsure' | 'guess';
export interface Response { choice: number; confidence: Confidence; at: string; correct?: boolean; checkAnswer?: boolean }
export interface Attempt extends Response { questionId: string; sessionId: string; correct: boolean }
export interface Session { id: string; mode: 'practice' | 'assessment'; ids: string[]; index: number; responses: Record<string, Response>; done: boolean }
export interface Journal { version: 1; reserve: boolean; attempts: Attempt[]; session: Session | null }
export const emptyJournal = (): Journal => ({ version: 1, reserve: true, attempts: [], session: null });
export function latestAttempts(attempts: Attempt[]) { return Object.fromEntries(attempts.map(a => [a.questionId, a])); }
export function chooseSet(questions: Question[], journal: Journal, kind: 'new' | 'review', count = 5) {
  const latest = latestAttempts(journal.attempts);
  const pool = questions.filter(q => !(journal.reserve && q.exam === '2603')).filter(q => kind === 'new' ? !latest[q.id] : latest[q.id] && (!latest[q.id].correct || latest[q.id].confidence !== 'sure' || latest[q.id].checkAnswer === false));
  // Round-robin domains prevents long blocks of a single subject. Stable within each domain.
  const groups = (['물리', '화학', '생명과학', '지구과학', '탐구'] as Domain[]).map(d => pool.filter(q => q.domain === d));
  const result: string[] = [];
  while (result.length < count && groups.some(g => g.length)) for (const group of groups) { const q = group.shift(); if (q && result.length < count) result.push(q.id); }
  return result;
}
export function makeSession(ids: string[], mode: Session['mode']): Session {
  if (!ids.length || new Set(ids).size !== ids.length) throw new Error('빈 세트 또는 중복 문항입니다.');
  return { id: crypto.randomUUID(), ids, mode, index: 0, responses: {}, done: false };
}
export function recordGraded(journal: Journal, session: Session, answers: Record<string, Solution>): Journal {
  const additions: Attempt[] = [];
  const responses = { ...session.responses };
  for (const id of session.ids) {
    const r = responses[id];
    if (!r) continue;
    if (!answers[id] || !Number.isInteger(answers[id].answer) || answers[id].answer < 1 || answers[id].answer > 5) throw new Error('정답 자료를 확인하지 못했어요.');
    responses[id] = { ...r, correct: r.choice === answers[id].answer };
    if (!journal.attempts.some(a => a.sessionId === session.id && a.questionId === id)) additions.push({ ...responses[id], correct: responses[id].correct!, questionId: id, sessionId: session.id });
  }
  return { ...journal, session: { ...session, responses }, attempts: [...journal.attempts, ...additions] };
}
export function restoreJournal(raw: string | null, bank: Bank): Journal {
  if (!raw) return emptyJournal();
  const data = JSON.parse(raw) as Journal;
  const ids = new Set(bank.questions.map(q => q.id));
  const validResponse = (r: Response) => r && Number.isInteger(r.choice) && r.choice >= 1 && r.choice <= 5 && ['sure', 'unsure', 'guess'].includes(r.confidence) && typeof r.at === 'string';
  if (data.version !== 1 || typeof data.reserve !== 'boolean' || !Array.isArray(data.attempts) || !data.attempts.every(a => validResponse(a) && ids.has(a.questionId) && typeof a.correct === 'boolean' && typeof a.sessionId === 'string')) throw new Error('저장 기록의 형식이 맞지 않아요.');
  if (data.session) {
    const s = data.session;
    if (!['practice', 'assessment'].includes(s.mode) || typeof s.id !== 'string' || typeof s.done !== 'boolean' || !Array.isArray(s.ids) || !s.ids.length || new Set(s.ids).size !== s.ids.length || !s.ids.every(id => ids.has(id)) || !Number.isInteger(s.index) || s.index < 0 || s.index >= s.ids.length || !s.responses || !Object.entries(s.responses).every(([id,r]) => s.ids.includes(id) && validResponse(r))) throw new Error('진행 중인 세트를 복원하지 못했어요.');
  }
  return data;
}
