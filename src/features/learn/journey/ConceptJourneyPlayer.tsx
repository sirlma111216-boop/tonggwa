import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { ConceptJourney, Unit } from '../../../content/types';
import { progress, useProgress } from '../../../services/progress/store';
import { StructuredNotebook, VideoCorner } from '../PilotLesson';
import { LightLab } from './LightLabs';
import { CosmicLab } from './CosmicLabs';
import './ConceptJourney.css';

interface SceneDraft { lab: Record<string, unknown>; choice?: string; submitted?: boolean }
const EMPTY: SceneDraft = { lab: {} };
const COSMIC = new Set(['atom', 'cooling', 'timeline', 'ratio', 'origins']);

export function ConceptJourneyPlayer({ unit, journey }: { unit: Unit; journey: ConceptJourney }) {
  const state = useProgress();
  const up = state?.units[unit.id];
  const [params, setParams] = useSearchParams();
  const navKey = `${journey.revision}/position`;
  const saved = up?.activityDrafts?.[navKey] as { sceneId?: string } | undefined;
  const indexOf = (id: string | null | undefined) => journey.scenes.findIndex(s => s.id === id);
  const initial = indexOf(params.get('scene')) >= 0 ? indexOf(params.get('scene')) : params.has('s') ? Math.max(0, Math.min(Math.trunc(Number(params.get('s'))) || 0, journey.scenes.length - 1)) : Math.max(0, indexOf(saved?.sceneId));
  const [index, setIndex] = useState(initial);
  const [summary, setSummary] = useState(false);
  const [resources, setResources] = useState(false);
  const [term, setTerm] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const scene = journey.scenes[index];
  const draft = (up?.activityDrafts?.[scene.id] as SceneDraft | undefined) ?? EMPTY;
  const record = up?.activities?.[scene.id];
  const correct = !!draft.submitted && draft.choice === scene.question.answer;
  const explored = draft.lab.explored === true;
  const solved = journey.scenes.filter(s => up?.activities?.[s.id]?.correct === true).length;
  const points = journey.scenes.reduce((sum, s) => sum + (up?.activities?.[s.id]?.points ?? 0), 0);
  const first = journey.scenes.filter(s => up?.activities?.[s.id]?.firstCorrect === true).length;
  const repaired = journey.scenes.filter(s => up?.activities?.[s.id]?.firstCorrect === false && up?.activities?.[s.id]?.correct === true).length;
  const chosen = scene.question.options.find(o => o.id === draft.choice);
  const save = (next: SceneDraft) => progress.saveActivityDraft(unit.id, scene.id, next);
  const notebook = unit.notebooks?.find(n => n.id === scene.notebookId);
  const videoStep = unit.stages.flatMap(s => s.steps).find(s => s.type !== 'question' && s.lesson?.id === scene.videoLessonId);
  const video = videoStep && videoStep.type !== 'question' ? videoStep.lesson?.video : undefined;

  useEffect(() => {
    progress.setPosition({ unitId: unit.id, semester: unit.semester, stageKey: 'concept', step: index });
    progress.saveActivityDraft(unit.id, navKey, { sceneId: scene.id });
    setParams({ s: String(index), scene: scene.id }, { replace: true });
    setResources(false);
    setTerm(null);
    window.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [index, scene.id, unit.id, unit.semester, navKey, setParams]);

  useEffect(() => {
    // Legacy reading-page completion is not evidence for the new investigation.
    if (solved < journey.scenes.length && up?.stages.concept?.status === 'done') {
      progress.setStageStatus(unit.id, 'concept', 'in_progress', unit.stages.map(s => s.key));
    }
  }, [solved, journey.scenes.length, up?.stages.concept?.status, unit]);

  const submit = () => {
    if (!explored || !draft.choice || draft.submitted) return;
    save({ ...draft, submitted: true });
    progress.recordActivity(unit.id, scene.id, { done: true, correct: draft.choice === scene.question.answer });
  };
  const next = () => {
    if (!correct) return;
    if (index < journey.scenes.length - 1) setIndex(index + 1);
    else {
      if (solved === journey.scenes.length) progress.setStageStatus(unit.id, 'concept', 'done', unit.stages.map(s => s.key));
      setSummary(true);
      window.scrollTo({ top: 0 });
    }
  };

  return <div className="concept-journey" data-content-revision={journey.revision}>
    <header className="cj-top">
      <Link to={`/learn/${unit.id}`} className="cj-exit" aria-label="단원 지도로 나가기">← <span>단원 지도</span></Link>
      <div className="cj-brand"><span>개념 탐구실{import.meta.env.DEV ? ' · 로컬 미리보기' : ''}</span><strong>{journey.title}</strong></div>
      <div className="cj-progress"><span>{summary ? journey.scenes.length : index + 1} / {journey.scenes.length}</span><progress max={journey.scenes.length} value={solved} aria-label="해결한 탐구" /></div>
      <span className="cj-xp">✦ {points} XP</span>
    </header>

    {summary ? <main className="cj-summary">
      <div className="cj-orbit" aria-hidden="true">✦</div>
      <p className="cj-eyebrow">빛에서 시작해, 우주의 시간까지</p>
      <h1>{solved === journey.scenes.length ? '이제 근거를 연결할 수 있어요' : '남은 탐구를 이어서 해 볼까요?'}</h1>
      {solved === journey.scenes.length ? <p>선의 위치로 원소를 찾고, 원자핵과 중성 원자의 탄생을 구별했어요.<br />다음은 그림의 도움 없이 새 문제에서 설명해 볼 차례예요.</p> : <p>아직 확인하지 않은 탐구가 {journey.scenes.length - solved}개 있어요. 아래에서 이어서 살펴보세요.</p>}
      <div className="cj-results"><div><strong>{solved}/{journey.scenes.length}</strong><span>해결한 탐구</span></div><div><strong>{first}</strong><span>첫 판단 정답</span></div><div><strong>{repaired}</strong><span>다시 생각해 해결</span></div></div>
      <div className="cj-recap">{journey.scenes.map((s, i) => <button key={s.id} onClick={() => { setSummary(false); setIndex(i); }}><span>{up?.activities?.[s.id]?.correct ? '✓' : '○'}</span>{s.title}<small>다시 보기 ↗</small></button>)}</div>
      <p className="cj-small">XP는 참여 기록이에요. 개념을 혼자 설명하는 힘은 다음 평가에서 확인해요.</p>
      {solved === journey.scenes.length ? <Link className="cj-primary" to={`/learn/${unit.id}/concept_check`}>개념평가로 이어가기 →</Link> : <button className="cj-primary" onClick={() => { setSummary(false); setIndex(journey.scenes.findIndex(s => !up?.activities?.[s.id]?.correct)); }}>남은 탐구 이어가기 →</button>}
    </main> : <main className="cj-main">
      <div className="cj-chapter-line"><span className="cj-eyebrow">{scene.chapter}</span><button onClick={() => setResources(!resources)} aria-expanded={resources}>필기장 · 영상 {resources ? '−' : '＋'}</button></div>
      <h1 ref={heading} tabIndex={-1}>{scene.title}</h1>
      <p className="cj-intro">{scene.intro}</p>
      <div className="cj-workspace">
        <section className="cj-lab" aria-label="직접 조작하는 과학 모형">
          <div className="cj-instruction"><span aria-hidden="true">↗</span>{scene.instruction}</div>
          {COSMIC.has(scene.kind) ? <CosmicLab key={scene.id} kind={scene.kind} state={draft.lab} onChange={lab => save({ ...draft, lab })} /> : <LightLab key={scene.id} kind={scene.kind} state={draft.lab} onChange={lab => save({ ...draft, lab })} />}
          <div className="cj-terms" aria-label="말뜻 사전"><span>말뜻</span>{scene.terms.map(t => <button key={t.term} aria-expanded={term === t.term} onClick={() => setTerm(term === t.term ? null : t.term)}>{t.term} <span aria-hidden="true">＋</span></button>)}</div>
          {term && <div className="cj-term-definition" role="status"><strong>{term}</strong> · {scene.terms.find(t => t.term === term)?.meaning}</div>}
        </section>
        <section className={`cj-decision${correct ? ' is-correct' : ''}`} aria-label="관찰한 결과로 판단하기">
          <span className="cj-eyebrow">{explored ? '이제, 내 판단' : '먼저 눈으로 확인해요'}</span>
          {explored ? <>
            <h2>{scene.question.prompt}</h2>
            <div className="cj-options" role="radiogroup" aria-label={scene.question.prompt}>{scene.question.options.map((option, i) => <button key={option.id} role="radio" aria-checked={draft.choice === option.id} disabled={correct} className={draft.choice === option.id ? 'selected' : ''} onClick={() => save({ ...draft, choice: option.id, submitted: false })}><span>{i + 1}</span>{option.text}</button>)}</div>
            {!draft.submitted && <button className="cj-check" disabled={!draft.choice} onClick={submit}>내 판단 확인</button>}
            {draft.submitted && <div className={`cj-feedback ${correct ? 'good' : 'retry'}`} role="status">
              <strong>{correct ? record?.firstCorrect === false ? '고친 이유를 찾았어요!' : '관찰을 근거로 잘 연결했어요!' : '여기서 한 번 더 생각해 봐요'}</strong>
              <p>{chosen?.feedback}</p>
              {correct ? <><p className="cj-takeaway">{scene.takeaway}</p><button onClick={() => save({ ...draft, choice: undefined, submitted: false })}>답을 가리고 다시 풀기 ↺</button></> : <button onClick={() => save({ ...draft, choice: undefined, submitted: false })}>그림을 보고 다시 판단하기 ↺</button>}
            </div>}
          </> : <div className="cj-observe-first"><span aria-hidden="true">◎</span><h2>직접 바꾸면<br />보이는 것이 달라져요.</h2><p>{scene.instruction}</p><small>관찰한 뒤 확인 질문이 열려요.</small></div>}
        </section>
      </div>
      {correct && <div className="cj-understanding"><span>연결한 개념</span><p>{scene.question.explanation}</p></div>}
      {correct && notebook && <div className="cj-notebook-stop"><span className="cj-eyebrow">손으로 한 번 더 연결하기</span><StructuredNotebook key={notebook.id} unit={unit} sheet={notebook} /></div>}
      {resources && <aside className="cj-resources" aria-label="필기장과 영상 자료"><div className="cj-resource-head"><h2>필기장 · 영상 자료</h2><button onClick={() => setResources(false)} aria-label="자료 닫기">✕</button></div><Link className="btn" to={`/workbook/${unit.id}`} target="_blank" rel="noopener noreferrer">제목과 목표가 인쇄된 필기장 열기 ↗</Link>{video && <VideoCorner video={video} />}</aside>}
      <footer className="cj-bottom"><button className="cj-back" disabled={index === 0} onClick={() => setIndex(index - 1)}>← 이전</button><span>{correct ? '한 걸음 연결했어요. 이어서 가 볼까요?' : explored ? '내 판단을 확인하면 다음 탐구가 열려요.' : '모형을 조작하며 먼저 관찰해 보세요.'}</span><button className="cj-primary" disabled={!correct} onClick={next}>{index === journey.scenes.length - 1 ? '배운 것 모아 보기' : '다음 탐구'} →</button></footer>
    </main>}
  </div>;
}
