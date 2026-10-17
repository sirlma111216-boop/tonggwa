// Firebase Authentication 어댑터 자리.
// 연결 시 할 일 (docs/외부설정_체크리스트.md 참고):
//  1. npm i firebase
//  2. .env 에 VITE_FIREBASE_* 값을 넣는다 (비밀키 아님, 공개 설정).
//  3. 아래 createFirebaseAuth 를 구현하고 services/auth/index.ts 에서 provider 를 'firebase'로 바꾼다.
//  4. Google·Microsoft·Apple·네이버(custom token)·이메일 가입은 docs/spec/02 명세의 표를 따른다.
import type { AuthService } from './types';

export function createFirebaseAuth(): AuthService {
  throw new Error('Firebase 인증은 아직 연결되지 않았어요. services/auth/firebase.ts 를 구현하세요.');
}
