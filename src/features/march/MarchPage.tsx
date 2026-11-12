import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthUser } from '../../services/auth';
import { chooseSet, emptyJournal, latestAttempts, makeSession, recordGraded, restoreJournal } from './model';
import type { Bank, Confidence, Journal, Session, Solution } from './model';
import './march.css';

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error('자료를 불러오지 못했어요. 연결을 확인하고 다시 시도해 주세요.');
  return r.json();
}
const CIRCLED = ['①','②','③','④','⑤'];
export function MarchPage() {
  const user = useAuthUser();
  return user ? <MarchAccount key={user.uid} uid={user.uid} /> : null;
}
function MarchAccount({ uid }: { uid: string }) {
  const [bank, setBank] = useState<Bank | null>(null);
  const [journal, setJournal] = useState<Journal>(emptyJournal);
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const key = `tonggwa:march:v1:${uid}`;
  useEffect(() => {
    let alive = true;
    getJson<Bank>('/march/bank.json').then(b => {
      if (!alive) return;
      if (b.version !== 1 || !Array.isArray(b.questions) || !b.questions.length) throw new Error('문제은행 형식이 올바르지 않아요.');
      try { setJournal(restoreJournal(localStorage.getItem(key), b)); }
      catch { setStorageError('기존 기록을 읽지 못했어요. 원래 저장 자료는 유지됩니다. 이 화면의 새 기록은 임시로만 보관해요.'); }
      setBank(b); setError('');
    }).catch(e => alive && setError(String(e.message)));
    return () => { alive = false; };
  }, [key, loadAttempt]);
  function save(next: Journal) {
    setJournal(next);
    if (storageError) return;
    try { localStorage.setItem(key, JSON.stringify(next)); }
    catch { setStorageError('기기에 저장하지 못했어요. 현재 학습은 계속할 수 있지만 창을 닫으면 새 기록이 사라질 수 있어요.'); }
  }
  if (!bank) return <div className="page page-narrow"><h1>3월 모의고사 대비</h1>{error ? <><p role="alert">{error}</p><button className="btn" onClick={() => setLoadAttempt(n=>n+1)}>다시 불러오기</button></> : <p>문제은행을 불러오는 중이에요…</p>}</div>;
  const active = journal.session;
  const latest = latestAttempts(journal.attempts);
  const first = journal.attempts.filter((a,i,all) => all.findIndex(b=>b.questionId===a.questionId)===i);
  function start(ids: string[], mode: Session['mode'] = 'practice') { save({ ...journal, session: makeSession(ids, mode) }); }
  return <div className="page march-page">
    <p className="crumbs"><Link to="/">시작</Link> › <Link to="/march">3월 모의고사 대비</Link></p>
    {storageError && <p className="notice notice-warn" role="alert">{storageError}</p>}
    <p className="small muted">학습 기록은 이 계정 · 이 기기에 저장돼요.</p>
    {active ? <SessionPlayer key={active.id} bank={bank} journal={journal} save={save} close={() => save({...journal, session:null})} /> : <>
      <section className="march-hero card">
        <p className="march-eyebrow">문제부터 시작하는 중학 과학 복습</p>
        <h1>3월 모의고사 대비</h1>
        <p>5문제 풀고, 채점하면서 필요한 개념만 짚어요.<br/>이론을 먼저 읽지 않아도 괜찮아요.</p>
        <div className="march-stats"><span><strong>{bank.questions.length}</strong>선별 기출</span><span><strong>{first.length}</strong>풀어 본 문제</span><span><strong>{first.length ? `${Math.round(first.filter(a=>a.correct).length / first.length * 100)}%` : '—'}</strong>첫 풀이 정답률</span></div>
        <div className="march-actions">
          <button className="btn btn-primary" disabled={!chooseSet(bank.questions,journal,'new').length} onClick={()=>start(chooseSet(bank.questions,journal,'new'))}>새 문제 {chooseSet(bank.questions,journal,'new').length}개 풀기</button>
          <button className="btn" disabled={!chooseSet(bank.questions,journal,'review').length} onClick={()=>start(chooseSet(bank.questions,journal,'review'))}>오답·헷갈린 문제 복습</button>
        </div>
        {!chooseSet(bank.questions,journal,'new').length && <p>현재 연습 범위의 새 문제를 모두 풀었어요. 회차별로 다시 풀거나 실력 점검에 도전해 보세요.</p>}
      </section>
      <section className="card march-section">
        <h2>남겨 둔 시험으로 실력 확인하기</h2>
        <label className="march-toggle"><input type="checkbox" checked={journal.reserve} onChange={e=>save({...journal,reserve:e.target.checked})}/> 2026년 3월 25문항은 마지막 점검용으로 남겨 두기</label>
        <p className="muted">점검에서는 25문항에 모두 답한 뒤 채점해요. 이 앱에서 풀어 본 문제는 구분해 표시해요. 다른 곳에서 이미 푼 문제까지는 알 수 없어요.</p>
        <button className="btn" onClick={()=>start(bank.questions.filter(q=>q.exam==='2603').map(q=>q.id),'assessment')}>2026년 3월 실력 점검 시작</button>
      </section>
      <section className="march-section"><h2>회차별 짧은 문제 세트</h2><div className="march-rounds">
        {bank.exams.map(exam => {
          const qs=bank.questions.filter(q=>q.exam===exam.code);
          const reserved=journal.reserve && exam.code==='2603';
          return <article className="card" key={exam.code}><h3>{exam.title}</h3><p className="small muted">전체 {exam.total}문항 중 {exam.selected}문항 · {qs.filter(q=>latest[q.id]).length}문항 풀이</p>
            {reserved ? <p>실력 점검용으로 남겨 뒀어요.</p> : <div className="march-actions">{Array.from({length:Math.ceil(qs.length/5)},(_,i)=><button className="btn" key={i} onClick={()=>start(qs.slice(i*5,i*5+5).map(q=>q.id))}>{i+1}세트 · {qs.slice(i*5,i*5+5).length}문항</button>)}</div>}
          </article>;
        })}
      </div></section>
      <details className="card march-section"><summary>문제은행 · 선별 기준과 전체 검토 목록</summary>
        <p>{bank.policy}</p><p className="small muted">검토일 {bank.reviewedAt} · 6회 145문항 검토 · 중학교 복습용 57문항 · 고등 또는 혼합 88문항. 경계 문항은 현재 세트에 넣지 않았어요.</p>
        {bank.exams.map(exam=><details key={exam.code}><summary>{exam.title} · 선택 {exam.selected}문항</summary><p><a href={exam.paper} target="_blank" rel="noreferrer">원문 문제지</a> · <a href={exam.solution} target="_blank" rel="noreferrer">원문 정답·해설</a></p><div className="march-table-wrap"><table><thead><tr><th>번호</th><th>주제</th><th>분류·근거</th></tr></thead><tbody>{bank.audit.filter(q=>q.exam===exam.code).map(q=><tr key={q.id}><td>{q.number}</td><td>{q.topic}</td><td>{q.scope==='middle'?'포함':'제외'} · {q.reason}</td></tr>)}</tbody></table></div></details>)}
      </details>
    </>}
  </div>;
}

