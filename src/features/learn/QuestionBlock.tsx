import type { Answer, Question } from '../../content/types';
import type { AnswerRecord } from '../../services/progress/types';
import { Markdown } from './Markdown';

const CIRCLED = ['①', '②', '③', '④', '⑤'];

interface Props {
  question: Question;
  index: number;
  draft: number | string | undefined;
  onChange: (v: number | string) => void;
  record?: AnswerRecord; // 제출된 기록
  answer?: Answer; // 제출 후 공개된 정답·해설
  onSelfMark?: (m: AnswerRecord['selfMark']) => void;
}

export function QuestionBlock({ question, index, draft, onChange, record, answer, onSelfMark }: Props) {
  const submitted = !!record;
  const value = submitted ? record.value : draft;

  return (
    <article className="q" id={`q-${question.id}`}>
      <div className="q-head">
        <span className="q-num">문항 {index}</span>
        <span className="q-id">{question.id}{question.label ? ` · ${question.label}` : ''}</span>
        {submitted && record.correct === true && <span className="badge badge-done">정답</span>}
        {submitted && record.correct === false && <span className="badge badge-bad">오답</span>}
        {submitted && record.correct === null && <span className="badge">서술형 · 자기 점검</span>}
      </div>
      <Markdown md={question.prompt} />

      {question.kind === 'choice' && question.choices ? (
        <ul className="choices">
          {question.choices.map((c, i) => {
            const selected = value === i;
            const cls = submitted && answer ? (i === answer.choiceIndex ? 'correct' : selected ? 'wrong' : '') : selected ? 'selected' : '';
            return (
              <li key={i}>
                <label className={cls}>
                  <input type="radio" name={question.id} checked={selected} disabled={submitted} onChange={() => onChange(i)} />
                  <span>
                    <span className="circ">{CIRCLED[i]}</span> {c}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      ) : submitted ? (
        <div className="student-answer">{String(value ?? '')}</div>
      ) : (
        <textarea
          placeholder="계산 과정이나 근거를 포함해 써 보세요. 쓴 내용은 이 기기에 자동 보관돼요."
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {submitted && answer && (
        <div className="q-result">
          {record.correct === true && <div className="verdict ok">✓ 맞았어요</div>}
          {record.correct === false && <div className="verdict no">✕ 정답은 {answer.key}</div>}
          {record.correct === null && (
            <div className="verdict">
              <span className="key">정답 기준: {answer.key}</span>
            </div>
          )}
          <Markdown md={answer.explanation} />
          {record.correct === null && onSelfMark && (
            <>
              <div className="small muted">내가 쓴 답을 정답 기준과 비교해 표시해요. (AI 서술 검토는 연결 전이에요)</div>
              <div className="self-mark">
                {(
                  [
                    ['ok', '맞게 썼어요'],
                    ['partial', '일부만 맞았어요'],
                    ['no', '다시 공부할게요'],
                  ] as const
                ).map(([k, label]) => (
                  <button key={k} className={`btn${record.selfMark === k ? ' on' : ''}`} onClick={() => onSelfMark(k)}>
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </article>
  );
}
