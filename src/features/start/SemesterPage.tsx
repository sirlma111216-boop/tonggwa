import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadManifest } from '../../content/loader';
import type { Manifest } from '../../content/types';

export function SemesterPage() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  useEffect(() => {
    loadManifest().then(setManifest);
  }, []);
  if (!manifest) return <div className="center-msg">학습 지도를 불러오는 중이에요…</div>;

  return (
    <div className="page page-narrow">
      <p className="crumbs"><Link to="/">시작</Link> › 학기 선택</p>
      <h1>어느 학기를 공부할까요?</h1>
      <p className="muted">학기를 고른 뒤 단원을 선택하면 그 단원의 선개념 단계로 바로 들어가요.</p>
      <div className="choice-cards" style={{ marginTop: 20 }}>
        {manifest.semesters.map((s) => (
          <Link key={s.id} to={`/start/units/${s.id}`} className="choice-card">
            <h2>{s.title}</h2>
            <p className="muted" style={{ margin: 0 }}>
              {s.chapters.filter((c) => !c.extra).length}개 영역 · {s.chapters.reduce((n, c) => n + c.units.length, 0)}개 학습 묶음
            </p>
            <ul>
              {s.chapters.map((c) => (
                <li key={c.id}>
                  {c.title.replace(/^통합과학\d\s*[—·]\s*/, '')}
                  {c.extra ? ' (풀이 전략 보충)' : ''} · {c.units.length}개
                </li>
              ))}
            </ul>
          </Link>
        ))}
      </div>
    </div>
  );
}
