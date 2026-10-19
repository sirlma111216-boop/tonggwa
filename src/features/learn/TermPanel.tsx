import type { StageKey, Unit } from '../../content/types';
import { Markdown } from './Markdown';

const STAGE_LABEL: Record<StageKey, string> = {
  prerequisite: '선개념', concept: '개념', concept_check: '개념평가', advanced: '심화개념', advanced_check: '심화평가', strategy: '수능대비 전략', exam_check: '수능대비평가',
};

interface Props {
  unit: Unit;
  term: string;
  onGo: (stageKey: StageKey, step: number) => void;
  onClose: () => void;
}

export function TermPanel({ unit, term, onGo, onClose }: Props) {
  const g = unit.glossary[term];
  const extra = unit.glossaryExtra?.[term];
  const links = unit.links?.[term] ?? [];
  const deeper = (g?.mentions ?? []).filter((m) => m.stageKey === 'advanced' || m.stageKey === 'strategy');
  const basic = (g?.mentions ?? []).filter((m) => m.stageKey !== 'advanced' && m.stageKey !== 'strategy');
  const q = encodeURIComponent(term);
  return (
    <aside className="side term-panel">
      <div className="term-head">
        <span className="badge badge-done">용어</span>
        <h3>{term}</h3>
        <button className="btn btn-text" onClick={onClose} aria-label="닫기">✕</button>
      </div>
      {g?.definition ? (
        <div className="callout def compact">
          <div className="callout-label">정의</div>
          <div className="callout-body">{g.definition}</div>
        </div>
      ) : (
        <p className="small muted">이 단원 본문에서 강조한 용어예요. 아래 문장에서 어떻게 쓰였는지 확인해 보세요.</p>
      )}
      {extra && (
        <div className="card compact">
          <h4>조금 더 설명하면</h4>
          <Markdown md={extra} plain />
        </div>
      )}
      {basic.length > 0 && (
        <div className="card compact">
          <h4>이 단원에서 이렇게 쓰여요</h4>
          <ul className="mention-list">
            {basic.map((m, i) => (
              <li key={i}>
                <p>{m.sentence}</p>
                <button className="btn btn-text small" onClick={() => onGo(m.stageKey, m.step)}>
                  {STAGE_LABEL[m.stageKey]} · {m.title} →
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {(deeper.length > 0 || g?.definedAt?.stageKey === 'advanced') && (
        <div className="card compact">
          <h4>더 깊이</h4>
          <ul className="mention-list">
            {deeper.map((m, i) => (
              <li key={i}>
                <p>{m.sentence}</p>
                <button className="btn btn-text small" onClick={() => onGo(m.stageKey, m.step)}>
                  {STAGE_LABEL[m.stageKey]} · {m.title} →
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {unit.prerequisite && (
        <div className="card compact">
          <h4>연결되는 중학교 개념</h4>
          <p className="small">{unit.prerequisite.summary}</p>
        </div>
      )}
      <div className="card compact">
        <h4>밖에서 더 찾아보기</h4>
        <ul className="link-list">
          {links.map((l) => (
            <li key={l.url}><a href={l.url} target="_blank" rel="noreferrer">{l.label} ↗</a></li>
          ))}
          <li><a href={`https://ko.wikipedia.org/w/index.php?search=${q}`} target="_blank" rel="noreferrer">위키백과에서 ‘{term}’ 검색 ↗</a></li>
          <li><a href={`https://terms.naver.com/search.naver?query=${q}`} target="_blank" rel="noreferrer">네이버 지식백과에서 ‘{term}’ 검색 ↗</a></li>
        </ul>
        <p className="small muted" style={{ margin: '6px 0 0' }}>외부 자료는 이 교재의 설명 범위와 다를 수 있어요. 정의와 조건은 교재 본문을 기준으로 해요.</p>
      </div>
    </aside>
  );
}
