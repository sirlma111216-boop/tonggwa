import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { findUnitInManifest, loadAnswers, loadManifest, loadUnit, orderedUnits } from '../../content/loader';
import type { AnswerSet, Manifest, Stage, StageKey, Unit } from '../../content/types';
import { useAuthUser } from '../../services/auth';
import { progress, unitStageStatus, useProgress } from '../../services/progress/store';
import type { AnswerRecord } from '../../services/progress/types';
import { HelpPanel } from './HelpPanel';
import { Markdown } from './Markdown';
import { QuestionBlock } from './QuestionBlock';

type Draft = Record<string, number | string>;

const draftKey = (uid: string, unitId: string, stage: string) => `tonggwa.draft.${uid}.${unitId}.${stage}`;

function loadDraft(key: string): Draft {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}') as Draft;
  } catch {
    return {};
  }
}

export function LearnPage() {
  const { unitId = '', stageKey } = useParams();
  const navigate = useNavigate();
  const user = useAuthUser();
  const state = useProgress();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [answers, setAnswers] = useState<AnswerSet | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUnit(null);
    setAnswers(null);
    setError(null);
    Promise.all([loadManifest(), loadUnit(unitId)])
      .then(([m, u]) => {
        setManifest(m);
        setUnit(u);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [unitId]);

  const stage: Stage | null = useMemo(() => unit?.stages.find((s) => s.key === stageKey) ?? null, [unit, stageKey]);
  const stageKeys = useMemo(() => unit?.stages.map((s) => s.key) ?? [], [unit]);
  const up = state?.units[unitId];

  // 현재 위치 저장
  useEffect(() => {
    if (unit && stage) progress.setPosition({ unitId: unit.id, stageKey: stage.key, semester: unit.semester });
  }, [unit, stage]);

  // 제출된 평가 단계라면 정답·해설을 불러온다
  const submitted = !!(stage && stage.kind === 'check' && stage.questionIds.length > 0 && stage.questionIds.every((id) => up?.answers[id]));
  useEffect(() => {
    if (submitted && !answers) loadAnswers(unitId).then(setAnswers).catch((e) => setError(String(e)));
  }, [submitted, answers, unitId]);

  // 작성 중 답안 (기기 보관)
  const dKey = user && stage ? draftKey(user.uid, unitId, stage.key) : '';
  const [draft, setDraft] = useState<Draft>({});
  useEffect(() => {
    setDraft(dKey ? loadDraft(dKey) : {});
  }, [dKey]);
  const setDraftValue = (qid: string, v: number | string) => {
    setDraft((d) => {
      const next = { ...d, [qid]: v };
      if (dKey) localStorage.setItem(dKey, JSON.stringify(next));
      return next;
    });
  };

  if (error) return <div className="page"><div className="notice notice-bad">{error}</div></div>;
  if (!unit || !manifest) return <div className="center-msg">단원을 불러오는 중이에요…</div>;
  if (!stageKey) {
    const resume = stageKeys.find((k) => unitStageStatus(up, k) !== 'done') ?? stageKeys[0];
    return <Navigate to={`/learn/${unitId}/${resume}`} replace />;
  }
  if (stageKey === 'done') return <UnitDone unit={unit} manifest={manifest} />;
  if (!stage) return <Navigate to={`/learn/${unitId}`} replace />;

  const idx = stageKeys.indexOf(stage.key);
  const prev = idx > 0 ? stageKeys[idx - 1] : null;
  const next = idx < stageKeys.length - 1 ? stageKeys[idx + 1] : null;
  const doneCount = stageKeys.filter((k) => unitStageStatus(up, k) === 'done').length;
  const loc = findUnitInManifest(manifest, unit.id);

  const answeredCount = stage.questionIds.filter((id) => {
    const v = draft[id];
    return typeof v === 'number' || (typeof v === 'string' && v.trim().length > 0);
  }).length;

  async function submit() {
    if (!stage || !unit) return;
    const ans = await loadAnswers(unit.id);
    setAnswers(ans);
    const now = new Date().toISOString();
    const records: Record<string, AnswerRecord> = {};
    for (const id of stage.questionIds) {
      const q = unit.questions[id];
      const v = draft[id];
      const a = ans[id];
      if (q.kind === 'choice') {
        const chosen = typeof v === 'number' ? v : -1;
        records[id] = { value: chosen, submittedAt: now, correct: a?.choiceIndex !== undefined ? chosen === a.choiceIndex : null };
      } else {
        records[id] = { value: typeof v === 'string' ? v : '', submittedAt: now, correct: null };
      }
    }
    progress.recordAnswers(unit.id, records);
    progress.setStageStatus(unit.id, stage.key, 'done', stageKeys);
    if (dKey) localStorage.removeItem(dKey);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goNext() {
    if (!stage || !unit) return;
    if (stage.kind === 'read') progress.setStageStatus(unit.id, stage.key, 'done', stageKeys);
    navigate(next ? `/learn/${unit.id}/${next}` : `/learn/${unit.id}/done`);
    window.scrollTo({ top: 0 });
  }

  let qIndex = 0;
  return (
    <>
      <div className="learn-head">
        <p className="crumbs">
          <Link to="/">시작</Link> › <Link to={`/start/units/${unit.semester}`}>{loc?.semester.title ?? `${unit.semester}학기`}</Link> › <span>{unit.chapter.title}</span>
        </p>
        <div className="learn-title">
          <h1>{unit.title}</h1>
          <span className="badge">{unit.code}</span>
          {unit.extra && <span className="badge badge-warn">보충 묶음</span>}
        </div>
        {unit.goal && <p className="learn-goal"><strong>도달 목표</strong> · {unit.goal}</p>}
      </div>
      <div className="narrow-banner notice notice-warn" style={{ marginTop: 12 }}>
        이 학습 화면은 노트북·데스크톱·가로 태블릿(1024px 이상)에 맞춰져 있어요. 좁은 화면에서는 입력이 가려질 수 있으니 넓은 화면을 권장해요.
      </div>
      <div className="learn">
        <nav className="rail" aria-label="학습 단계">
          <ol>
            {unit.stages.map((s, i) => {
              const st = unitStageStatus(up, s.key);
              return (
                <li key={s.key}>
                  <Link to={`/learn/${unit.id}/${s.key}`} className={s.key === stage.key ? 'current' : ''} aria-current={s.key === stage.key ? 'step' : undefined}>
                    <span className={`dot ${st}`}>{st === 'done' ? '✓' : i + 1}</span>
                    <span>{s.label}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
          <div className="rail-progress">완료 {doneCount}/{stageKeys.length} 단계</div>
        </nav>

        <section className="center">
          <div className="stage-card">
            <div className="stage-kicker">
              <span>{idx + 1}단계 · {stage.kind === 'check' ? '평가' : '읽기'}</span>
              {submitted && <span className="badge badge-done">제출 완료</span>}
            </div>
            <h2 className="stage-title">{stage.label}</h2>

            {stage.kind === 'check' && !submitted && (
              <div className="notice notice-info" style={{ marginBottom: 16 }}>
                정답과 해설은 모든 문항을 제출한 뒤에 열려요. 선택형은 자동으로 채점하고, 서술형은 정답 기준과 비교해 스스로 점검해요.
              </div>
            )}

            {stage.items.map((it, i) => {
              if (it.type === 'md') {
                const isRemediation = it.md.startsWith('**막혔다면');
                return isRemediation ? (
                  <div key={i} className="notice notice-ok" style={{ marginTop: 18, fontSize: 'inherit' }}>
                    <Markdown md={it.md} />
                  </div>
                ) : (
                  <Markdown key={i} md={it.md} />
                );
              }
              qIndex += 1;
              const q = unit.questions[it.id];
              return (
                <QuestionBlock
                  key={it.id}
                  question={q}
                  index={qIndex}
                  draft={draft[it.id]}
                  onChange={(v) => setDraftValue(it.id, v)}
                  record={up?.answers[it.id]}
                  answer={answers?.[it.id]}
                  onSelfMark={(m) => progress.setSelfMark(unit.id, it.id, m)}
                />
              );
            })}

            {submitted && unit.answerNotes && stage.key === 'exam_check' && (
              <div className="notice notice-info" style={{ marginTop: 18, fontSize: 'inherit' }}>
                <Markdown md={unit.answerNotes} />
              </div>
            )}

            <div className="stage-footer">
              <div>
                {prev ? (
                  <Link className="btn" to={`/learn/${unit.id}/${prev}`}>← 이전 단계</Link>
                ) : (
                  <Link className="btn" to={`/start/units/${unit.semester}`}>← 단원 목록</Link>
                )}
              </div>
              {stage.kind === 'check' && !submitted ? (
                <div className="row">
                  <span className="hint">{answeredCount}/{stage.questionIds.length} 문항 응답</span>
                  <button className="btn btn-primary" disabled={answeredCount < stage.questionIds.length} onClick={submit}>
                    제출하고 해설 보기
                  </button>
                </div>
              ) : (
                <button className="btn btn-primary" onClick={goNext}>
                  {next ? '다음 단계 →' : '단원 마치기 →'}
                </button>
              )}
            </div>
          </div>
        </section>

        <HelpPanel unit={unit} />
      </div>
    </>
  );
}

function UnitDone({ unit, manifest }: { unit: Unit; manifest: Manifest }) {
  const state = useProgress();
  const up = state?.units[unit.id];
  const keys = unit.stages.map((s) => s.key as StageKey);
  const done = keys.filter((k) => unitStageStatus(up, k) === 'done').length;
  const all = orderedUnits(manifest);
  const i = all.findIndex((u) => u.id === unit.id);
  const nextUnit = i >= 0 && i + 1 < all.length ? all[i + 1] : null;
  const qids = Object.keys(unit.questions);
  const choiceTotal = qids.filter((id) => unit.questions[id].kind === 'choice').length;
  const choiceCorrect = qids.filter((id) => up?.answers[id]?.correct === true).length;
  const shortTotal = qids.length - choiceTotal;
  const shortOk = qids.filter((id) => up?.answers[id]?.selfMark === 'ok').length;

  return (
    <div className="page page-narrow">
      <p className="crumbs"><Link to="/">시작</Link> › <Link to={`/start/units/${unit.semester}`}>{unit.semester}학기</Link> › {unit.chapter.title}</p>
      <h1>{unit.title}</h1>
      <div className="card stack">
        <div className={`notice ${done === keys.length ? 'notice-ok' : 'notice-warn'}`}>
          {done === keys.length ? '일곱 단계를 모두 마쳤어요.' : `${keys.length}단계 중 ${done}단계를 마쳤어요. 남은 단계는 왼쪽 단계 목록에서 열 수 있어요.`}
        </div>
        <div className="grid-2">
          <div>
            <h3>선택형</h3>
            <p className="muted" style={{ margin: 0 }}>{choiceTotal ? `${choiceCorrect}/${choiceTotal} 정답` : '없음'}</p>
          </div>
          <div>
            <h3>서술형 자기 점검</h3>
            <p className="muted" style={{ margin: 0 }}>{shortTotal ? `${shortOk}/${shortTotal} ‘맞게 썼어요’` : '없음'}</p>
          </div>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          틀린 문항은 해설의 ‘돌아갈 개념’ 안내를 따라 설명으로 돌아가요. 같은 문제를 정답을 본 뒤 다시 맞히는 것은 새로운 이해의 증거로 세지 않아요. 간격을 둔 재확인(복습 일정)은 Firebase 연결 후 서버에서 관리해요.
        </p>
        {unit.chapterOutro && (
          <div className="notice notice-info" style={{ fontSize: 'inherit' }}>
            <Markdown md={unit.chapterOutro} />
          </div>
        )}
        <div className="row">
          {nextUnit ? (
            <Link className="btn btn-primary" to={`/learn/${nextUnit.id}`}>다음 단원: {nextUnit.title} →</Link>
          ) : (
            <Link className="btn btn-primary" to="/exams">평가원 공식 예시로 가기 →</Link>
          )}
          <Link className="btn" to={`/learn/${unit.id}/prerequisite`}>이 단원 다시 보기</Link>
          <Link className="btn" to={`/start/units/${unit.semester}`}>단원 목록</Link>
        </div>
      </div>
    </div>
  );
}
