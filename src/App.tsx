import { useEffect, useState } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { LoginPage } from './features/account/LoginPage';
import { ExamPage, ExamsPage } from './features/exams/ExamsPage';
import { LearnPage } from './features/learn/LearnPage';
import { WorkbookPage } from './features/learn/WorkbookPage';
import { RecordPage } from './features/record/RecordPage';
import { SemesterPage } from './features/start/SemesterPage';
import { StartPage } from './features/start/StartPage';
import { UnitsPage } from './features/start/UnitsPage';
import { useAuthUser } from './services/auth';
import { progress } from './services/progress/store';

function RequireAuth() {
  const user = useAuthUser();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    if (!user) {
      progress.close();
      setReady(false);
      return;
    }
    setReady(false);
    progress.open(user.uid).then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [user]);
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!ready) return <div className="center-msg">학습 기록을 불러오는 중이에요…</div>;
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<StartPage />} />
          <Route path="/start/semester" element={<SemesterPage />} />
          <Route path="/start/units/:semester" element={<UnitsPage />} />
          <Route path="/learn/:unitId" element={<LearnPage />} />
          <Route path="/workbook/:unitId" element={<WorkbookPage />} />
          <Route path="/learn/:unitId/:stageKey" element={<LearnPage />} />
          <Route path="/exams" element={<ExamsPage />} />
          <Route path="/exams/:kiceId" element={<ExamPage />} />
          <Route path="/record" element={<RecordPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
