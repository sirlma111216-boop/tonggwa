import type { Activity as ActivityT } from '../../content/types';
import { progress, useProgress } from '../../services/progress/store';
import { WIDGETS } from './widgets';

const ICON: Record<string, string> = {
  cloze: '✏️', order: '🔀', reflect: '📝', sorter: '🗂️', ladder: '📏', converter: '🔁', ratio: '➗', echo: '📡', resolve: '🔬', truefalse: '⭕', ions: '🧪',
};

export function ActivityBlock({ unitId, storeKey, activity }: { unitId: string; storeKey: string; activity: ActivityT }) {
  const state = useProgress();
  const rec = state?.units[unitId]?.activities?.[storeKey];
  const Widget = WIDGETS[activity.widget];
  if (!Widget) return null;
  return (
    <section className={`activity${activity.auto ? ' auto' : ''}`} aria-label="해 보기">
      <div className="activity-head">
        <span className="activity-icon" aria-hidden="true">{ICON[activity.widget] ?? '🧩'}</span>
        <div>
          <div className="activity-kicker">해 보기</div>
          <h3 className="activity-title">{activity.title}</h3>
        </div>
        {rec && <span className={`badge ${rec.correct === false ? 'badge-warn' : 'badge-done'}`}>{rec.correct === undefined ? '완료' : rec.correct ? '성공' : '다시 보기'}</span>}
      </div>
      {activity.intro && <p className="activity-intro">{activity.intro}</p>}
      <Widget
        key={storeKey}
        props={activity.props}
        onResult={(r) => progress.recordActivity(unitId, storeKey, { done: true, correct: r.correct })}
        onNote={(line) => progress.appendNote(unitId, line)}
      />
    </section>
  );
}
