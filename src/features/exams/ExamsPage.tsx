import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadKice, loadKiceSolutions } from '../../content/loader';
import type { KiceIndex, KiceSolution } from '../../content/types';
import { progress, useProgress } from '../../services/progress/store';
import { Markdown } from '../learn/Markdown';

const CIRCLED = ['①', '②', '③', '④', '⑤'];

export function ExamsPage() {
  const [kice, setKice] = useState<KiceIndex | null>(null);
  const state = useProgress();
  useEffect(() => {
    loadKice().then(setKice);
  }, []);
  if (!kice) return <div className="center-msg">문항 목록을 불러오는 중이에요…</div>;
  const years = [...new Set(kice.items.map((i) => i.year))];
  return (
    <div className="page page-narrow">
      <p className="crumbs"><Link to="/">시작</Link> › 평가원 공식 예시</p>
      <h1>평가원 공식 예시 37문항</h1>
      <div className="card">
        <Markdown md={kice.intro.split('\n\n').slice(0, 2).join('\n\n')} />
        <p className="small muted" style={{ margin: 0 }}>
          2028학년도 수능 체제의 공식 예시이며 실제 수능 본시험 기출이 아니에요. 원문 페이지를 먼저 풀고 제출한 뒤에 공식 정답과 단계별 풀이가 열려요.
        </p>
      </div>
      {years.map((y) => (
        <section key={y} style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 20 }}>{y}년 공개 예시 · {kice.items.filter((i) => i.year === y).length}문항</h2>
          <div className="exam-grid">
            {kice.items
              .filter((i) => i.year === y)
              .map((it) => {
                const rec = state?.exams[it.id];
                return (
                  <Link key={it.id} to={`/exams/${it.id}`} className="exam-tile">
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <span className="small muted">{it.id}</span>
                      {rec && <span className={`badge ${rec.correct ? 'badge-done' : 'badge-bad'}`}>{rec.correct ? '정답' : '오답'}</span>}
                    </div>
                    <div className="t">{it.title}</div>
                    <div className="small muted">{it.topic}</div>
                  </Link>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function ExamPage() {
  const { kiceId = '' } = useParams();
  const [kice, setKice] = useState<KiceIndex | null>(null);
  const [sol, setSol] = useState<KiceSolution | null>(null);
  const [choice, setChoice] = useState<number | null>(null);
  const state = useProgress();
  const rec = state?.exams[kiceId];
  useEffect(() => {
    loadKice().then(setKice);
  }, []);
  useEffect(() => {
    if (rec) loadKiceSolutions().then((s) => setSol(s[kiceId] ?? null));
    else setSol(null);
  }, [rec, kiceId]);
  if (!kice) return <div className="center-msg">문항을 불러오는 중이에요…</div>;
  const it = kice.items.find((i) => i.id === kiceId);
  if (!it) return <div className="page"><div className="notice notice-bad">문항을 찾지 못했어요: {kiceId}</div></div>;
  const idx = kice.items.indexOf(it);
  const prev = idx > 0 ? kice.items[idx - 1] : null;
  const next = idx + 1 < kice.items.length ? kice.items[idx + 1] : null;

  async function submit() {
    if (choice === null || !it) return;
    const s = await loadKiceSolutions();
    const a = s[it.id];
    progress.recordExam(it.id, { value: choice, submittedAt: new Date().toISOString(), correct: choice === a.choiceIndex });
  }

  return (
    <div className="page">
      <p className="crumbs"><Link to="/">시작</Link> › <Link to="/exams">평가원 공식 예시</Link> › {it.id}</p>
      <h1 style={{ fontSize: 24 }}>{it.year}년 공개 예시 {it.number}번 · {it.title}</h1>
      <p className="muted">{it.topic}{it.pdfPage ? ` · 원본 PDF ${it.pdfPage}쪽` : ''}</p>
      <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 3fr) minmax(320px, 2fr)', alignItems: 'start' }}>
        <div className="card">
          {it.sharedPage && (
            <div className="notice notice-warn" style={{ marginBottom: 12 }}>
              이 페이지 이미지에는 여러 문항이 있어요. <strong>{it.number}번</strong> 문항을 찾아 푸세요.
            </div>
          )}
          {it.image && (
            <a href={it.image} target="_blank" rel="noreferrer" title="새 탭에서 크게 보기">
              <img className="exam-img" src={it.image} alt={`${it.id} 원문 페이지`} />
            </a>
          )}
          <p className="small muted" style={{ marginTop: 8 }}>평가원 공식 예시 원문 페이지 이미지 · 원문 그대로 보존 · 이미지를 누르면 크게 열려요</p>
        </div>
        <div className="card stack">
          {!rec ? (
            <>
              <h3>답 고르기</h3>
              <ul className="choices">
                {CIRCLED.map((c, i) => (
                  <li key={i}>
                    <label className={choice === i ? 'selected' : ''}>
                      <input type="radio" name="kice" checked={choice === i} onChange={() => setChoice(i)} />
                      <span><span className="circ">{c}</span></span>
                    </label>
                  </li>
                ))}
              </ul>
              <button className="btn btn-primary" disabled={choice === null} onClick={submit}>제출하고 풀이 보기</button>
              <p className="small muted" style={{ margin: 0 }}>제출 전에는 정답·해설을 보여 주지 않아요.</p>
            </>
          ) : (
            <>
              <div className={`notice ${rec.correct ? 'notice-ok' : 'notice-bad'}`}>
                내 답 {CIRCLED[rec.value as number]} · {rec.correct ? '정답이에요' : `공식 정답은 ${sol?.key ?? '…'}`}
              </div>
              {sol ? (
                <>
                  {sol.startMd && (
                    <div>
                      <h3>공식 정답과 풀이 출발점</h3>
                      <Markdown md={sol.startMd} />
                    </div>
                  )}
                  <div>
                    <h3>문항별 심층 풀이</h3>
                    <Markdown md={sol.md} />
                  </div>
                </>
              ) : (
                <p className="muted">풀이를 불러오는 중이에요…</p>
              )}
            </>
          )}
          <div className="row" style={{ justifyContent: 'space-between' }}>
            {prev ? <Link className="btn" to={`/exams/${prev.id}`}>← {prev.id}</Link> : <span />}
            {next ? <Link className="btn" to={`/exams/${next.id}`}>{next.id} →</Link> : <Link className="btn" to="/exams">목록</Link>}
          </div>
        </div>
      </div>
    </div>
  );
}
