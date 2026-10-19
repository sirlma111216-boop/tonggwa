import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { LessonVideo, NotebookSheet, Step, TransferQuestion, Unit } from '../../content/types';
import { progress, useProgress } from '../../services/progress/store';
import type { UnitProgress } from '../../services/progress/types';
import { ActivityBlock } from './Activity';
import { Markdown } from './Markdown';
import { useTermApi } from './TermContext';

type ReadStep = Exclude<Step, { type: 'question' }>;
const MODE = {
  observe: { label: '관찰하고 발견하기', symbol: '◎' },
  investigate: { label: '직접 바꾸며 탐구하기', symbol: '↔' },
  compare: { label: '나란히 놓고 비교하기', symbol: '⇄' },
  explain: { label: '이유를 연결하기', symbol: '∴' },
  apply: { label: '새 자료에 적용하기', symbol: '↗' },
  connect: { label: '개념 사이 연결 찾기', symbol: '∞' },
};

export function PilotLesson({ unit, step }: { unit: Unit; step: ReadStep }) {
  const plan = step.lesson!;
  const { openTerm } = useTermApi();
  const activityFirst = plan.mode === 'observe' || plan.mode === 'investigate';
  const notebook = unit.notebooks?.find((n) => n.id === plan.notebookId);
  const mode = MODE[plan.mode];
  const explanation = (
    <section className="pilot-explanation" aria-label="개념 설명">
      <div className="pilot-section-label">개념 살펴보기</div>
      <h3>{plan.displayTitle ?? step.title}</h3>
      <Markdown md={step.md} />
    </section>
  );
  const activities = (
    <div id="pilot-practice" tabIndex={-1} className="pilot-practice">
      {step.activities?.map((a) => <ActivityBlock key={a.id} unitId={unit.id} storeKey={a.id!} activity={a} />)}
    </div>
  );
  return (
    <article className="pilot-lesson">
      <header className="pilot-lesson-head">
        <span className="pilot-mode"><span aria-hidden="true">{mode.symbol}</span> {mode.label}</span>
        <h2>{plan.prompt}</h2>
        <p><span>오늘의 한 걸음</span> {plan.goal}</p>
      </header>
      <div className="pilot-terms" aria-label="이번 개념의 용어">
        <span>말뜻부터</span>
        {plan.terms.map((term) => <button key={term} type="button" onClick={() => openTerm(term)}>{term} <span aria-hidden="true">＋</span></button>)}
      </div>
      {activityFirst ? <>{activities}<div className="pilot-read-details">{explanation}</div></> : <>{explanation}{activities}</>}
      <div className="pilot-beyond">
        {notebook && <StructuredNotebook key={notebook.id} unit={unit} sheet={notebook} />}
        <VideoCorner video={plan.video} />
      </div>
    </article>
  );
}

