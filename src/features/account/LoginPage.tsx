import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { auth, useAuthUser } from '../../services/auth';

export function LoginPage() {
  const user = useAuthUser();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={location.state?.from ?? '/'} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await auth.signIn(email, password);
      navigate(location.state?.from ?? '/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인하지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="card login-card stack" onSubmit={onSubmit}>
        <div>
          <div className="brand" style={{ marginBottom: 14 }}>
            <span className="brand-mark">통</span>통합과학 학습실
          </div>
          <h1>학생 로그인</h1>
          <p className="muted small" style={{ margin: 0 }}>
            고등학교 1학년 통합과학을 선개념부터 수능대비까지 순서대로 학습해요.
          </p>
        </div>
        <div>
          <label className="field" htmlFor="email">아이디(이메일)</label>
          <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="field" htmlFor="pw">비밀번호</label>
          <input id="pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <div className="notice notice-bad" role="alert">{error}</div>}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
          {busy ? '확인 중…' : '로그인'}
        </button>
        <p className="muted small" style={{ margin: 0 }}>
          지금은 검토용 로컬 계정으로 들어가요. Firebase 회원가입(Google·Microsoft·Apple·네이버·이메일)은 다음 단계에서 연결돼요.
        </p>
      </form>
    </div>
  );
}