function SessionPlayer({bank,journal,save,close}:{bank:Bank;journal:Journal;save:(j:Journal)=>void;close:()=>void}) {
  const session=journal.session!;
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [solutions,setSolutions]=useState<Record<string,Solution>|null>(null);
  const [reviewIndex,setReviewIndex]=useState(0);
  const index=session.done?reviewIndex:session.index;
  const q=bank.questions.find(q=>q.id===session.ids[index])!;
  const exam=bank.exams.find(e=>e.code===q.exam)!;
  const response=session.responses[q.id];
  const reveal=session.done || (session.mode==='practice' && response?.correct!==undefined);
  const previous=journal.attempts.some(a=>a.questionId===q.id && a.sessionId!==session.id);
  useEffect(()=>{
    if (!reveal || solutions) return;
    let alive=true;
    getJson<Record<string,Solution>>('/march/answers.json').then(s=>{if(alive){setSolutions(s);setError('');}}).catch(e=>alive&&setError(e.message));
    return ()=>{alive=false;};
  },[reveal,solutions]);
  async function submit(choice:number, confidence:Confidence) {
    if(busy || response) return;
    setBusy(true);setError('');
    try {
      const next={...session,responses:{...session.responses,[q.id]:{choice,confidence,at:new Date().toISOString()}}};
      if(session.mode==='assessment') save({...journal,session:{...next,index:Math.min(session.index+1,session.ids.length-1)}});
      else {
        const s=solutions??await getJson<Record<string,Solution>>('/march/answers.json');
        const graded=recordGraded(journal,next,s);setSolutions(s);save(graded);
      }
    } catch(e) {setError(e instanceof Error?e.message:String(e));} finally{setBusy(false);}
  }
  async function finish() {
    if(busy || session.ids.some(id=>!session.responses[id])) return;
    setBusy(true);setError('');
    try {const s=solutions??await getJson<Record<string,Solution>>('/march/answers.json'); const graded=recordGraded(journal,{...session,done:true},s);setSolutions(s);save(graded);}
    catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
  }
  function check(answer:boolean) {
    if(!response || !solutions || response.checkAnswer!==undefined) return;
    save({...journal,session:{...session,responses:{...session.responses,[q.id]:{...response,checkAnswer:answer}}},attempts:journal.attempts.map(a=>a.sessionId===session.id&&a.questionId===q.id?{...a,checkAnswer:answer}:a)});
  }
  const completed=session.ids.filter(id=>session.responses[id]).length;
  return <>
    <div className="march-session-heading"><div><p className="march-eyebrow">{session.mode==='assessment'?'실력 점검 · 마지막에 채점':'문제 풀이와 개념 복습'}</p><h1>{session.done?'세트를 마쳤어요':`${index+1} / ${session.ids.length} 문제`}</h1></div><Link className="btn" to="/">저장하고 나가기</Link></div>
    <progress className="march-progress" value={completed} max={session.ids.length} aria-label="답한 문제 수" />
    {session.done && <section className="card march-section" aria-live="polite"><h2>{session.ids.filter(id=>session.responses[id].correct).length} / {session.ids.length} 정답</h2><p>이 앱에서 처음 푼 문제 {session.ids.filter(id=>!journal.attempts.some(a=>a.questionId===id&&a.sessionId!==session.id)).length}개 · 나머지는 다시 푼 문제예요. 복습까지 마친 뒤에도 첫 풀이 기록은 유지돼요.</p><div className="march-actions">{session.ids.map((id,i)=><button className={`btn ${reviewIndex===i?'btn-primary':''}`} key={id} onClick={()=>setReviewIndex(i)}>{i+1} · {session.responses[id].correct?'정답':'오답'}</button>)}<button className="btn" onClick={close}>다른 세트 고르기</button></div></section>}
    <p>{exam.title} · {q.number}번 · 원문 PDF {q.page}쪽 {previous && <span className="badge">전에 풀어 본 문제</span>}</p>
    <div className="march-workspace">
      <section className="card march-source"><h2>원문에서 {q.number}번을 풀어 주세요</h2><p className="small muted">원문 페이지에는 다른 문제도 함께 있어요. 해당 번호만 풀면 돼요.</p>
        <a className="btn" href={`${exam.paper}#page=${q.page}`} target="_blank" rel="noreferrer">원문 문제지 열기 ↗</a>
        <details key={q.id} className="march-section"><summary>이 화면에서 원문 보기</summary><iframe title={`${exam.title} 문제지 ${q.page}쪽`} src={`${exam.paper}#page=${q.page}&view=FitH`} loading="lazy" /></details>
        <p className="small muted">원문이 열리지 않으면 <a href="https://www.ebsi.co.kr/ebs/xip/xipc/previousPaperList.ebs?targetCd=D100" target="_blank" rel="noreferrer">EBSi 고1 기출문제</a>에서 해당 연도·월 과학 문제지를 열어 주세요.</p>
      </section>
      <section className="card march-answer">
        {error && <p className="notice notice-bad" role="alert">{error}</p>}
        {!response ? <AnswerForm key={q.id} submit={submit} busy={busy}/> : !reveal ? <><p>답을 저장했어요. 모든 문제에 답한 뒤 함께 채점해요.</p><div className="march-actions">{session.ids.map((id,i)=><button className="btn" key={id} onClick={()=>save({...journal,session:{...session,index:i}})}>{i+1}{session.responses[id]?' ✓':''}</button>)}</div><button className="btn btn-primary" disabled={busy||completed!==session.ids.length} onClick={finish}>전체 제출하고 채점하기</button></> : solutions?.[q.id] ? <>
          <div className={`notice ${response.correct?'notice-ok':'notice-bad'}`} role="status">내 답 {CIRCLED[response.choice-1]} · 정답 {CIRCLED[solutions[q.id].answer-1]} · {response.correct?'맞았어요':'다시 짚어 볼까요?'}</div>
          {response.correct && response.confidence!=='sure' && <p>맞았지만 헷갈렸거나 찍었다고 표시해서 복습 목록에 남겨 둘게요.</p>}
          <h2>{solutions[q.id].title}</h2><p>{solutions[q.id].idea}</p><p className="march-hint"><strong>이 문제를 다시 볼 때</strong><br/>{solutions[q.id].hint}</p><p><strong>헷갈리지 않기</strong><br/>{solutions[q.id].trap}</p>
          <fieldset className="march-check"><legend>10초 확인 · 개념 O/X</legend><p>{solutions[q.id].check}</p><div className="march-actions">{[true,false].map(v=><button className="btn" disabled={response.checkAnswer!==undefined} key={String(v)} onClick={()=>check(v===solutions[q.id].correct)}>{v?'맞다':'아니다'}</button>)}</div>{response.checkAnswer!==undefined&&<p role="status">{response.checkAnswer?'잘 짚었어요.':'한 번 더 확인해요.'} {solutions[q.id].feedback}</p>}</fieldset>
          <p className="small"><a href={exam.solution} target="_blank" rel="noreferrer">공식 정답·해설에서 {q.number}번 확인 ↗</a></p>
          {!session.done && <button className="btn btn-primary" disabled={response.checkAnswer===undefined} onClick={()=>session.index===session.ids.length-1?finish():save({...journal,session:{...session,index:session.index+1}})}>{session.index===session.ids.length-1?'세트 결과 보기':'다음 문제'}</button>}
        </> : <><p>복습 설명을 불러오는 중이에요…</p><button className="btn" onClick={()=>getJson<Record<string,Solution>>('/march/answers.json').then(s=>{setSolutions(s);setError('');}).catch(e=>setError(e.message))}>다시 불러오기</button></>}
      </section>
    </div>
  </>;
}
function AnswerForm({submit,busy}:{submit:(choice:number,confidence:Confidence)=>void;busy:boolean}) {
  const [choice,setChoice]=useState<number|null>(null);
  const [confidence,setConfidence]=useState<Confidence|null>(null);
  return <form onSubmit={e=>{e.preventDefault();if(choice&&confidence)submit(choice,confidence);}}><fieldset><legend>답 고르기</legend><div className="march-choices">{CIRCLED.map((label,i)=><label key={label} className={choice===i+1?'selected':''}><input type="radio" name="answer" checked={choice===i+1} onChange={()=>setChoice(i+1)} disabled={busy}/>{label}</label>)}</div></fieldset><fieldset><legend>얼마나 확실한가요?</legend><div className="march-confidence">{([['sure','근거를 알아요'],['unsure','헷갈려요'],['guess','찍었어요']] as const).map(([value,label])=><label key={value}><input type="radio" name="confidence" checked={confidence===value} onChange={()=>setConfidence(value)} disabled={busy}/>{label}</label>)}</div></fieldset><button className="btn btn-primary" disabled={!choice||!confidence||busy}>{busy?'처리 중…':'답 제출하기'}</button></form>;
}
