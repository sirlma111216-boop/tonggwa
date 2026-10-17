import type { ProgressBackend, ProgressState } from './types';

const key = (uid: string) => `tonggwa.progress.v1.${uid}`;

/** 이 기기의 localStorage 에 저장한다. Firestore 어댑터로 교체될 때까지의 기본 저장소. */
export const localBackend: ProgressBackend = {
  label: '이 기기에 저장됨',
  async load(uid) {
    try {
      const raw = localStorage.getItem(key(uid));
      return raw ? (JSON.parse(raw) as ProgressState) : null;
    } catch {
      return null;
    }
  },
  async save(state) {
    localStorage.setItem(key(state.uid), JSON.stringify(state));
  },
};
