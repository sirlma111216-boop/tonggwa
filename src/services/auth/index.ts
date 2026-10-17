import { useEffect, useState } from 'react';
import { createLocalAuth } from './local';
import type { AuthService, AuthUser } from './types';

// 현재 공급자: local (검토용). Firebase 연결 후 'firebase'로 전환한다.
const PROVIDER: 'local' | 'firebase' = 'local';

export const auth: AuthService = PROVIDER === 'local' ? createLocalAuth() : createLocalAuth();

export function useAuthUser(): AuthUser | null {
  const [user, setUser] = useState<AuthUser | null>(() => auth.getCurrent());
  useEffect(() => auth.subscribe(setUser), []);
  return user;
}

export type { AuthUser } from './types';
