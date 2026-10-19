/* 개념 카드 아래에 붙는 상호작용 활동 위젯들.
   모든 위젯은 { props, onResult } 를 받고, 학생이 확인을 누르면 onResult({correct}) 를 호출한다. */
import { useMemo, useState, type ReactElement } from 'react';

export type WidgetResult = { correct?: boolean };
interface W<P> {
  props: P;
  onResult: (r: WidgetResult) => void;
  onNote?: (line: string) => void;
}

const fmt = (n: number) => {
  if (n === 0) return '0';
  const a = Math.abs(n);
  if (a >= 1e6 || a < 1e-3) {
    const e = Math.floor(Math.log10(a));
    const m = n / 10 ** e;
    return `${Number(m.toPrecision(3))} × 10${sup(e)}`;
  }
  return String(Number(n.toPrecision(6)));
};
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (e: number) => (e < 0 ? '⁻' : '') + String(Math.abs(e)).split('').map((d) => SUP[Number(d)]).join('');
const near = (a: number, b: number) => Math.abs(a - b) <= Math.max(1e-9, Math.abs(b) * 0.01);
const parseNum = (s: string) => Number(s.replace(/,/g, '').replace(/\s/g, ''));

/* ---------- 빈칸 채우기 ---------- */
export function Cloze({ props, onResult }: W<{ sentence: string; answer: string; choices: string[] }>) {
  const [pick, setPick] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const ok = pick === props.answer;
  const [before, after] = props.sentence.split('____');
  return (
    <div className="w">
      <p className="w-sentence">
        {before}
        <span className={`blank${checked ? (ok ? ' ok' : ' no') : pick ? ' filled' : ''}`}>{pick ?? '　　　'}</span>
        {after}
      </p>
      <div className="chips">
        {props.choices.map((c) => (
          <button key={c} className={`chip${pick === c ? ' on' : ''}`} disabled={checked} onClick={() => setPick(c)}>{c}</button>
        ))}
      </div>
      {!checked ? (
        <button className="btn btn-primary" disabled={!pick} onClick={() => { setChecked(true); onResult({ correct: ok }); }}>확인</button>
      ) : (
        <div className={`w-feedback ${ok ? 'ok' : 'no'}`}>{ok ? '맞았어요!' : `정답은 ‘${props.answer}’예요. 본문에서 다시 찾아보세요.`}</div>
      )}
    </div>
  );
}

