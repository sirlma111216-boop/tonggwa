// Firestore 저장 어댑터 자리. 연결 시 docs/spec/02 의 데이터 모델(uid 기준, 학생이 정답·숙련도를 직접 쓰지 못함)을 따른다.
// 서버 채점·통과 판정·복습 일정은 Firebase Functions 로 옮기고, 이 어댑터는 학생 기록의 읽기/쓰기 큐만 맡는다.
import type { ProgressBackend } from './types';

export function createFirestoreBackend(): ProgressBackend {
  throw new Error('Firestore 저장은 아직 연결되지 않았어요. services/progress/firestoreBackend.ts 를 구현하세요.');
}
