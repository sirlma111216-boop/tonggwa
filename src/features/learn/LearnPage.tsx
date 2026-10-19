import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { findUnitInManifest, loadAnswers, loadManifest, loadUnit, orderedUnits } from '../../content/loader';
import type { AnswerSet, Manifest, Stage, StageKey, Unit } from '../../content/types';
import { progress, unitStageStatus, useProgress } from '../../services/progress/store';
import type { AnswerRecord } from '../../services/progress/types';
import { ActivityBlock } from './Activity';
import { HelpPanel } from './HelpPanel';
import { Markdown } from './Markdown';
import { QuestionStep } from './QuestionStep';
import { TermContext } from './TermContext';
import { TermPanel } from './TermPanel';
import { PilotLesson, PilotUnitPanel, TransferReview, pilotEvidence } from './PilotLesson';
import { ConceptJourneyPlayer } from './journey/ConceptJourneyPlayer';

const STAGE_DESC: Record<StageKey, string> = {
  prerequisite: '이 단원에 필요한 중학교 개념을 짧게 확인해요',
  concept: '핵심 개념을 한 화면씩 읽어요',
  concept_check: '방금 배운 개념을 문제로 확인해요',
  advanced: '자료 해석과 여러 개념의 연결을 더 깊게 봐요',
  advanced_check: '심화 내용을 문제로 확인해요',
  strategy: '수능형 문항을 어떻게 읽고 푸는지 전략을 익혀요',
  exam_check: '수능형 문항으로 마무리해요',
};

function useUnitData(unitId: string) {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setUnit(null);
    setError(null);
    Promise.all([loadManifest(), loadUnit(unitId)])
      .then(([m, u]) => {
        if (!alive) return;
        setManifest(m);
        setUnit(u);
      })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : String(e)); });
    return () => { alive = false; };
  }, [unitId]);
  return { manifest, unit, error };
}

export function LearnPage() {
  const { unitId = '', stageKey } = useParams();
  const { manifest, unit, error } = useUnitData(unitId);
  if (error) return <div className="page"><div className="notice notice-bad">{error}</div></div>;
  if (!unit || !manifest) return <div className="center-msg">단원을 불러오는 중이에요…</div>;
  if (!stageKey) return <UnitMap unit={unit} manifest={manifest} />;
  if (stageKey === 'done') return <UnitDone unit={unit} manifest={manifest} />;
  const stage = unit.stages.find((s) => s.key === stageKey);
  if (!stage) return <Navigate to={`/learn/${unitId}`} replace />;
  if (stage.key === 'concept' && unit.conceptJourney) return <ConceptJourneyPlayer key={`${unit.id}/${unit.conceptJourney.revision}`} unit={unit} journey={unit.conceptJourney} />;
  return <StagePlayer key={`${unit.id}/${stage.key}`} unit={unit} stage={stage} manifest={manifest} />;
}