function StructuredNotebook({ unit, sheet }: { unit: Unit; sheet: NotebookSheet }) {
  const state = useProgress();
  const check = state?.units[unit.id]?.notebookChecks?.[sheet.id];
  const [openModel, setOpenModel] = useState(false);
  const page = (unit.notebooks?.findIndex((n) => n.id === sheet.id) ?? 0) + 1;
  return (
    <details className="pilot-notebook">
      <summary><span className="pilot-corner-icon" aria-hidden="true">▤</span><span><strong>손으로 연결하는 개념</strong><small>필기장 {page}쪽 · {sheet.title}</small></span><span className="badge">{check?.mark ? '비교 기록 있음' : '구조적 필기'}</span></summary>
      <div className="pilot-corner-body">
        <p>화면을 잠시 덮고, 인쇄된 칸에 핵심 관계를 내 말과 그림으로 적어 보세요. 제목과 목표는 이미 적혀 있어요.</p>
        <div className="row">
          <Link className="btn" to={`/workbook/${unit.id}`} target="_blank" rel="noopener noreferrer">필기장 보기 · 인쇄 ↗</Link>
          <a className="btn btn-text" href={`/workbooks/${unit.id}-notebook.pdf#page=${page}`} target="_blank" rel="noopener noreferrer">PDF {page}쪽 ↗</a>
        </div>
        <ul className="pilot-note-prompts">{sheet.sections.map((s) => <li key={s.label}><strong>{s.label}</strong><span>{s.prompt}</span></li>)}</ul>
        <p className="small muted">이번에 배운 부분부터 채우고, 아직 배우지 않은 칸은 이어서 채워도 좋아요. 모범 답을 그대로 옮기기 전에 한 번 떠올려 보세요.</p>
        <button className="btn btn-primary" onClick={() => {
          if (!check?.writtenAt) progress.checkNotebook(unit.id, sheet.id, { writtenAt: new Date().toISOString() });
          setOpenModel((value) => !value);
        }} aria-expanded={openModel}>{openModel ? '모범 필기 접기' : check?.writtenAt ? '모범 필기 다시 비교하기' : '필기했어요'}</button>
        {openModel && check?.writtenAt && <div className="pilot-note-model">
          <h4>단어가 똑같지 않아도, 관계가 맞으면 좋아요</h4>
          {sheet.modelSections?.length ? <div className={`pilot-model-grid layout-${sheet.layout}`}>{sheet.modelSections.map((section) => <section key={section.label}><h5>{section.label}</h5><Markdown md={section.content} /></section>)}</div> : <Markdown md={sheet.model} />}
          <h4>내 필기와 비교할 핵심</h4>
          <ul>{sheet.criteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul>
          <p>빠진 부분은 다른 색으로 보완하고, 아래에 내 점검을 남겨 주세요.</p>
          <div className="pilot-mark-buttons">
            {([['matched', '핵심이 같아요'], ['corrected', '보완해서 이해했어요'], ['revisit', '다시 확인할래요']] as const).map(([mark, text]) => <button className={`btn${check.mark === mark ? ' btn-primary' : ''}`} key={mark} aria-pressed={check.mark === mark} onClick={() => progress.checkNotebook(unit.id, sheet.id, { mark, checkedAt: new Date().toISOString() })}>{text}</button>)}
          </div>
          {check.mark && <p className="pilot-cheer" role="status">{check.mark === 'revisit' ? '모르는 부분을 찾은 것도 진전이에요. 위의 용어와 활동에서 다시 확인해 봐요.' : check.mark === 'corrected' ? '고친 이유까지 남겼다면, 다음에 떠올릴 단서가 생겼어요.' : '좋아요. 이제 다른 자료에서도 같은 관계를 찾아보세요.'}</p>}
          <p className="small muted">필기 기록은 학생의 자기 점검이에요. 새로운 문제에서 확인한 결과와 따로 저장해요.</p>
        </div>}
      </div>
    </details>
  );
}

function VideoCorner({ video }: { video: LessonVideo }) {
  return (
    <section className="pilot-video" aria-label="영상과 더 살펴볼 자료">
      <div className="pilot-video-head"><span className="pilot-corner-icon" aria-hidden="true">▻</span><div><h3>{video.title}</h3><p>{video.duration} · {video.src ? '개념 영상' : '개념 영상 제작 예정'}</p></div></div>
      {video.src && <video controls preload="metadata" src={video.src} aria-label={video.title} />}
      <p className="small">{video.src ? '보고 나서 한 번 생각해 보세요.' : '지금은 아래 공식 자료에서 더 살펴볼 수 있어요.'} {video.checkQuestion}</p>
      <ul className="pilot-sources">{video.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer"><span>{source.kind === 'video' ? '영상' : source.kind === 'interactive' ? '탐구' : '읽을거리'}</span>{source.label} ↗</a><small>{source.note}</small></li>)}</ul>
      <details className="pilot-production"><summary>영상 제작 가이드 열기</summary><div>
        <p><strong>제작 프롬프트</strong></p><p>{video.brief}</p>
        <ol>{video.scenes.map((scene) => <li key={scene}>{scene}</li>)}</ol>
        <p><strong>마지막 확인 질문</strong> · {video.checkQuestion}</p>
        <p><strong>표현할 때 주의할 점</strong></p><ul>{video.avoid.map((item) => <li key={item}>{item}</li>)}</ul>
      </div></details>
    </section>
  );
}

export function pilotEvidence(unit: Unit, up?: UnitProgress) {
  const ids = unit.stages.flatMap((s) => s.steps.flatMap((step) => step.type === 'question' ? [] : (step.activities ?? []).map((a) => a.id!)));
  const records = ids.map((id) => up?.activities?.[id]).filter((r) => !!r?.done);
  return {
    total: ids.length, tried: records.length,
    first: records.filter((r) => r?.firstCorrect === true).length,
    repaired: records.filter((r) => r?.firstCorrect === false && r.correct === true).length,
    points: records.reduce((sum, r) => sum + (r?.points ?? 0), 0),
    notebooks: (unit.notebooks ?? []).filter((n) => !!up?.notebookChecks?.[n.id]?.mark).length,
  };
}

export function PilotUnitPanel({ unit }: { unit: Unit }) {
  const state = useProgress();
  const up = state?.units[unit.id];
  const e = pilotEvidence(unit, up);
  return (
    <section className="pilot-unit-panel" aria-label="탐구 수업 안내">
      <div className="pilot-unit-intro"><span className="pilot-eyebrow">{unit.theme?.eyebrow ?? '우주를 읽는 과학자'}</span><h2>{unit.theme?.mission}</h2><p>보고, 바꾸고, 설명하며 한 가지씩 연결해요.</p></div>
      <div className="pilot-unit-tools"><Link className="btn" to={`/workbook/${unit.id}`}>▤ 구조적 필기장 · {unit.notebooks?.length ?? 0}쪽</Link><a className="btn btn-text" href={`/workbooks/${unit.id}-notebook.pdf`} download>PDF 받기 ↓</a></div>
      <div className="pilot-stats">
        <div><strong>{e.points}<small> XP</small></strong><span>도전과 해결</span></div>
        <div><strong>{e.tried}<small>/{e.total}</small></strong><span>시도한 활동</span></div>
        <div><strong>{e.repaired}</strong><span>고쳐서 해결</span></div>
        <div><strong>{e.notebooks}<small>/{unit.notebooks?.length ?? 0}</small></strong><span>필기 자기 점검</span></div>
      </div>
      <p className="pilot-stats-note">활동마다 도전 5 XP, 해결하면 5 XP를 더 받아요. XP와 화면 진도는 학습 참여 기록이에요.</p>
      {e.repaired > 0 && <p className="pilot-cheer">✦ 다시 생각하는 힘 · {e.repaired}개의 활동에서 오류를 고쳤어요.</p>}
      <details className="pilot-evidence-details"><summary>이해를 확인한 기록 보기</summary><p>활동 첫 응답 정답 {e.first}/{e.tried} · 고친 뒤 정답 {e.repaired}개. 필기는 자기 점검으로, 아래 새 자료 문제는 별도로 기록해요.</p></details>
    </section>
  );
}

export function TransferReview({ unit }: { unit: Unit }) {
  const questions = unit.review ?? [];
  const state = useProgress();
  const records = state?.units[unit.id]?.transferAnswers ?? {};
  const [index, setIndex] = useState(0);
  const tried = questions.filter((q) => !!records[q.id]).length;
  const correct = questions.filter((q) => records[q.id]?.firstCorrect).length;
  if (!questions.length) return null;
  return (
    <section className="pilot-transfer">
      <div className="pilot-section-label">다른 자료로 확인</div>
      <h2>이번에도 스스로 설명할 수 있을까?</h2>
      <p>필기와 해설을 잠시 덮고 도전해 보세요. 내일 다시 들어와 풀이를 설명해 보는 것도 좋아요.</p>
      <div className="pilot-review-nav" aria-label="새 자료 문제 선택">{questions.map((q, i) => <button className={`btn${i === index ? ' btn-primary' : ''}`} key={q.id} aria-pressed={i === index} aria-label={`새 자료 ${i + 1}${records[q.id] ? ', 응답 기록 있음' : ''}`} onClick={() => setIndex(i)}>{i + 1}{records[q.id] ? ' ✓' : ''}</button>)}</div>
      <TransferItem key={questions[index].id} unitId={unit.id} question={questions[index]} />
      <p className="small muted">첫 응답: {tried}문제 중 {correct}문제 정답 · 같은 문제 재시도는 복습으로 남겨요.</p>
    </section>
  );
}

function TransferItem({ unitId, question }: { unitId: string; question: TransferQuestion }) {
  const state = useProgress();
  const record = state?.units[unitId]?.transferAnswers?.[question.id];
  const [choice, setChoice] = useState<number | null>(record?.value ?? null);
  const [retrying, setRetrying] = useState(false);
  const submitted = !!record && !retrying;
  return (
    <div className="pilot-transfer-item">
      <h3>{question.prompt}</h3>
      <fieldset disabled={submitted}><legend className="pilot-sr-only">답을 하나 선택하세요</legend>{question.options.map((option, i) => <label className={`pilot-option${choice === i ? ' selected' : ''}`} key={option.text}><input type="radio" name={question.id} checked={choice === i} onChange={() => setChoice(i)} /><span>{option.text}</span></label>)}</fieldset>
      {!submitted && <button className="btn btn-primary" disabled={choice === null} onClick={() => { if (choice === null) return; progress.recordTransfer(unitId, question.id, choice, choice === question.correctIndex); setRetrying(false); }}>이유 확인하기</button>}
      {submitted && record && <div className={`w-feedback ${record.correct ? 'ok' : 'no'}`} role="status"><p>{question.options[record.value].feedback}</p><p>{question.explanation}</p>{!record.correct && <button className="btn" onClick={() => { setChoice(null); setRetrying(true); }}>근거를 생각하며 다시 풀기</button>}</div>}
    </div>
  );
}
