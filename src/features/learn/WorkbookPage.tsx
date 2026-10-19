import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadUnit } from '../../content/loader';
import type { Unit } from '../../content/types';
import '../../styles/workbook.css';

/** Student print view deliberately excludes all model answers and criteria. */
export function WorkbookPage() {
  const { unitId = '' } = useParams();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    setUnit(null);
    setError(false);
    loadUnit(unitId).then((data) => { if (alive) setUnit(data); }).catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [unitId]);

  if (error) return <div className="page"><p role="alert">필기장을 불러오지 못했어요.</p><Link to={`/learn/${unitId}`}>단원으로 돌아가기</Link></div>;
  if (!unit) return <div className="center-msg">필기장을 준비하고 있어요…</div>;
  const sheets = unit.notebooks ?? [];
  if (!sheets.length) return <div className="page"><h1>이 단원의 필기장은 준비 중이에요</h1><Link to={`/learn/${unitId}`}>단원으로 돌아가기</Link></div>;
  const downloadable = unitId === 'unit-1-1' || unitId === 'unit-1-2';

  return (
    <div className="workbook-page">
      <section className="workbook-toolbar" aria-label="필기장 준비">
        <Link to={`/learn/${unitId}`}>← 단원으로</Link>
        <h1>{unit.title} · 구조적 필기장</h1>
        <p>제목과 학습 목표가 인쇄된 {sheets.length}장입니다. 필요한 쪽을 골라 인쇄하고, 내 말과 그림으로 구조만 채워 보세요.</p>
        <div className="workbook-actions">
          {downloadable && <a className="btn btn-primary" href={`/workbooks/${unitId}-notebook.pdf`} download>A4 필기장 PDF 내려받기</a>}
          <button type="button" className="btn" onClick={() => window.print()}>이 화면 인쇄</button>
        </div>
        <p className="workbook-print-tip">A4 · 배율 100% · 머리글/바닥글 끄기. 모범 필기는 학습 화면에서 작성 후 확인할 수 있어요.</p>
      </section>
      <div className="workbook-sheets">
        {sheets.map((sheet, index) => (
          <article key={sheet.id} className={`workbook-sheet workbook-${sheet.layout}`} aria-labelledby={`sheet-${sheet.id}`}>
            <header className="workbook-sheet-header">
              <p className="workbook-brand">통합과학 학습실 / 구조적 필기장</p>
              <p className="workbook-unit">{unit.title} · {String(index + 1).padStart(2, '0')}</p>
              <h2 id={`sheet-${sheet.id}`}>{sheet.title}</h2>
              <p className="workbook-goal"><strong>학습 목표</strong> {sheet.goal}</p>
            </header>
            <p className="workbook-instruction">화면을 잠시 덮고, 핵심 관계를 내 말·그림·기호로 채워 보세요. 모르는 곳은 ?로 남겨도 괜찮아요.</p>
            <div className="workbook-structure">
              {sheet.sections.map((section, sectionIndex) => (
                <section className="workbook-field" key={section.label}>
                  <div className="workbook-field-prompt">
                    <h3>{sheet.layout === 'sequence' || sheet.layout === 'causal' ? `${String(sectionIndex + 1).padStart(2, '0')}  ` : ''}{section.label}</h3>
                    <p>{section.prompt}</p>
                  </div>
                  <div className="workbook-writing" aria-label={`${section.label} 필기 공간`} />
                </section>
              ))}
            </div>
            <section className="workbook-before">
              <h3>모범 필기를 보기 전</h3>
              <div className="workbook-checks"><span>□ 기억에서 꺼내 적었어요</span><span>□ 관계·조건을 표시했어요</span><span>□ 확인할 곳에 ?를 남겼어요</span></div>
            </section>
            <section className="workbook-correction">
              <h3>비교하고 고치기</h3>
              <p>앱에서 ‘필기했어요’를 누른 뒤 비교해요. 다른 색으로 빠진 관계와 수정한 이유를 적어 보세요.</p>
              <div className="workbook-writing" />
            </section>
            <div className="workbook-checks workbook-after"><span>□ 핵심이 같아요</span><span>□ 고쳐서 이해했어요</span><span>□ 다시 확인하고 싶어요</span></div>
            <footer className="workbook-sheet-footer"><span>{sheet.id} · 제목과 목표는 이미 인쇄되어 있어요. 구조만 채우세요.</span><span>{index + 1} / {sheets.length}</span></footer>
          </article>
        ))}
      </div>
    </div>
  );
}
