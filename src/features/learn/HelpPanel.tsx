import { useEffect, useState } from 'react';
import type { Unit } from '../../content/types';
import { progress, useProgress } from '../../services/progress/store';

const MIDDLE_LABEL: Record<string, string> = {
  '1': '중1', '2': '중2', '3': '중3', '2old': '중2(2015)',
};

function middleUnitLabel(id: string) {
  const [g, u] = id.split(':');
  return `${MIDDLE_LABEL[g] ?? g} ${u}`;
}

export function HelpPanel({ unit }: { unit: Unit }) {
  const [tab, setTab] = useState<'help' | 'note'>('help');
  const state = useProgress();
  const saved = state?.units[unit.id]?.note ?? '';
  const [note, setNote] = useState(saved);
  useEffect(() => setNote(saved), [unit.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <aside className="side">
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'help'} className={tab === 'help' ? 'on' : ''} onClick={() => setTab('help')}>개념 도움</button>
        <button role="tab" aria-selected={tab === 'note'} className={tab === 'note' ? 'on' : ''} onClick={() => setTab('note')}>내 노트</button>
      </div>
      {tab === 'help' ? (
        <div className="stack">
          <div className="card">
            <h3>꼭 알아야 할 선수개념</h3>
            {unit.prerequisite ? (
              <>
                <p><strong>{unit.prerequisite.topic}</strong></p>
                <p>{unit.prerequisite.summary}</p>
                <p className="small muted">연결된 중학교 단원</p>
                <ul className="mid-list">
                  {unit.prerequisite.middleUnits.map((m) => <li key={m}>{middleUnitLabel(m)}</li>)}
                </ul>
                {unit.prerequisite.boundary && <p className="small muted" style={{ marginTop: 10 }}>범위: {unit.prerequisite.boundary}</p>}
              </>
            ) : (
              <p className="small muted">이 묶음은 앞 단원(운동량과 충격량)의 선수개념을 그대로 써요.</p>
            )}
          </div>
          <div className="card">
            <h3>막혔을 때</h3>
            <p className="small muted" style={{ margin: 0 }}>
              선개념 단계의 ‘막혔다면 여기부터 읽어요’ 문단과 해설의 ‘돌아갈 개념’ 안내를 따라 해당 설명으로 돌아가세요. 정답을 본 문제를 다시 맞힌 것은 새로운 이해의 증거로 세지 않아요.
            </p>
          </div>
        </div>
      ) : (
        <div className="card">
          <h3>내 말로 정리</h3>
          <p className="small muted">이 단원에서 이해한 것, 헷갈린 조건, 다시 볼 설명을 적어 두세요.</p>
          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              progress.setNote(unit.id, e.target.value);
            }}
          />
          <div className="note-state">{note === saved ? (saved ? '저장됨 · 이 기기' : '아직 쓴 내용이 없어요') : '저장 중…'}</div>
        </div>
      )}
    </aside>
  );
}
