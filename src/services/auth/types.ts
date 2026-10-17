export interface AuthUser {
  /** 학습 기록의 영구 키. Firebase 연결 후에는 Firebase uid를 그대로 쓴다. */
  uid: string;
  email: string;
  displayName: string;
  provider: 'local' | 'firebase';
}

export interface AuthService {
  getCurrent(): AuthUser | null;
  signIn(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  subscribe(listener: (user: AuthUser | null) => void): () => void;
}
