import type { AnswerSet, KiceIndex, KiceSolution, Manifest, Unit } from './types';

const cache = new Map<string, Promise<unknown>>();

async function getJson<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(path, { cache: 'no-cache' }).then((r) => {
        if (!r.ok) throw new Error(`콘텐츠를 불러오지 못했어요 (${r.status}): ${path}`);
        return r.json();
      }),
    );
  }
  return cache.get(path) as Promise<T>;
}

export const loadManifest = () => getJson<Manifest>('/content/manifest.json');
export const loadUnit = (unitId: string) => getJson<Unit>(`/content/units/${encodeURIComponent(unitId)}.json`);
// 정답·해설은 학생이 제출한 뒤에만 요청한다. 서버 채점(Firebase Functions)으로 옮기기 전까지의 임시 경계.
export const loadAnswers = (unitId: string) => getJson<AnswerSet>(`/content/answers/${encodeURIComponent(unitId)}.json`);
export const loadKice = () => getJson<KiceIndex>('/content/exams/kice.json');
export const loadKiceSolutions = () => getJson<Record<string, KiceSolution>>('/content/exams/kice-solutions.json');

export function findUnitInManifest(m: Manifest, unitId: string) {
  for (const s of m.semesters) for (const c of s.chapters) for (const u of c.units) if (u.id === unitId) return { semester: s, chapter: c, unit: u };
  return null;
}

/** 학습 순서대로 평탄화한 단원 목록 (1학기 → 2학기). */
export function orderedUnits(m: Manifest) {
  const out: { semester: 1 | 2; chapterId: string; chapterTitle: string; id: string; title: string; code: string; extra: boolean }[] = [];
  for (const s of m.semesters) for (const c of s.chapters) for (const u of c.units) out.push({ semester: s.id, chapterId: c.id, chapterTitle: c.title, id: u.id, title: u.title, code: u.code, extra: u.extra });
  return out;
}
