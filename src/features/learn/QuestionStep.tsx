import { useEffect, useState } from 'react';
import type { Answer, Question } from '../../content/types';
import type { AnswerRecord } from '../../services/progress/types';
import { Markdown } from './Markdown';

const CIRCLED = ['①', '②', '③', '④', '⑤'];

interface Props {
  question: Question;
  number: number;
  total: number;
  record?: AnswerRecord;
  answer?: Answer;
  onCheck: (value: number | string) => Promise<void>;
  onSelfMark: (m: AnswerRecord['selfMark']) => void;
  /** 부모가 상태를 알 수 있도록: 응답 가능 여부와 확인 함수를 올려 보낸다 */
  bind: (api: { canCheck: boolean; check: () => void }) => void;
}

/** 한 화면에 한 문항. 답을 고르고 ‘확인’을 누르면 바로 채점·해설이 열린다. */
export function QuestionStep({ question, number, total, record, answer, onCheck, onSelfMark, bind }: Props) {
  const [choice, setChoice] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const checked = !!record;

  useEffect(() => {
    setChoice(null);
    setText('');
  }, [question.id]);

  const canCheck = !checked && !busy && (question.kind === 'choice' ? choice !== null : text.trim().length > 0);
  const check = async () => {
    if (!canCheck) return;
    setBusy(true);
    await onCheck(question.kind === 'choice' ? (choice as number) : text);
    setBusy(false);
  };
  useEffect(() => bind({ canCheck, check }));

  // 숫자 키 1~5로 선지 선택
  useEffect(() => {
    if (checked || question.kind !== 'choice') return;
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      const n = Number(e.key);
      if (n >= 1 && n <= (question.choices?.length ?? 0)) setChoice(n - 1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [checked, question]);

  const chosen = checked ? (record.value as number) : choice;

  return (
    <div className="step-q">
      <div className="step-kicker">
        <span className="badge">문항 {number} / {total}</span>
        <span className="muted small">{question.id}{question.label ? ` · ${question.label}` : ''}</span>
      </div>
      <Markdown md={question.prompt} />

      {question.kind === 'choice' && question.choices ? (
        <ul className="choices choices-lg" role="radiogroup" aria-label="선택지">
          {question.choices.map((c, i) => {
            const selected = chosen === i;
            const cls = checked && answer ? (i === answer.choiceIndex ? 'correct' : selected ? 'wrong' : 'dim') : selected ? 'selected' : '';
            return (
              <li key={i}>
                <label className={cls}>
                  <input type="radio" name={question.id} checked={selected} disabled={checked} onChange={() => setChoice(i)} />
                  <span>
                    <span className="circ">{CIRCLED[i]}</span> {c}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      ) : checked ? (
        <div className="student-answer">
          <div className="small muted" style={{ marginBottom: 4 }}>내가 쓴 답</div>
          {String(record.value ?? '')}
        </div>
      ) : (
        <textarea
          autoFocus
          placeholder="답과 근거를 써 보세요. 계산이 있으면 과정도 함께 적어요."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      )}

      {checked && answer && (
        <div className={`feedback ${record.correct === true ? 'ok' : record.correct === false ? 'no' : 'neutral'}`} role="status">
          <div className="feedback-head">
            {record.correct === true && <span>✓ 정답이에요</span>}
            {record.correct === false && <span>✕ 아쉬워요. 정답은 {answer.key}</span>}
            {record.correct === null && <span>정답 기준 · {answer.key}</span>}
          </div>
          <Markdown md={answer.explanation} />
          {record.correct === null && (
            <div className="self-mark-wrap">
              <div className="small">내가 쓴 답을 정답 기준과 비교해서 표시해 주세요. (AI 서술 검토는 연결 전이에요)</div>
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