/* ---------------- 단원 지도: 7단계를 경로로 보여 준다 ---------------- */
function UnitMap({ unit, manifest }: { unit: Unit; manifest: Manifest }) {
  const state = useProgress();
  const up = state?.units[unit.id];
  const loc = findUnitInManifest(manifest, unit.id);
  const status = (key: StageKey) => key === 'concept' && unit.conceptJourney && unitStageStatus(up, key) === 'done' && unit.conceptJourney.scenes.some(scene => !up?.activities?.[scene.id]?.correct) ? 'in_progress' : unitStageStatus(up, key);
  const firstOpen = unit.stages.find((s) => status(s.key) !== 'done') ?? unit.stages[0];
  const doneCount = unit.stages.filter((s) => status(s.key) === 'done').length;
  return (
    <div className="page page-narrow">
      <p className="crumbs">
        <Link to="/">시작</Link> › <Link to={`/start/units/${unit.semester}`}>{loc?.semester.title ?? `${unit.semester}학기`}</Link> › <span>{unit.chapter.title}</span>
      </p>
      <div className="learn-title">
        <h1>{unit.title}</h1>
        <span className="badge">{unit.code}</span>
      </div>
      {unit.goal && <p className="learn-goal"><strong>도달 목표</strong> · {unit.goal}</p>}
      {unit.pilot && <PilotUnitPanel unit={unit} />}
      <div className="row" style={{ margin: '16px 0 22px' }}>
        <Link className="btn btn-primary btn-lg" to={`/learn/${unit.id}/${firstOpen.key}`}>
          {doneCount === 0 ? '학습 시작' : doneCount === unit.stages.length ? '처음부터 다시 보기' : `이어서: ${firstOpen.label}`} →
        </Link>
        <span className="muted">{doneCount}/{unit.stages.length} 단계 완료</span>
      </div>
      <ol className="path">
        {unit.stages.map((s, i) => {
          const st = status(s.key);
          const qn = s.questionIds.length;
          const correct = s.questionIds.filter((id) => up?.answers[id]?.correct === true).length;
          const choiceN = s.questionIds.filter((id) => unit.questions[id].kind === 'choice').length;
          return (
            <li key={s.key} className={`path-node ${st}`}>
              <Link to={`/learn/${unit.id}/${s.key}`} className="path-card">
                <span className={`dot ${st}`}>{st === 'done' ? '✓' : i + 1}</span>
                <span className="path-main">
                  <span className="path-title">{s.label}</span>
                  <span className="path-desc">{unit.pilot && s.key === 'concept' ? '그림과 활동으로 핵심 개념을 연결해요' : STAGE_DESC[s.key]}</span>
                </span>
                <span className="path-meta">
                  {s.kind === 'check' ? `${qn}문항${st === 'done' && choiceN ? ` · 선택형 ${correct}/${choiceN} 정답` : ''}` : `${s.key === 'concept' && unit.conceptJourney ? unit.conceptJourney.scenes.length : s.steps.length}화면`}
                  <br />
                  <span className={`badge ${st === 'done' ? 'badge-done' : st === 'in_progress' ? 'badge-progress' : ''}`}>
                    {st === 'done' ? '완료' : st === 'in_progress' ? '진행 중' : '미학습'}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      {unit.pilot && <TransferReview key={unit.id} unit={unit} />}
    </div>
  );
}

/* ---------------- 스텝 플레이어: 한 화면에 하나씩 ---------------- */
function StagePlayer({ unit, stage, manifest }: { unit: Unit; stage: Stage; manifest: Manifest }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const state = useProgress();
  const up = state?.units[unit.id];
  const [answers, setAnswers] = useState<AnswerSet | null>(null);
  const [side, setSide] = useState<null | { kind: 'help' } | { kind: 'term'; term: string }>(null);
  const help = side !== null;
  const [anim, setAnim] = useState(0);
  const qApi = useRef<{ canCheck: boolean; check: () => void } | null>(null);

  const total = stage.steps.length; // 마지막에 요약 화면이 하나 더 붙는다
  const stageKeys = useMemo(() => unit.stages.map((s) => s.key), [unit]);
  const stageIdx = stageKeys.indexOf(stage.key);
  const nextStage = stageIdx + 1 < stageKeys.length ? stageKeys[stageIdx + 1] : null;

  // 시작 위치: ?s= 가 있으면 그것, 없으면 저장된 위치
  const initial = (() => {
    const q = params.get('s');
    if (q !== null) return Math.min(Math.max(Number(q) || 0, 0), total);
    const saved = up?.stages[stage.key];
    if (saved?.status === 'done') return 0;
    return Math.min(saved?.step ?? 0, total);
  })();
  const [idx, setIdx] = useState(initial);

  useEffect(() => {
    progress.setPosition({ unitId: unit.id, stageKey: stage.key, step: idx, semester: unit.semester });
    setParams({ s: String(idx) }, { replace: true });
    window.scrollTo({ top: 0 });
  }, [idx, unit.id, unit.semester, stage.key, setParams]);

  const step = idx < total ? stage.steps[idx] : null;
  const q = step?.type === 'question' ? unit.questions[step.id] : null;
  const record = q ? up?.answers[q.id] : undefined;
  const pendingActivity = !!(unit.pilot && step && step.type !== 'question' && step.activities?.some((a) => !up?.activities?.[a.id!]?.done));
  const evidence = unit.pilot ? pilotEvidence(unit, up) : null;

  useEffect(() => {
    if (record && !answers) loadAnswers(unit.id).then(setAnswers);
  }, [record, answers, unit.id]);

  const go = useCallback(
    (n: number) => {
      setAnim((a) => a + 1);
      setIdx(Math.min(Math.max(n, 0), total));
    },
    [total],
  );

  const checkAnswer = async (value: number | string) => {
    if (!q) return;
    const ans = await loadAnswers(unit.id);
    setAnswers(ans);
    const a = ans[q.id];
    const rec: AnswerRecord = {
      value,
      submittedAt: new Date().toISOString(),
      correct: q.kind === 'choice' && a?.choiceIndex !== undefined ? value === a.choiceIndex : null,
    };
    progress.recordAnswers(unit.id, { [q.id]: rec });
    // 해설이 화면 아래에 가려지지 않도록 피드백 위치로 스크롤
    window.setTimeout(() => document.querySelector('.feedback')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
  };

  const finishStage = () => {
    progress.setStageStatus(unit.id, stage.key, 'done', stageKeys);
  };
  useEffect(() => {
    if (idx === total) finishStage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, total]);

  // 주 행동
  const needSelfMark = !!(q && record && record.correct === null && !record.selfMark);
  const primary = (() => {
    if (idx === total) return { label: nextStage ? '다음 단계로 →' : '단원 마치기 →', disabled: false, run: () => navigate(nextStage ? `/learn/${unit.id}/${nextStage}` : `/learn/${unit.id}/done`) };
    if (q && !record) return { label: '확인', disabled: !(qApi.current?.canCheck ?? false), run: () => qApi.current?.check() };
    if (q && record) return { label: idx + 1 === total ? '결과 보기 →' : '다음 →', disabled: needSelfMark, run: () => go(idx + 1) };
    if (pendingActivity) return { label: '활동해 보기 ↓', disabled: false, run: () => {
      const activity = document.getElementById('pilot-practice');
      activity?.focus({ preventScroll: true });
      activity?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    } };
    return { label: idx + 1 === total ? '정리하기 →' : '다음 →', disabled: false, run: () => go(idx + 1) };
  })();

  // Enter 키 = 주 행동 (항상 최신 primary 를 참조)
  const primaryRef = useRef(primary);
  primaryRef.current = primary;
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.isComposing) return;
      const t = e.target as HTMLElement;
      if (t?.closest('input, select, [contenteditable="true"], .pilot-lesson, .activity')) return;
      if (t?.tagName === 'TEXTAREA' && !(e.ctrlKey || e.metaKey)) return;
      if (t?.tagName === 'BUTTON' || t?.tagName === 'A') return;
      const p = primaryRef.current;
      if (!p.disabled) {
        e.preventDefault();
        p.run();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const [, force] = useState(0);
  const bind = useCallback((api: { canCheck: boolean; check: () => void }) => {
    const changed = qApi.current?.canCheck !== api.canCheck;
    qApi.current = api;
    if (changed) force((n) => n + 1);
  }, []);

  const qNumber = step?.type === 'question' ? stage.questionIds.indexOf(step.id) + 1 : 0;
  const pct = Math.round((Math.min(idx, total) / total) * 100);
  const goTo = (stageKey: StageKey, stepIndex: number) => {
    if (stageKey === stage.key) go(stepIndex);
    else navigate(`/learn/${unit.id}/${stageKey}?s=${stepIndex}`);
  };

  return (
    <TermContext.Provider value={{ unit, openTerm: (term) => setSide({ kind: 'term', term }) }}>
    <div className="lesson">
      <header className="lesson-top">
        <Link to={`/learn/${unit.id}`} className="btn btn-text lesson-exit" title="단원 지도로 나가기">✕ 나가기</Link>
        <div className="lesson-where">
          <span className="lesson-unit">{unit.title}</span>
          <span className="lesson-stage">{stageIdx + 1}단계 · {stage.label} {evidence && <span className="pilot-score">· {evidence.points} XP</span>}</span>
        </div>
        <div className="lesson-progress" aria-label={`진행 ${pct}%`}>
          <div className="bar"><i style={{ width: `${pct}%` }} /></div>
          <span className="small muted">{Math.min(idx + 1, total)}/{total}</span>
        </div>
        <button className={`btn btn-text${side?.kind === 'help' ? ' on' : ''}`} onClick={() => setSide((s) => (s?.kind === 'help' ? null : { kind: 'help' }))} aria-expanded={side?.kind === 'help'}>도움 · 노트</button>
      </header>

      <div className={`lesson-body${help ? ' with-help' : ''}`}>
        <div className="lesson-card" key={anim}>
          {step && step.type !== 'question' && step.lesson && <PilotLesson key={step.lesson.id} unit={unit} step={step} />}
          {step && step.type !== 'question' && !step.lesson && (
            <article className={`step-read${step.type === 'remediation' ? ' step-remed' : ''}`}>
              <div className="step-kicker">
                <span className="badge">{step.type === 'remediation' ? '보충 설명' : `${stage.label} · ${idx + 1}/${total}`}</span>
                {step.part && <span className="muted small">{step.part}/{step.parts}</span>}
              </div>
              <h2 className="step-title">{step.title}</h2>
              <Markdown md={step.md} />
              {step.activities?.map((a, i) => (
                <ActivityBlock key={`${stage.key}/${idx}/${i}`} unitId={unit.id} storeKey={`${stage.key}/${idx}/${i}`} activity={a} />
              ))}
            </article>
          )}
          {step && step.type === 'question' && q && (
            <QuestionStep
              key={q.id}
              question={q}
              number={qNumber}
              total={stage.questionIds.length}
              record={record}
              answer={answers?.[q.id]}
              onCheck={checkAnswer}
              onSelfMark={(m) => progress.setSelfMark(unit.id, q.id, m)}
              bind={bind}
            />
          )}
          {idx === total && <StageSummary unit={unit} stage={stage} nextStage={nextStage} manifest={manifest} />}
        </div>
        {side && (
          <div className="lesson-help">
            {side.kind === 'help' ? <HelpPanel unit={unit} /> : <TermPanel unit={unit} term={side.term} onGo={goTo} onClose={() => setSide(null)} />}
          </div>
        )}
      </div>

      <footer className="lesson-actions">
        <button className="btn" onClick={() => go(idx - 1)} disabled={idx === 0}>← 이전</button>
        <span className="hint muted small">
          {q && !record && (q.kind === 'choice' ? '번호를 고르고 확인을 누르세요 (키보드 1~5, Enter)' : '답을 쓰고 확인을 누르세요 (Ctrl+Enter)')}
          {needSelfMark && '위에서 내 답을 어떻게 썼는지 표시하면 다음으로 갈 수 있어요'}
          {pendingActivity && <button className="pilot-skip" onClick={() => go(idx + 1)}>지금은 넘어가고 나중에 도전하기</button>}
        </span>
        <button className="btn btn-primary btn-lg" disabled={primary.disabled} onClick={primary.run}>{primary.label}</button>
      </footer>
    </div>
    </TermContext.Provider>
  );
}

/* ---------------- 단계 요약 ---------------- */
function StageSummary({ unit, stage, nextStage, manifest }: { unit: Unit; stage: Stage; nextStage: StageKey | null; manifest: Manifest }) {
  const state = useProgress();
  const up = state?.units[unit.id];
  const ids = stage.questionIds;
  const choice = ids.filter((id) => unit.questions[id].kind === 'choice');
  const correct = choice.filter((id) => up?.answers[id]?.correct === true);
  const wrong = choice.filter((id) => up?.answers[id]?.correct === false);
  const shorts = ids.filter((id) => unit.questions[id].kind === 'short');
  const review = shorts.filter((id) => up?.answers[id]?.selfMark && up.answers[id].selfMark !== 'ok');
  const nextLabel = nextStage ? manifest.stageOrder.find((s) => s.key === nextStage)?.label : null;
  return (
    <div className="summary">
      <div className="step-kicker"><span className="badge badge-done">단계 완료</span></div>
      <h2 className="step-title">{stage.label} 단계를 마쳤어요</h2>
      {stage.kind === 'read' ? (
        <p className="prose">{stage.steps.length}개 화면의 마지막에 도착했어요. {unit.pilot ? '활동과 필기 기록은 단원 지도에서 확인할 수 있어요. ' : ''}{nextLabel ? `다음은 ${nextLabel}이에요.` : ''}</p>
      ) : (
        <>
          <div className="summary-grid">
            {choice.length > 0 && (
              <div className="card">
                <div className="muted small">선택형</div>
                <div className="summary-num">{correct.length}<span>/{choice.length}</span></div>
              </div>
            )}
            {shorts.length > 0 && (
              <div className="card">
                <div className="muted small">서술형 · 맞게 썼어요</div>
                <div className="summary-num">{shorts.filter((id) => up?.answers[id]?.selfMark === 'ok').length}<span>/{shorts.length}</span></div>
              </div>
            )}
          </div>
          {wrong.length + review.length > 0 ? (
            <div className="notice notice-warn" style={{ marginTop: 16 }}>
              다시 볼 문항: {[...wrong, ...review].join(', ')}. 해설의 ‘돌아갈 개념’ 안내를 따라 설명으로 돌아가고, 같은 문제를 정답을 본 뒤 다시 맞히는 것은 새로운 이해의 증거로 세지 않아요.
            </div>
          ) : (
            <div className="notice notice-ok" style={{ marginTop: 16 }}>모든 문항을 잘 마쳤어요. {nextLabel ? `다음은 ${nextLabel}이에요.` : ''}</div>
          )}
        </>
      )}
      {unit.pilot && stage.kind === 'read' && <div className="notice notice-info">{stage.steps.flatMap((s) => s.type === 'question' ? [] : s.activities ?? []).filter((a) => up?.activities?.[a.id!]?.done).length} / {stage.steps.flatMap((s) => s.type === 'question' ? [] : s.activities ?? []).length} 활동에 응답했어요. 아직 시도하지 않은 활동은 언제든 돌아가 도전할 수 있어요.</div>}
      {!nextStage && unit.answerNotes && (
        <div className="notice notice-info" style={{ marginTop: 16, fontSize: 'inherit' }}>
          <Markdown md={unit.answerNotes} />
        </div>
      )}
    </div>
  );
}

/* ---------------- 단원 마침 ---------------- */
function UnitDone({ unit, manifest }: { unit: Unit; manifest: Manifest }) {
  const state = useProgress();
  const up = state?.units[unit.id];
  const keys = unit.stages.map((s) => s.key);
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
      {unit.pilot && <PilotUnitPanel unit={unit} />}
      <div className="card stack">
        <div className={`notice ${done === keys.length ? 'notice-ok' : 'notice-warn'}`}>
          {done === keys.length ? '일곱 단계를 모두 마쳤어요.' : `${keys.length}단계 중 ${done}단계를 마쳤어요. 남은 단계는 단원 지도에서 열 수 있어요.`}
        </div>
        <div className="summary-grid">
          <div className="card"><div className="muted small">선택형</div><div className="summary-num">{choiceCorrect}<span>/{choiceTotal}</span></div></div>
          <div className="card"><div className="muted small">서술형 · 맞게 썼어요</div><div className="summary-num">{shortOk}<span>/{shortTotal}</span></div></div>
        </div>
        {unit.chapterOutro && (
          <div className="notice notice-info" style={{ fontSize: 'inherit' }}>
            <Markdown md={unit.chapterOutro} />
          </div>
        )}
        <div className="row">
          {nextUnit ? (
            <Link className="btn btn-primary btn-lg" to={`/learn/${nextUnit.id}`}>다음 단원: {nextUnit.title} →</Link>
          ) : (
            <Link className="btn btn-primary btn-lg" to="/exams">평가원 공식 예시로 가기 →</Link>
          )}
          <Link className="btn" to={`/learn/${unit.id}`}>단원 지도</Link>
          <Link className="btn" to={`/start/units/${unit.semester}`}>단원 목록</Link>
        </div>
      </div>
      {unit.pilot && <TransferReview key={unit.id} unit={unit} />}
    </div>
  );
}