/* ---------- 순서 맞추기 ---------- */
export function Order({ props, onResult }: W<{ items: string[]; answer: string[]; hint?: string }>) {
  const [items, setItems] = useState(props.items);
  const [checked, setChecked] = useState(false);
  const ok = items.every((x, i) => x === props.answer[i]);
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  };
  return (
    <div className="w">
      {props.hint && <p className="small muted">{props.hint}</p>}
      <ol className="order-list">
        {items.map((it, i) => (
          <li key={it} className={checked ? (it === props.answer[i] ? 'ok' : 'no') : ''}>
            <span className="step-no">{i + 1}</span>
            <span className="order-text">{it}</span>
            {!checked && (
              <span className="order-btns">
                <button className="btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="위로">↑</button>
                <button className="btn" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="아래로">↓</button>
              </span>
            )}
          </li>
        ))}
      </ol>
      {!checked ? (
        <button className="btn btn-primary" onClick={() => { setChecked(true); onResult({ correct: ok }); }}>확인</button>
      ) : (
        <div className={`w-feedback ${ok ? 'ok' : 'no'}`}>
          {ok ? '순서가 맞아요!' : (
            <>
              올바른 순서예요:
              <ol className="order-answer">{props.answer.map((a) => <li key={a}>{a}</li>)}</ol>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- 내 말로 한 줄 ---------- */
export function Reflect({ props, onResult, onNote }: W<{ prompt: string; placeholder?: string }>) {
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  return (
    <div className="w">
      <p>{props.prompt}</p>
      <textarea rows={2} placeholder={props.placeholder} value={text} onChange={(e) => setText(e.target.value)} disabled={saved} />
      {!saved ? (
        <button className="btn btn-primary" disabled={text.trim().length < 2} onClick={() => { setSaved(true); onNote?.(`• ${text.trim()}`); onResult({}); }}>내 노트에 저장</button>
      ) : (
        <div className="w-feedback ok">내 노트에 저장했어요. 오른쪽 ‘도움 · 노트’에서 볼 수 있어요.</div>
      )}
    </div>
  );
}

/* ---------- 분류 상자 ---------- */
export function Sorter({ props, onResult }: W<{ bins: { id: string; label: string }[]; items: { text: string; bin: string }[]; explain?: string }>) {
  const [assign, setAssign] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const allSet = props.items.every((_, i) => assign[i]);
  const okCount = props.items.filter((it, i) => assign[i] === it.bin).length;
  return (
    <div className="w">
      <ul className="sorter">
        {props.items.map((it, i) => {
          const res = checked ? (assign[i] === it.bin ? 'ok' : 'no') : '';
          return (
            <li key={i} className={res}>
              <span className="sorter-text">{it.text}</span>
              <span className="seg">
                {props.bins.map((b) => (
                  <button key={b.id} className={`seg-btn${assign[i] === b.id ? ' on' : ''}`} disabled={checked} onClick={() => setAssign({ ...assign, [i]: b.id })}>{b.label}</button>
                ))}
              </span>
              {checked && assign[i] !== it.bin && <span className="small muted">→ {props.bins.find((b) => b.id === it.bin)?.label}</span>}
            </li>
          );
        })}
      </ul>
      {!checked ? (
        <button className="btn btn-primary" disabled={!allSet} onClick={() => { setChecked(true); onResult({ correct: okCount === props.items.length }); }}>확인</button>
      ) : (
        <div className={`w-feedback ${okCount === props.items.length ? 'ok' : 'no'}`}>
          {okCount}/{props.items.length} 맞았어요. {props.explain}
        </div>
      )}
    </div>
  );
}

/* ---------- 규모 사다리 (로그 눈금) ---------- */
export function Ladder({ props, onResult }: W<{ unit: string; items: { label: string; meters: number; note?: string }[]; question?: { prompt: string; answer: string } }>) {
  const items = useMemo(() => [...props.items].sort((a, b) => a.meters - b.meters), [props.items]);
  const minE = Math.floor(Math.log10(items[0].meters));
  const maxE = Math.ceil(Math.log10(items[items.length - 1].meters));
  const [e, setE] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const nearest = items.reduce((best, it) => (Math.abs(Math.log10(it.meters) - e) < Math.abs(Math.log10(best.meters) - e) ? it : best), items[0]);
  const ok = pick === props.question?.answer;
  return (
    <div className="w">
      <div className="ladder">
        <input type="range" min={minE} max={maxE} step={1} value={e} onChange={(ev) => setE(Number(ev.target.value))} aria-label="규모 눈금" />
        <div className="ladder-read">
          <span className="calc">10{sup(e)} {props.unit}</span>
          <span className="muted">가장 가까운 대상: <strong>{nearest.label}</strong> ({fmt(nearest.meters)} {props.unit})</span>
        </div>
        <ol className="ladder-list">
          {items.map((it) => (
            <li key={it.label} className={it === nearest ? 'on' : ''}>
              <span className="ladder-exp">10{sup(Math.round(Math.log10(it.meters)))}</span>
              <span>{it.label}</span>
            </li>
          ))}
        </ol>
      </div>
      {props.question && (
        <div className="w-q">
          <p>{props.question.prompt}</p>
          <div className="chips">
            {items.map((it) => (
              <button key={it.label} className={`chip${pick === it.label ? ' on' : ''}`} disabled={checked} onClick={() => setPick(it.label)}>{it.label}</button>
            ))}
          </div>
          {!checked ? (
            <button className="btn btn-primary" disabled={!pick} onClick={() => { setChecked(true); onResult({ correct: ok }); }}>확인</button>
          ) : (
            <div className={`w-feedback ${ok ? 'ok' : 'no'}`}>{ok ? '맞았어요! 눈금 다섯 칸 차이가 10⁵배예요.' : `정답은 ‘${props.question.answer}’예요. 사다리에서 눈금 차이를 세어 보세요.`}</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- 단위 변환기 ---------- */
const PREFIX: Record<'length' | 'time', { base: string; units: { u: string; f: number }[] }> = {
  length: { base: 'm', units: [{ u: 'km', f: 1e3 }, { u: 'm', f: 1 }, { u: 'cm', f: 1e-2 }, { u: 'mm', f: 1e-3 }, { u: 'μm', f: 1e-6 }, { u: 'nm', f: 1e-9 }] },
  time: { base: 's', units: [{ u: 's', f: 1 }, { u: 'ms', f: 1e-3 }, { u: 'μs', f: 1e-6 }] },
};
export function Converter({ props, onResult }: W<{ quantity: 'length' | 'time'; challenges: { prompt: string; value: number; from: string; to: string; answer: number }[] }>) {
  const table = PREFIX[props.quantity];
  const [val, setVal] = useState('1');
  const [from, setFrom] = useState(table.units[Math.min(2, table.units.length - 1)].u);
  const [to, setTo] = useState(table.units[table.units.length - 1].u);
  const f = (u: string) => table.units.find((x) => x.u === u)!.f;
  const v = parseNum(val);
  const out = Number.isFinite(v) ? (v * f(from)) / f(to) : NaN;
  const [answers, setAnswers] = useState<string[]>(props.challenges.map(() => ''));
  const [checked, setChecked] = useState(false);
  const results = props.challenges.map((c, i) => near(parseNum(answers[i]), c.answer));
  return (
    <div className="w">
      <div className="conv">
        <input type="text" inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} aria-label="값" />
        <select value={from} onChange={(e) => setFrom(e.target.value)} aria-label="원래 단위">{table.units.map((u) => <option key={u.u}>{u.u}</option>)}</select>
        <span>→</span>
        <select value={to} onChange={(e) => setTo(e.target.value)} aria-label="바꿀 단위">{table.units.map((u) => <option key={u.u}>{u.u}</option>)}</select>
        <span className="calc conv-out">{Number.isFinite(out) ? `${fmt(out)} ${to}` : '?'}</span>
      </div>
      <p className="small muted">
        풀이: 1 {from} = {fmt(f(from) / f(to))} {to} 이므로 {Number.isFinite(v) ? fmt(v) : '?'} × {fmt(f(from) / f(to))} = {Number.isFinite(out) ? fmt(out) : '?'} {to}. 단위가 작아질수록 수치는 커져요.
      </p>
      <ul className="w-challenges">
        {props.challenges.map((c, i) => (
          <li key={i} className={checked ? (results[i] ? 'ok' : 'no') : ''}>
            <span>{c.prompt}</span>
            <span className="ans-in">
              <input type="text" inputMode="decimal" value={answers[i]} disabled={checked} onChange={(e) => setAnswers(answers.map((a, j) => (j === i ? e.target.value : a)))} aria-label="답" />
              <span>{c.to}</span>
            </span>
            {checked && !results[i] && <span className="small muted">정답 {fmt(c.answer)} {c.to}</span>}
          </li>
        ))}
      </ul>
      {!checked ? (
        <button className="btn btn-primary" disabled={answers.some((a) => !a.trim())} onClick={() => { setChecked(true); onResult({ correct: results.every(Boolean) }); }}>확인</button>
      ) : (
        <div className={`w-feedback ${results.every(Boolean) ? 'ok' : 'no'}`}>{results.filter(Boolean).length}/{results.length} 맞았어요.</div>
      )}
    </div>
  );
}

/* ---------- 두 값의 비 ---------- */
export function Ratio({ props, onResult }: W<{ a: { label: string; value: number; unit: string }; b: { label: string; value: number; unit: string }; baseUnit: string; aBase: number; bBase: number; ratio: number; ratioPrompt: string }>) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [r, setR] = useState('');
  const [checked, setChecked] = useState(false);
  const okA = near(parseNum(a), props.aBase);
  const okB = near(parseNum(b), props.bBase);
  const okR = near(parseNum(r), props.ratio);
  const all = okA && okB && okR;
  return (
    <div className="w">
      <ol className="steps">
        <li><span className="step-no">1</span><span>같은 종류의 양인지 확인해요. {props.a.label} = {props.a.value} {props.a.unit}, {props.b.label} = {props.b.value} {props.b.unit}, 둘 다 길이예요.</span></li>
        <li><span className="step-no">2</span>
          <span className="ans-row">단위를 {props.baseUnit}로 맞춰요.
            <span className="ans-in"><span>{props.a.label} =</span><input type="text" inputMode="decimal" value={a} disabled={checked} onChange={(e) => setA(e.target.value)} className={checked ? (okA ? 'ok' : 'no') : ''} /><span>{props.baseUnit}</span></span>
            <span className="ans-in"><span>{props.b.label} =</span><input type="text" inputMode="decimal" value={b} disabled={checked} onChange={(e) => setB(e.target.value)} className={checked ? (okB ? 'ok' : 'no') : ''} /><span>{props.baseUnit}</span></span>
          </span>
        </li>
        <li><span className="step-no">3</span>
          <span className="ans-row">{props.ratioPrompt}
            <span className="ans-in"><input type="text" inputMode="decimal" value={r} disabled={checked} onChange={(e) => setR(e.target.value)} className={checked ? (okR ? 'ok' : 'no') : ''} /><span>배</span></span>
          </span>
        </li>
      </ol>
      {!checked ? (
        <button className="btn btn-primary" disabled={!a || !b || !r} onClick={() => { setChecked(true); onResult({ correct: all }); }}>확인</button>
      ) : (
        <div className={`w-feedback ${all ? 'ok' : 'no'}`}>
          {all ? '세 칸 모두 맞았어요!' : `정답: ${props.a.label} = ${props.aBase} ${props.baseUnit}, ${props.b.label} = ${props.bBase} ${props.baseUnit}, 비 = ${props.ratio}. 원래 적힌 숫자끼리 비교하면 판단이 뒤집혀요.`}
        </div>
      )}
    </div>
  );
}

/* ---------- 반향 거리 ---------- */
export function Echo({ props, onResult }: W<{ speed: number; speedLabel: string; tMin: number; tMax: number; tStep: number; tFormat?: 'micro'; challenge: { t: number; prompt: string; answer: number } }>) {
  const [t, setT] = useState(props.tMin);
  const [ans, setAns] = useState('');
  const [checked, setChecked] = useState(false);
  const ok = near(parseNum(ans), props.challenge.answer);
  const tf = (x: number) => (props.tFormat === 'micro' ? `${Number((x * 1e6).toPrecision(3))} μs` : `${Number(x.toPrecision(3))} s`);
  const round = props.speed * t;
  const frac = (t - props.tMin) / (props.tMax - props.tMin);
  return (
    <div className="w">
      <div className="echo">
        <div className="echo-scene" aria-hidden="true">
          <div className="echo-dev">장치</div>
          <div className="echo-beam" style={{ width: `${20 + frac * 70}%` }}><span className="echo-ball" /></div>
          <div className="echo-wall">반사면</div>
        </div>
        <input type="range" min={props.tMin} max={props.tMax} step={props.tStep} value={t} onChange={(e) => setT(Number(e.target.value))} aria-label="왕복 시간" />
        <div className="echo-read">
          <span className="muted">{props.speedLabel}</span>
          <span>왕복 시간 <strong>{tf(t)}</strong></span>
          <span className="calc">왕복 거리 = {fmt(props.speed)} × {tf(t)} = {fmt(round)} m</span>
          <span className="calc">편도 거리 = {fmt(round)} ÷ 2 = <strong>{fmt(round / 2)} m</strong></span>
        </div>
      </div>
      <div className="w-q">
        <p>{props.challenge.prompt}</p>
        <span className="ans-in"><input type="text" inputMode="decimal" value={ans} disabled={checked} onChange={(e) => setAns(e.target.value)} /><span>m</span></span>
        {!checked ? (
          <button className="btn btn-primary" disabled={!ans.trim()} onClick={() => { setChecked(true); onResult({ correct: ok }); }}>확인</button>
        ) : (
          <div className={`w-feedback ${ok ? 'ok' : 'no'}`}>{ok ? '맞았어요! 왕복이므로 2로 나눈 것이 핵심이에요.' : `정답은 ${props.challenge.answer} m예요. 속력 × 시간은 왕복 거리이고, 편도는 그 절반이에요.`}</div>
        )}
      </div>
    </div>
  );
}

/* ---------- 두 점 분해능 ---------- */
export function Resolve({ props, onResult }: W<{ gapMin: number; gapMax: number; gapStep: number; gapStart: number; unit: string; devices: { name: string; min: number }[]; question: { prompt: string; answer: string; why: string } }>) {
  const [gap, setGap] = useState(props.gapStart);
  const [pick, setPick] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const ok = pick === props.question.answer;
  return (
    <div className="w">
      <div className="resolve">
        <input type="range" min={props.gapMin} max={props.gapMax} step={props.gapStep} value={gap} onChange={(e) => setGap(Number(e.target.value))} aria-label="두 점 사이 간격" />
        <div className="muted">두 점 사이 간격 <strong>{Number(gap.toFixed(2))} {props.unit}</strong></div>
        <div className="resolve-views">
          {props.devices.map((d) => {
            const resolved = gap >= d.min;
            const blur = resolved ? 0 : Math.min(10, (d.min - gap) * 20);
            const sep = 14 + (gap / props.gapMax) * 40;
            return (
              <div key={d.name} className="resolve-view">
                <div className="resolve-scope">
                  <span className="dot2" style={{ filter: `blur(${blur}px)`, left: `calc(50% - ${sep / 2}px)` }} />
                  <span className="dot2" style={{ filter: `blur(${blur}px)`, left: `calc(50% + ${sep / 2}px)` }} />
                </div>
                <div className="small"><strong>{d.name}</strong> · 최소 구별 간격 {d.min} {props.unit}</div>
                <div className={`badge ${resolved ? 'badge-done' : 'badge-warn'}`}>{resolved ? '두 점으로 구별됨' : '한 점처럼 보임'}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="w-q">
        <p>{props.question.prompt}</p>
        <div className="chips">
          {props.devices.map((d) => (
            <button key={d.name} className={`chip${pick === d.name ? ' on' : ''}`} disabled={checked} onClick={() => setPick(d.name)}>{d.name}</button>
          ))}
        </div>
        {!checked ? (
          <button className="btn btn-primary" disabled={!pick} onClick={() => { setChecked(true); onResult({ correct: ok }); }}>확인</button>
        ) : (
          <div className={`w-feedback ${ok ? 'ok' : 'no'}`}>{ok ? '맞았어요! ' : `정답은 ${props.question.answer}예요. `}{props.question.why}</div>
        )}
      </div>
    </div>
  );
}

/* ---------- O/X ---------- */
export function TrueFalse({ props, onResult }: W<{ statements: { text: string; answer: boolean; why: string }[] }>) {
  const [picks, setPicks] = useState<Record<number, boolean>>({});
  const [checked, setChecked] = useState(false);
  const all = props.statements.every((_, i) => picks[i] !== undefined);
  const okN = props.statements.filter((s, i) => picks[i] === s.answer).length;
  return (
    <div className="w">
      <ul className="ox">
        {props.statements.map((s, i) => {
          const res = checked ? (picks[i] === s.answer ? 'ok' : 'no') : '';
          return (
            <li key={i} className={res}>
              <span className="ox-text">{s.text}</span>
              <span className="seg">
                <button className={`seg-btn${picks[i] === true ? ' on' : ''}`} disabled={checked} onClick={() => setPicks({ ...picks, [i]: true })}>O</button>
                <button className={`seg-btn${picks[i] === false ? ' on' : ''}`} disabled={checked} onClick={() => setPicks({ ...picks, [i]: false })}>X</button>
              </span>
              {checked && <div className="ox-why small">{s.answer ? 'O' : 'X'} · {s.why}</div>}
            </li>
          );
        })}
      </ul>
      {!checked ? (
        <button className="btn btn-primary" disabled={!all} onClick={() => { setChecked(true); onResult({ correct: okN === props.statements.length }); }}>확인</button>
      ) : (
        <div className={`w-feedback ${okN === props.statements.length ? 'ok' : 'no'}`}>{okN}/{props.statements.length} 맞았어요.</div>
      )}
    </div>
  );
}

/* ---------- 중화 이온 모형 ---------- */
export function Ions({ props, onResult }: W<{ h: number; oh: number; max: number; challenge?: { h: number; oh: number; ask: 'total' | 'hLeft' | 'ohLeft' | 'water'; prompt: string } }>) {
  const [h, setH] = useState(props.h);
  const [oh, setOh] = useState(props.oh);
  const [ans, setAns] = useState('');
  const [checked, setChecked] = useState(false);
  const calc = (H: number, OH: number) => {
    const pairs = Math.min(H, OH);
    return { pairs, hLeft: H - pairs, ohLeft: OH - pairs, water: pairs, cl: H, na: OH, total: H - pairs + (OH - pairs) + H + OH, before: 2 * H + 2 * OH };
  };
  const c = calc(h, oh);
  const liquid = c.hLeft > 0 ? '산성' : c.ohLeft > 0 ? '염기성' : '중성';
  const btb = c.hLeft > 0 ? '노란색' : c.ohLeft > 0 ? '파란색' : '녹색';
  const chal = props.challenge;
  const answer = chal ? calc(chal.h, chal.oh)[chal.ask] : 0;
  const ok = near(parseNum(ans), answer);
  const dots = (n: number, cls: string, label: string) => Array.from({ length: n }, (_, i) => <span key={cls + i} className={`ion ${cls}`}>{label}</span>);
  return (
    <div className="w">
      <div className="ions-ctl">
        <label>H⁺ (염산에서) <strong>{h}</strong><input type="range" min={0} max={props.max} value={h} onChange={(e) => setH(Number(e.target.value))} /></label>
        <label>OH⁻ (수산화 나트륨에서) <strong>{oh}</strong><input type="range" min={0} max={props.max} value={oh} onChange={(e) => setOh(Number(e.target.value))} /></label>
      </div>
      <div className="ions-grid">
        <div className="ions-box">
          <div className="ions-title">반응 전 · 이온 {c.before}개</div>
          <div className="ions-dots">{dots(h, 'h', 'H⁺')}{dots(c.cl, 'cl', 'Cl⁻')}{dots(oh, 'oh', 'OH⁻')}{dots(c.na, 'na', 'Na⁺')}</div>
        </div>
        <div className="ions-arrow">→<br /><span className="small">H⁺ + OH⁻ → H₂O<br />{c.pairs}쌍 반응</span></div>
        <div className={`ions-box liquid-${c.hLeft > 0 ? 'acid' : c.ohLeft > 0 ? 'base' : 'neutral'}`}>
          <div className="ions-title">반응 후 · 이온 {c.total}개 · {liquid} (BTB {btb})</div>
          <div className="ions-dots">{dots(c.hLeft, 'h', 'H⁺')}{dots(c.cl, 'cl', 'Cl⁻')}{dots(c.ohLeft, 'oh', 'OH⁻')}{dots(c.na, 'na', 'Na⁺')}{dots(c.water, 'w', 'H₂O')}</div>
        </div>
      </div>
      <table className="ions-table">
        <tbody>
          <tr><th>처음 H⁺·OH⁻</th><td>{h}, {oh}</td></tr>
          <tr><th>반응한 쌍 (적은 쪽)</th><td>{c.pairs}</td></tr>
          <tr><th>남은 반응 이온</th><td>H⁺ {c.hLeft}, OH⁻ {c.ohLeft}</td></tr>
          <tr><th>구경꾼 이온</th><td>Cl⁻ {c.cl}, Na⁺ {c.na}</td></tr>
          <tr><th>전체 이온 (물 분자 제외)</th><td><strong>{c.total}</strong> = {c.hLeft} + {c.ohLeft} + {c.cl} + {c.na}</td></tr>
        </tbody>
      </table>
      {chal && (
        <div className="w-q">
          <p>{chal.prompt}</p>
          <span className="ans-in"><input type="text" inputMode="numeric" value={ans} disabled={checked} onChange={(e) => setAns(e.target.value)} /><span>개</span></span>
          {!checked ? (
            <button className="btn btn-primary" disabled={!ans.trim()} onClick={() => { setChecked(true); onResult({ correct: ok }); }}>확인</button>
          ) : (
            <div className={`w-feedback ${ok ? 'ok' : 'no'}`}>{ok ? '맞았어요!' : `정답은 ${answer}개예요. 손잡이를 ${chal.h}, ${chal.oh}에 맞추고 표를 다시 보세요.`}</div>
          )}
        </div>
      )}
    </div>
  );
}

export const WIDGETS: Record<string, (p: W<any>) => ReactElement> = { // eslint-disable-line @typescript-eslint/no-explicit-any
  cloze: Cloze, order: Order, reflect: Reflect, sorter: Sorter, ladder: Ladder, converter: Converter, ratio: Ratio, echo: Echo, resolve: Resolve, truefalse: TrueFalse, ions: Ions,
};
