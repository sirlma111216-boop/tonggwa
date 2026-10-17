import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadManifest, orderedUnits } from '../../content/loader';
import type { Manifest } from '../../content/types';
import { unitSummary, useProgress } from '../../services/progress/store';

export function RecordPage() {
  const state = useProgress();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  useEffect(() => {
    loadManifest().then(setManifest);
  }, []);
  if (!manifest || !state) return <div className="center-msg">기록을 불러오는 중이에요…</div>;
  const keys = manifest.stageOrder.map((s) => s.key);
  const units = orderedUnits(manifest);
  const started = units.filter((u) => state.units[u.id]);
  const examCount = Object.keys(state.exams).length;
  const examCorrect = Object.values(state.exams).filter((r) => r.correct).length;

  return (
    <div className="page page-narrow">
      <p className="crumbs"><Link to="/">시작</Link> › 내 학습 기록</p>
      <h1>내 학습 기록</h1>
      <p className="muted small">
        기록은 현재 {state.uid} 계정으로 이 기기에 저장돼요. Firebase 연결 후에는 다른 기기에서도 같은 기록을 이어 가요. 수치는 실제 제출 결과만 집계해요.
      </p>
      {started.length === 0 ? (
        <div className="card">아직 시작한 단원이 없어요. <Link to="/start/semester">처음으로 학습하기</Link>에서 단원을 골라 보세요.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>단원</th>
              <th>단계</th>
              <th>선택형</th>
              <th>서술형 점검</th>
              <th>최근 활동</th>
            </tr>
          </thead>
          <tbody>
            {started.map((u) => {
              const up = state.units[u.id];
              const sum = unitSummary(up, keys);
              const recs = Object.values(up.answers);
              const choice = recs.filter((r) => r.correct !== null);
              const choiceOk = choice.filter((r) => r.correct).length;
              const shorts = recs.filter((r) => r.correct === null);
              const shortOk = shorts.filter((r) => r.selfMark === 'ok').length;
              return (
                <tr key={u.id}>
                  <td>
                    <Link to={`/learn/${u.id}`}>{u.title}</Link>
                    <div className="small muted">{u.semester}학기 · {u.chapterTitle}</div>
                  </td>
                  <td>
                    <div className="row">
                      <span className="bar"><i style={{ width: `${(sum.done / sum.total) * 100}%` }} /></span>
                      <span className="small">{sum.done}/{sum.total}</span>
                    </div>
                  </td>
                  <td>{choice.length ? `${choiceOk}/${choice.length}` : '-'}</td>
                  <td>{shorts.length ? `${shortOk}/${shorts.length}` : '-'}</td>
                  <td className="small muted">{new Date(up.updatedAt).toLocaleString('ko-KR')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <section className="card" style={{ marginTop: 18 }}>
        <h3>평가원 공식 예시</h3>
        <p className="muted" style={{ margin: 0 }}>{examCount ? `${examCount}문항 제출 · ${examCorrect}문항 정답` : '아직 제출한 문항이 없어요.'} <Link to="/exams">문항 목록</Link></p>
      </section>
    </div>
  );
}
