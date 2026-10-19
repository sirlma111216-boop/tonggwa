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
    <section className={`activity${activity.auto ? ' auto' : ''}`} aria-label={activity.title}>
      <div className="activity-head">
        <span className="activity-icon" aria-hidden="true">{ICON[activity.widget] ?? '🧩'}</span>
        <div>
          <div className="activity-kicker">해 보기</div>
          <h3 className="activity-title">{activity.title}</h3>
        </div>
        {rec && <span className={`badge ${rec.correct === false ? 'badge-warn' : 'badge-done'}`}>{rec.correct === undefined ? '활동 기록' : rec.correct ? rec.firstCorrect === false ? '고쳐서 해결' : '해결했어요' : '다시 살펴봐요'}</span>}
      </div>
      {activity.intro && <p className="activity-intro">{activity.intro}</p>}
      <Widget
        key={storeKey}
        props={activity.props}
        savedState={state?.units[unitId]?.activityDrafts?.[storeKey]}
        onState={(draft) => progress.saveActivityDraft(unitId, storeKey, draft)}
        onResult={(r) => progress.recordActivity(unitId, storeKey, { done: true, correct: r.correct })}
        onNote={(line) => progress.appendNote(unitId, line)}
      />
    </section>
  );
}
