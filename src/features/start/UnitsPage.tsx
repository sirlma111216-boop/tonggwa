import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { loadManifest } from '../../content/loader';
import type { Manifest, StageKey } from '../../content/types';
import { unitStageStatus, unitSummary, useProgress } from '../../services/progress/store';

export function UnitsPage() {
  const { semester } = useParams();
  const state = useProgress();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  useEffect(() => {
    loadManifest().then(setManifest);
  }, []);
  const semId = Number(semester);
  if (semId !== 1 && semId !== 2) return <Navigate to="/start/semester" replace />;
  if (!manifest) return <div className="center-msg">단원 목록을 불러오는 중이에요…</div>;
  const sem = manifest.semesters.find((s) => s.id === semId)!;
  const stageKeys = manifest.stageOrder.map((s) => s.key);

  let counter = 0;
  return (
    <div className="page page-narrow">
      <p className="crumbs"><Link to="/">시작</Link> › <Link to="/start/semester">학기 선택</Link> › {sem.title}</p>
      <h1>{sem.title}</h1>
      <p className="muted">단원을 고르면 바로 학습이 시작돼요. 이미 시작한 단원은 멈춘 단계부터 이어져요.</p>
      {sem.chapters.map((c) => (
        <section key={c.id} style={{ marginTop: 26 }}>
          <h2 style={{ fontSize: 20 }}>
            {c.title}
            {c.extra && <span className="badge" style={{ marginLeft: 10 }}>보충 묶음 · 운동량과 충격량 도판 풀이</span>}
          </h2>
          <ul className="unit-list">
            {c.units.map((u) => {
              counter += 1;
              const up = state?.units[u.id];
              const sum = unitSummary(up, stageKeys);
              // 이어서 할 단계: 첫 미완료 단계
              const resume: StageKey = stageKeys.find((k) => unitStageStatus(up, k) !== 'done') ?? stageKeys[0];
              return (
                <li key={u.id}>
                  <Link to={`/learn/${u.id}/${resume}`} className="unit-row">
                    <span className="num">{String(counter).padStart(2, '0')}</span>
                    <span>
                      <div className="title">{u.title}</div>
                      <div className="goal">{u.goal}</div>
                    </span>
                    <span className="small muted">{u.code} · 문항 {u.questionCount}</span>
                    <span className={`badge ${sum.status === 'done' ? 'badge-done' : sum.status === 'in_progress' ? 'badge-progress' : ''}`}>
                      {sum.status === 'done' ? '완료' : sum.status === 'in_progress' ? `진행 중 ${sum.done}/${sum.total}` : '미학습'}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
