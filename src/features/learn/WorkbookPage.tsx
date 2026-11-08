import { useEffect, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { loadUnit } from '../../content/loader';
import type { NotebookSheet, Unit } from '../../content/types';
import teacherGuide from '../../../content/lessons/unit-1-1-notebook-teacher.json';
import '../../styles/workbook.css';

type TeacherNote = { misconceptions: string[]; ask: string };
const teacherNotes: Record<string, TeacherNote> = teacherGuide.sheets;

function SpectrumExample({ kind }: { kind: number }) {
  const positions = [430, 610];
  const x = (nm: number) => 12 + (nm - 400) / 300 * 156;
  return <svg className="workbook-spectrum" viewBox="0 0 180 92" role="img" aria-label={kind === 0 ? '400부터 700 나노미터까지 이어지는 연속 스펙트럼 예시' : `430과 610 나노미터에 ${kind === 1 ? '밝은' : '어두운'} 선이 있는 학습용 스펙트럼 예시`}>
    <defs><linearGradient id={`teacher-spectrum-${kind}`}><stop offset="0" stopColor="#7645db" /><stop offset=".24" stopColor="#305fdb" /><stop offset=".43" stopColor="#21b7ba" /><stop offset=".60" stopColor="#8bca4a" /><stop offset=".72" stopColor="#f4d44d" /><stop offset="1" stopColor="#ed5555" /></linearGradient></defs>
    <rect x="12" y="10" width="156" height="23" rx="2" fill={kind === 1 ? '#101d2d' : `url(#teacher-spectrum-${kind})`} />
    {kind !== 0 && positions.map((nm, i) => <g key={nm}><rect x={x(nm) - 1.5} y="10" width="3" height="23" fill={kind === 1 ? (i === 0 ? '#a993ff' : '#f7aa62') : '#182432'} /><text x={x(nm)} y="46" textAnchor="middle">{nm}</text></g>)}
    <path d="M12 57H168M12 54V60M90 54V60M168 54V60" fill="none" stroke="#65727d" />
    {[400, 550, 700].map(nm => <text key={nm} x={x(nm)} y="73" textAnchor="middle">{nm}</text>)}
    <text x="90" y="88" textAnchor="middle">파장 (nm) · 학습용 예시</text>
  </svg>;
}

export function WorkbookSheets({ unit, teacher = false }: { unit: Unit; teacher?: boolean }) {
  const sheets = unit.notebooks ?? [];
  return <div className="workbook-sheets">
    {sheets.map((sheet: NotebookSheet, index) => <article key={sheet.id} className={`workbook-sheet workbook-${sheet.layout}${teacher ? ' workbook-teacher' : ''}`} aria-labelledby={`sheet-${sheet.id}`}>
      <header className="workbook-sheet-header">
        <p className="workbook-brand">통합과학 학습실 / {teacher ? '교사용 답안 · 구조적 필기장' : '구조적 필기장'}</p>
        <p className="workbook-unit">{unit.title} · {String(index + 1).padStart(2, '0')}</p>
        <h2 id={`sheet-${sheet.id}`}>{sheet.title}</h2>
        <p className="workbook-goal"><strong>학습 목표</strong> {sheet.goal}</p>
      </header>
      <p className="workbook-instruction">{teacher ? '학생용과 같은 칸에 담은 모범 필기입니다. 표현이 달라도 핵심 관계와 조건이 같으면 인정해 주세요.' : '화면을 잠시 덮고, 핵심 관계를 내 말·그림·기호로 채워 보세요. 모르는 곳은 ?로 남겨도 괜찮아요.'}</p>
      <div className="workbook-structure">
        {sheet.sections.map((section, sectionIndex) => <section className="workbook-field" key={section.label}>
          <div className="workbook-field-prompt">
            <h3>{sheet.layout === 'sequence' || sheet.layout === 'causal' ? `${String(sectionIndex + 1).padStart(2, '0')}  ` : ''}{section.label}</h3>
            <p>{section.prompt}</p>
          </div>
          {teacher ? <div className="workbook-model">
            {sheet.id === 'u11-n1' && <SpectrumExample kind={sectionIndex} />}
            <p>{sheet.modelSections?.[sectionIndex]?.content}</p>
          </div> : <div className="workbook-writing" aria-label={`${section.label} 필기 공간`} />}
        </section>)}
      </div>
      {teacher ? <>
        <section className="workbook-teacher-check"><h3>확인 기준</h3><ul>{sheet.criteria.map(criterion => <li key={criterion}>{criterion}</li>)}</ul></section>
        <section className="workbook-teacher-guidance"><h3>흔한 오개념 · 이렇게 짚어 주세요</h3><ul>{teacherNotes[sheet.id]?.misconceptions.map(note => <li key={note}>{note}</li>)}</ul><p><strong>확인 질문</strong> {teacherNotes[sheet.id]?.ask}</p></section>
      </> : <>
        <section className="workbook-before"><h3>모범 필기를 보기 전</h3><div className="workbook-checks"><span>□ 기억에서 꺼내 적었어요</span><span>□ 관계·조건을 표시했어요</span><span>□ 확인할 곳에 ?를 남겼어요</span></div></section>
        <section className="workbook-correction"><h3>비교하고 고치기</h3><p>앱에서 ‘필기했어요’를 누른 뒤 비교해요. 다른 색으로 빠진 관계와 수정한 이유를 적어 보세요.</p><div className="workbook-writing" /></section>
        <div className="workbook-checks workbook-after"><span>□ 핵심이 같아요</span><span>□ 고쳐서 이해했어요</span><span>□ 다시 확인하고 싶어요</span></div>
      </>}
      <footer className="workbook-sheet-footer"><span>{sheet.id} · {teacher ? '교사용 답안 / 학생이 먼저 작성한 뒤 비교해 주세요.' : '제목과 목표는 이미 인쇄되어 있어요. 구조만 채우세요.'}</span><span>{index + 1} / {sheets.length}</span></footer>
    </article>)}
  </div>;
}

/** The student print view excludes answers; teacher material has an explicit separate view. */
export function WorkbookPage() {
  const { unitId = '' } = useParams();
  const [params] = useSearchParams();
  const { hash } = useLocation();
  const teacher = unitId === teacherGuide.unitId && params.get('view') === 'teacher';
  const [unit, setUnit] = useState<Unit | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    setUnit(null);
    setError(false);
    loadUnit(unitId).then((data) => { if (alive) setUnit(data); }).catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [unitId]);
  useEffect(() => {
    if (unit && hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [unit, hash, teacher]);

  if (error) return <div className="page"><p role="alert">필기장을 불러오지 못했어요.</p><Link to={`/learn/${unitId}`}>단원으로 돌아가기</Link></div>;
  if (!unit) return <div className="center-msg">필기장을 준비하고 있어요…</div>;
  const sheets = unit.notebooks ?? [];
  if (!sheets.length) return <div className="page"><h1>이 단원의 필기장은 준비 중이에요</h1><Link to={`/learn/${unitId}`}>단원으로 돌아가기</Link></div>;
  const downloadable = unitId === 'unit-1-1' || unitId === 'unit-1-2';

  return (
    <div className="workbook-page">
      <section className="workbook-toolbar" aria-label="필기장 준비">
        <Link to={`/learn/${unitId}`}>← 단원으로</Link>
        <h1>{unit.title} · {teacher ? '교사용 답안' : '구조적 필기장'}</h1>
        <p>{teacher ? `학생용 필기장과 같은 ${sheets.length}쪽에 칸별 모범 필기, 확인 기준과 오개념 지도 도움말을 담았습니다.` : `제목과 학습 목표가 인쇄된 ${sheets.length}장입니다. 필요한 쪽을 골라 인쇄하고, 내 말과 그림으로 구조만 채워 보세요.`}</p>
        <div className="workbook-actions">
          {downloadable && <a className="btn btn-primary" href={`/workbooks/${unitId}-${teacher ? 'teacher' : 'notebook'}.pdf`} download>{teacher ? 'A4 교사용 답안 PDF 내려받기' : 'A4 필기장 PDF 내려받기'}</a>}
          <button type="button" className="btn" onClick={() => window.print()}>이 화면 인쇄</button>
          {unitId === teacherGuide.unitId && <Link className="btn btn-text" to={`/workbook/${unitId}${teacher ? '' : '?view=teacher'}`}>{teacher ? '학생용 빈 필기장 보기' : '교사용 답안 보기'}</Link>}
        </div>
        <p className="workbook-print-tip">A4 · 배율 100% · 머리글/바닥글 끄기. {teacher ? '학생이 먼저 회상하여 작성하게 한 뒤 핵심 관계를 함께 비교해 주세요. 문장을 똑같이 쓰는 것이 목표는 아닙니다.' : '모범 필기는 학습 화면에서 작성 후 확인할 수 있어요.'}</p>
      </section>
      <WorkbookSheets unit={unit} teacher={teacher} />
    </div>
  );
}
