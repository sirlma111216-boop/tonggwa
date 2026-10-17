// 임시 로컬 로그인. Firebase Authentication을 붙이기 전까지 검토용으로만 쓴다.
// 비밀번호는 SHA-256 해시로만 저장한다. 정적 사이트이므로 이 방식은 접근 통제가 아니라 검토용 문 역할이다.
import accounts from './accounts.json';
import type { AuthService, AuthUser } from './types';

const SESSION_KEY = 'tonggwa.session.v1';

interface LocalAccount {
  uid: string;
  displayName: string;
  emails: string[];
  passwordSha256: string;
}

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function readSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw) as AuthUser;
    return u && u.uid ? u : null;
  } catch {
    return null;
  }
}

export function createLocalAuth(): AuthService {
  let current = readSession();
  const listeners = new Set<(u: AuthUser | null) => void>();
  const emit = () => listeners.forEach((l) => l(current));
  return {
    getCurrent: () => current,
    async signIn(email, password) {
      const norm = email.trim().toLowerCase();
      const acc = (accounts as LocalAccount[]).find((a) => a.emails.map((e) => e.toLowerCase()).includes(norm));
      const hash = await sha256Hex(password);
      if (!acc || acc.passwordSha256 !== hash) throw new Error('아이디 또는 비밀번호가 맞지 않아요.');
      current = { uid: acc.uid, email: norm, displayName: acc.displayName, provider: 'local' };
      localStorage.setItem(SESSION_KEY, JSON.stringify(current));
      emit();
      return current;
    },
    async signOut() {
      current = null;
      localStorage.removeItem(SESSION_KEY);
      emit();
    },
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
