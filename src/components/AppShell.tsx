import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { auth, useAuthUser } from '../services/auth';
import { progress, useProgress } from '../services/progress/store';

export function AppShell() {
  const user = useAuthUser();
  const navigate = useNavigate();
  useProgress(); // 저장 상태 변화를 다시 그리기 위해 구독
  const status = progress.saveStatus;
  const saveText = status === 'saving' ? '저장 중…' : status === 'error' ? '저장 실패' : progress.backendLabel;

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">통</span>
          통합과학 학습실
        </Link>
        <nav className="nav" aria-label="주요 메뉴">
          <NavLink to="/" end>시작</NavLink>
          <NavLink to="/start/semester">학습 지도</NavLink>
          <NavLink to="/exams">평가원 예시</NavLink>
          <NavLink to="/record">내 학습 기록</NavLink>
        </nav>
        <div className="topbar-right">
          <span className={`save-state ${status}`} title="학습 기록 저장 상태">{saveText}</span>
          <span>{user?.displayName}</span>
          <button
            className="btn btn-text"
            onClick={async () => {
              await auth.signOut();
              navigate('/login', { replace: true });
            }}
          >
            로그아웃
          </button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
