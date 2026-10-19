import { useId, useState, type ReactElement, type ReactNode } from 'react';

interface ScienceWidgetProps<P> {
  props: P;
  onResult: (result: { correct?: boolean }) => void;
  onNote?: (line: string) => void;
  savedState?: unknown;
  onState?: (state: unknown) => void;
}

export interface ScienceQuestion {
  prompt: string;
  options: { id: string; text: string; feedback: string }[];
  answer: string;
  explanation?: string;
}

type ChoiceState = { choice: string | null; checked: boolean; attempts: number };
const freshChoice: ChoiceState = { choice: null, checked: false, attempts: 0 };
const palette = ['#147e77', '#6154bb', '#d68b24', '#bf5276', '#367db4', '#77863c'];

/** Save only on an actual interaction, never in a render or synchronization effect. */
function useDraft<T extends object>(initial: T, savedState: unknown, onState?: (state: unknown) => void) {
  const [state, setState] = useState<T>(() => {
    if (!savedState || typeof savedState !== 'object' || Array.isArray(savedState)) return initial;
    const restored = { ...initial } as Record<string, unknown>;
    const saved = savedState as Record<string, unknown>;
    for (const [key, fallback] of Object.entries(initial)) {
      const value = saved[key];
      if (fallback === null && (value === null || typeof value === 'string')) restored[key] = value;
      else if (Array.isArray(fallback) && Array.isArray(value) && value.every((item) => typeof item === 'string')) restored[key] = value;
      else if (fallback && typeof fallback === 'object' && !Array.isArray(fallback) && value && typeof value === 'object' && !Array.isArray(value) && Object.values(value).every((item) => typeof item === 'string')) restored[key] = value;
      else if (typeof fallback === 'number' && typeof value === 'number' && Number.isFinite(value) && value >= 0) restored[key] = value;
      else if (typeof fallback === 'boolean' && typeof value === 'boolean' || typeof fallback === 'string' && typeof value === 'string') restored[key] = value;
    }
    return restored as T;
  });
  const update = (patch: Partial<T>) => {
    const next = { ...state, ...patch };
    setState(next);
    onState?.(next);
  };
  return [state, update] as const;
}

function LabShell({ tag, title, intro, children }: { tag: string; title?: string; intro?: string; children: ReactNode }) {
  return <div className="science-lab">
    <div className="science-lab-heading"><span className="science-eyebrow">{tag}</span>{title && <h3>{title}</h3>}</div>
    {intro && <p className="science-intro">{intro}</p>}
    {children}
  </div>;
}

function ModelNote({ children }: { children: ReactNode }) {
  return <p className="science-model-note"><span aria-hidden="true">ⓘ</span> {children}</p>;
}

function Feedback({ correct, practice, children, retry }: { correct: boolean; practice: boolean; children: ReactNode; retry?: () => void }) {
  return <div className={`science-feedback ${correct ? 'is-correct' : 'needs-revision'}`} role="status" aria-live="polite">
    <strong>{correct ? (practice ? '생각을 고쳐서 해결했어요.' : '근거를 잘 연결했어요!') : '이 선택에서 한 가지만 다시 살펴봐요.'}</strong>
    <div>{children}</div>
    {correct && practice && <p className="science-practice-note">이번 기록은 고쳐 풀기예요. 새로운 문제에서도 적용할 수 있는지 이어서 확인해요.</p>}
    {retry && <button type="button" className="btn" onClick={retry}>피드백을 바탕으로 고쳐 풀기</button>}
  </div>;
}

function ChoiceChallenge({ question, state, update, onResult }: {
  question: ScienceQuestion;
  state: ChoiceState;
  update: (patch: Partial<ChoiceState>) => void;
  onResult: ScienceWidgetProps<unknown>['onResult'];
}) {
  const legendId = useId();
  const selected = question.options.find((option) => option.id === state.choice);
  const correct = state.choice === question.answer;
  return <section className="science-challenge" aria-labelledby={legendId}>
    <div className="science-challenge-label">{state.attempts > 0 && !state.checked ? '고쳐 풀기 · 연습' : '내가 판단할 차례'}</div>
    <h4 id={legendId}>{question.prompt}</h4>
    <div className="science-options" role="group" aria-labelledby={legendId}>
      {question.options.map((option, index) => <button type="button" key={option.id}
        className={`science-option ${state.choice === option.id ? 'is-selected' : ''} ${state.checked && state.choice === option.id ? (correct ? 'is-correct' : 'is-incorrect') : ''}`}
        aria-pressed={state.choice === option.id} disabled={state.checked}
        onClick={() => update({ choice: option.id })}>
        <span className="science-option-letter" aria-hidden="true">{String.fromCharCode(65 + index)}</span>
        <span>{option.text}</span>
      </button>)}
    </div>
    {!state.checked ? <button type="button" className="btn btn-primary science-check" disabled={!selected} onClick={() => {
      if (!selected) return;
      update({ checked: true, attempts: state.attempts + 1 });
      onResult({ correct });
    }}>{state.attempts ? '수정한 생각 확인' : '내 판단 확인'}</button> : <Feedback correct={correct} practice={state.attempts > 1}
      retry={!correct ? () => update({ checked: false, choice: null }) : undefined}>
      <p>{selected?.feedback}</p>
      {correct && question.explanation && <p>{question.explanation}</p>}
    </Feedback>}
  </section>;
}

function ConceptArt({ kind }: { kind: 'atom' | 'light' | 'universe' | 'journey' }) {
  if (kind === 'atom') return <svg className="science-concept-art" viewBox="0 0 520 140" role="img" aria-label="양성자 둘, 중성자 둘의 원자핵과 전자 둘을 나타낸 헬륨 원자의 단순 모형. 크기와 전자 경로는 실제 모습이 아닙니다.">
    <ellipse cx="160" cy="69" rx="99" ry="47" fill="none" stroke="#786ac0" strokeWidth="2" />
    <ellipse cx="160" cy="69" rx="47" ry="62" fill="none" stroke="#9b8ed2" strokeWidth="2" transform="rotate(-35 160 69)" />
    <circle cx="151" cy="60" r="12" fill="#d68b24" /><circle cx="169" cy="60" r="12" fill="#147e77" /><circle cx="151" cy="78" r="12" fill="#147e77" /><circle cx="169" cy="78" r="12" fill="#d68b24" />
    <circle cx="259" cy="69" r="7" fill="#6154bb" /><circle cx="96" cy="25" r="7" fill="#6154bb" />
    <path d="M180 67h105m-20 2 18-18h23" fill="none" stroke="#52635d" /><text x="314" y="56">원자핵</text><text x="314" y="91" className="science-art-small">그림에서 무엇이 달라졌나요?</text>
  </svg>;
  if (kind === 'light') return <svg className="science-concept-art" viewBox="0 0 520 140" role="img" aria-label="빛을 분리하여 스펙트럼의 선 위치를 비교하는 모식도">
    <circle cx="55" cy="72" r="23" fill="#efbb57" /><path d="M82 72h85" stroke="#efbb57" strokeWidth="5" />
    <rect x="167" y="33" width="78" height="78" rx="14" fill="#d9e5f2" stroke="#7b9bb5" strokeWidth="2" /><text x="180" y="78" className="science-art-small">분광 장치</text>
    {['#a16bd1', '#577ac8', '#42a797', '#d0ae40', '#d6666f'].map((color, i) => <path key={color} d={`M246 72 430 ${25 + i * 22}`} stroke={color} strokeWidth="3" />)}
    <text x="20" y="124" className="science-art-small">빛</text><text x="168" y="134" className="science-art-small">빛을 분리</text><text x="424" y="134" className="science-art-small">선의 위치</text>
  </svg>;
  return <svg className="science-concept-art" viewBox="0 0 520 140" role="img" aria-label={kind === 'journey' ? '우주의 물질이 별을 거쳐 행성과 생명체로 이어지는 연결 모식도' : '다양한 별과 은하가 분포한 우주의 모식도'}>
    <rect x="0" y="0" width="520" height="140" rx="18" fill="#171d39" />
    {[25, 77, 115, 174, 234, 280, 340, 389, 446, 492].map((x, i) => <circle key={x} cx={x} cy={18 + i * 37 % 102} r={i % 3 === 0 ? 2.5 : 1.5} fill="#c6d6f2" />)}
    {kind === 'journey' ? <><path d="M100 72h310" stroke="#768bb0" strokeWidth="2" strokeDasharray="5 7" /><circle cx="100" cy="72" r="25" fill="#eeaf54" /><circle cx="260" cy="72" r="19" fill="#598cb8" /><path d="M407 97V52m0 23c-28-4-24-24-24-24 27 0 24 24 24 24m0-11c22-5 22-24 22-24-24 2-22 24-22 24" fill="#65c7ad" stroke="#65c7ad" strokeWidth="3" /><text x="80" y="122" fill="#fff" className="science-art-small">별</text><text x="241" y="122" fill="#fff" className="science-art-small">행성</text><text x="385" y="122" fill="#fff" className="science-art-small">생명체</text></> : <><ellipse cx="255" cy="73" rx="115" ry="29" fill="#aab0e0" opacity=".16" transform="rotate(-18 255 73)" /><ellipse cx="255" cy="73" rx="72" ry="15" fill="#bbb0f0" opacity=".35" transform="rotate(-18 255 73)" /><circle cx="255" cy="73" r="12" fill="#f8dfa0" /></>}
  </svg>;
}

function Reasoning({ props, savedState, onState, onResult }: ScienceWidgetProps<ScienceQuestion & {
  title?: string; context?: string; hint?: string; visual?: 'atom' | 'light' | 'universe' | 'journey';
}>) {
  const [state, update] = useDraft({ ...freshChoice, hintOpen: false, hintUsed: false }, savedState, onState);
  return <LabShell tag="생각의 근거" title={props.title} intro={props.context}>
    {props.visual && <ConceptArt kind={props.visual} />}
    {props.visual === 'atom' && <ModelNote>헬륨 원자를 예로 원자핵과 전자를 구별한 모형이에요. 크기 비율과 전자의 경로는 실제 모습을 나타내지 않아요.</ModelNote>}
    {props.hint && <div className="science-hint"><button type="button" className="btn btn-text" aria-expanded={state.hintOpen} onClick={() => update({ hintOpen: !state.hintOpen, hintUsed: true })}>{state.hintOpen ? '생각 도움 접기' : '생각이 막혔나요? 작은 도움'}</button>{state.hintOpen && <p>{props.hint}</p>}</div>}
    <ChoiceChallenge question={props} state={state} update={update} onResult={onResult} />
  </LabShell>;
}

interface SpectrumProps {
  title?: string; instruction?: string;
  sources: { id: string; label: string; lines: number[]; color?: string }[];
  unknownLines: number[]; unknownLabel?: string; unknownKind?: 'absorption' | 'emission'; min?: number; max?: number;
  question: ScienceQuestion; simplification?: string;
}

function SpectrumLab({ props, savedState, onState, onResult }: ScienceWidgetProps<SpectrumProps>) {
  const [state, update] = useDraft({ ...freshChoice, reference: props.sources[0]?.id ?? '' }, savedState, onState);
  const source = props.sources.find((item) => item.id === state.reference) ?? props.sources[0];
  const min = props.min ?? 380;
  const max = props.max ?? 720;
  const x = (value: number) => 24 + (value - min) / (max - min) * 452;
  const labelId = useId();
  const spectrumId = useId().replace(/:/g, '');
  const inRange = (value: number) => value >= min && value <= max;
  const outside = source?.lines.filter((value) => !inRange(value)) ?? [];
  const absorption = props.unknownKind === 'absorption';
  return <LabShell tag="빛의 지문 실험실" title={props.title} intro={props.instruction}>
    <div className="science-tabs" role="group" aria-label="비교할 기준 원소">
      {props.sources.map((item) => <button type="button" key={item.id} aria-pressed={state.reference === item.id} className={state.reference === item.id ? 'is-active' : ''} onClick={() => update({ reference: item.id })}>{item.label}</button>)}
    </div>
    <figure className="science-spectrum" aria-labelledby={labelId}>
      <figcaption id={labelId}>같은 파장 눈금 위에서 선의 <strong>위치</strong>를 비교하세요.</figcaption>
      <div className="science-spectrum-row-label">{props.unknownLabel ?? '관측 대상의 선 스펙트럼'}</div>
      <svg viewBox="0 0 500 174" role="img" aria-label={`${absorption ? '연속 스펙트럼 속 어두운 흡수선' : '어두운 바탕의 밝은 방출선'}, 대상 파장 ${props.unknownLines.join(', ')} 나노미터. 비교 원소 ${source?.label}의 기준 방출선: ${source?.lines.filter(inRange).join(', ')} 나노미터. 두 줄은 ${min}에서 ${max} 나노미터의 같은 파장 눈금을 사용합니다.`}>
        <defs><linearGradient id={spectrumId} gradientUnits="userSpaceOnUse" x1={x(380)} x2={x(740)} y1="0" y2="0"><stop offset="0" stopColor="#7847ae" /><stop offset=".2" stopColor="#4979d0" /><stop offset=".4" stopColor="#54af8a" /><stop offset=".58" stopColor="#dfc960" /><stop offset=".76" stopColor="#df8a52" /><stop offset="1" stopColor="#ba4b59" /></linearGradient></defs>
        <rect x="20" y="9" width="460" height="45" rx="6" fill={absorption ? `url(#${spectrumId})` : '#17223b'} />
        <rect x="20" y="91" width="460" height="45" rx="6" fill="#17223b" />
        {[0, 1, 2, 3, 4].map((i) => { const value = min + (max - min) * i / 4; return <g key={i}><path d={`M${x(value)} 6v136`} stroke="#8da1af" opacity=".27" strokeDasharray="3 4" /><text x={x(value)} y="163" textAnchor="middle" fill="#52635d" fontSize="14">{Math.round(value)}</text></g>; })}
        {props.unknownLines.filter(inRange).map((value, i) => <path key={`${value}-${i}`} d={`M${x(value)} ${absorption ? 9 : 16}v${absorption ? 45 : 31}`} stroke={absorption ? '#12192b' : '#ffdc86'} strokeWidth="3" />)}
        {source?.lines.filter(inRange).map((value, i) => <g key={`${value}-${i}`}><path d={`M${x(value)} 98v31`} stroke={source.color ?? '#67dccb'} strokeWidth="3" /><path d={`M${x(value)} 55v34`} stroke={source.color ?? '#67dccb'} strokeWidth="1.5" strokeDasharray="3 3" opacity=".65" /></g>)}
        <text x="24" y="78" fill="#52635d" fontSize="16">비교: {source?.label}</text>
      </svg>
      <div className="science-axis-caption">짧은 파장 ← <strong>파장 (nm)</strong> → 긴 파장</div>
      {outside.length > 0 && <p className="science-spectrum-outside">참조 자료의 {outside.join(' · ')} nm 선은 현재 관측 범위 밖이므로 위 그림에 표시하지 않았어요.</p>}
      <details className="science-line-values"><summary>파장 수치로도 비교하기</summary><p>대상: {props.unknownLines.join(' · ')} nm</p><p>{source?.label}: {source?.lines.join(' · ')} nm</p></details>
    </figure>
    <ModelNote>{props.simplification ?? '비교에 필요한 대표 선만 표시한 모형입니다. 선의 밝기·너비·색과 선의 개수는 실제 관측 전체를 재현하지 않습니다.'}</ModelNote>
    <ChoiceChallenge question={props.question} state={state} update={update} onResult={onResult} />
  </LabShell>;
}

interface TimelineProps {
  title?: string; instruction?: string;
  events: { id: string; label: string; detail?: string; time?: string; feedback?: string }[];
  answer: string[]; initialOrder?: string[]; explanation: string; scaleNote?: string;
}

function CosmicTimeline({ props, savedState, onState, onResult }: ScienceWidgetProps<TimelineProps>) {
  const given = props.initialOrder ?? props.events.map((event) => event.id).reverse();
  const initial = given.every((id, i) => id === props.answer[i]) && given.length > 1 ? [...given.slice(1), given[0]] : given;
  const [state, update] = useDraft({ order: initial, checked: false, attempts: 0, moved: false }, savedState, onState);
  const order = state.order.length === props.events.length && new Set(state.order).size === props.events.length && state.order.every((id) => props.events.some((event) => event.id === id)) ? state.order : initial;
  const correct = order.every((id, i) => id === props.answer[i]);
  const move = (index: number, delta: number) => {
    const next = [...order];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    update({ order: next, moved: true });
  };
  return <LabShell tag="우주의 순서 조립" title={props.title} intro={props.instruction}>
    <div className="science-time-direction"><span>먼저 일어난 일</span><span aria-hidden="true">↓</span><span>나중에 일어난 일</span></div>
    <ol className="science-timeline">
      {order.map((id, index) => {
        const event = props.events.find((item) => item.id === id)!;
        const inPlace = id === props.answer[index];
        return <li key={id} className={state.checked ? (inPlace ? 'is-correct' : 'needs-revision') : ''}>
          <span className="science-timeline-index" aria-hidden="true">{index + 1}</span>
          <div className="science-timeline-content"><strong>{event.label}</strong>{event.detail && <p>{event.detail}</p>}
            {state.checked && <p className="science-timeline-correction">{inPlace ? '✓ 이 위치가 맞아요.' : `↳ ${props.answer.indexOf(id) + 1}번째에 놓여요. ${event.feedback ?? ''}`}</p>}
            {state.checked && event.time && <span className="science-time-chip">{event.time}</span>}
          </div>
          <div className="science-move-buttons"><button type="button" disabled={state.checked || index === 0} aria-label={`${event.label} 한 칸 위로`} onClick={() => move(index, -1)}>↑</button><button type="button" disabled={state.checked || index === order.length - 1} aria-label={`${event.label} 한 칸 아래로`} onClick={() => move(index, 1)}>↓</button></div>
        </li>;
      })}
    </ol>
    <ModelNote>{props.scaleNote ?? '시간 간격을 같은 길이로 나타내지 않은 순서 모형입니다. 위아래 버튼으로 순서를 바꿀 수 있어요.'}</ModelNote>
    {!state.checked ? <button type="button" className="btn btn-primary science-check" disabled={!state.moved} onClick={() => {
      if (!state.moved) return;
      update({ checked: true, attempts: state.attempts + 1 });
      onResult({ correct });
    }}>{state.attempts ? '고친 순서 확인 · 연습' : '구성한 순서 확인'}</button> : <Feedback correct={correct} practice={state.attempts > 1} retry={!correct ? () => update({ checked: false, moved: false }) : undefined}>
      <p>{props.explanation}</p>
      {!correct && <p>위의 안내를 읽고 순서를 직접 다시 구성해 보세요.</p>}
    </Feedback>}
  </LabShell>;
}

interface StarProps {
  title?: string; instruction?: string;
  stars: { id: string; label: string; stages: { id: string; label: string; detail: string; layers: { label: string; color?: string }[]; note?: string }[] }[];
  question: ScienceQuestion; simplification?: string;
}

function StarForge({ props, savedState, onState, onResult }: ScienceWidgetProps<StarProps>) {
  const [state, update] = useDraft({ ...freshChoice, star: props.stars[0]?.id ?? '', stage: 0 }, savedState, onState);
  const star = props.stars.find((item) => item.id === state.star) ?? props.stars[0];
  const stageIndex = Math.min(Math.max(0, state.stage), (star?.stages.length ?? 1) - 1);
  const stage = star?.stages[stageIndex];
  const glowId = useId().replace(/:/g, '');
  if (!star || !stage) return <p>별의 단계 자료를 준비하고 있어요.</p>;
  return <LabShell tag="별의 내부 탐사" title={props.title} intro={props.instruction}>
    <div className="science-tabs" role="group" aria-label="별의 질량에 따른 경로 선택">
      {props.stars.map((item) => <button type="button" key={item.id} aria-pressed={state.star === item.id} className={state.star === item.id ? 'is-active' : ''} onClick={() => update({ star: item.id, stage: 0 })}>{item.label}</button>)}
    </div>
    <div className="science-star-stages" role="group" aria-label="살펴볼 진화 단계">
      {star.stages.map((item, index) => <button type="button" key={item.id} className={stageIndex === index ? 'is-active' : ''} aria-pressed={stageIndex === index} onClick={() => update({ stage: index })}><span>{index + 1}</span>{item.label}</button>)}
    </div>
    <div className="science-star-view">
      <svg viewBox="0 0 260 260" role="img" aria-label={`${star.label}, ${stage.label}. 바깥부터 ${stage.layers.map((layer) => layer.label).join(', ')}. 실제 크기나 층의 두께 비율이 아닌 모형.`}>
        <defs><radialGradient id={glowId}><stop offset="0" stopColor="#edb65a" stopOpacity=".25" /><stop offset="1" stopColor="#edb65a" stopOpacity="0" /></radialGradient></defs>
        <rect width="260" height="260" rx="22" fill="#171d39" /><circle cx="130" cy="130" r="124" fill={`url(#${glowId})`} />
        {[18, 47, 205, 234, 211, 32].map((x, i) => <circle key={x} cx={x} cy={22 + i * 43 % 218} r="1.5" fill="#e5ecf8" opacity=".7" />)}
        {stage.layers.map((layer, index) => <circle key={`${layer.label}-${index}`} cx="130" cy="130" r={94 - index * 77 / Math.max(1, stage.layers.length)} fill={layer.color ?? ['#f1b65e', '#de8251', '#bf5a61', '#8f5d85', '#5c619a'][index % 5]} stroke="#fff" strokeOpacity=".45" />)}
        {stage.layers.map((layer, index) => { const y = index === stage.layers.length - 1 ? 130 : 130 - (94 - index * 77 / stage.layers.length) + 38.5 / stage.layers.length; return <g key={`label-${layer.label}-${index}`}><circle cx="130" cy={y} r={stage.layers.length > 4 ? 7 : 9} fill="#fff" fillOpacity=".92" /><text x="130" y={y + 4} textAnchor="middle" fill="#17223b" fontWeight="800" fontSize={stage.layers.length > 4 ? 10 : 12}>{index + 1}</text></g>; })}
      </svg>
      <div className="science-star-legend"><h4>{stage.label}</h4><p>{stage.detail}</p><ol>{stage.layers.map((layer, index) => <li key={`${layer.label}-${index}`}><span>{index + 1}</span>{layer.label}</li>)}</ol>{stage.note && <p className="science-star-note">{stage.note}</p>}</div>
    </div>
    <ModelNote>{props.simplification ?? '각 단계의 주요 구조를 비교하기 위한 모식도입니다. 층의 크기·두께·색은 실제 비율이 아니며, 별의 질량에 따라 가능한 진화 경로가 달라져요.'}</ModelNote>
    <ChoiceChallenge question={props.question} state={state} update={update} onResult={onResult} />
  </LabShell>;
}

interface CompositionProps {
  title?: string; instruction?: string;
  samples: { id: string; label: string; basis: string; total: number; unit: string; parts: { label: string; value: number; color?: string }[]; note?: string }[];
  question: ScienceQuestion; simplification?: string;
}

function CompositionLab({ props, savedState, onState, onResult }: ScienceWidgetProps<CompositionProps>) {
  const [state, update] = useDraft({ ...freshChoice, sample: props.samples[0]?.id ?? '', percentage: true }, savedState, onState);
  const sample = props.samples.find((item) => item.id === state.sample) ?? props.samples[0];
  if (!sample) return <p>구성비 자료를 준비하고 있어요.</p>;
  const percent = (value: number) => sample.total > 0 ? value / sample.total * 100 : 0;
  const show = (value: number) => state.percentage ? `${Number(percent(value).toFixed(2))}%` : `${Number(value.toFixed(2))} ${sample.unit}`;
  const maximum = Math.max(...sample.parts.map((part) => part.value), 1);
  return <LabShell tag="비율과 기준 탐구" title={props.title} intro={props.instruction}>
    <div className="science-tabs" role="group" aria-label="비교할 자료 선택">
      {props.samples.map((item) => <button type="button" key={item.id} className={state.sample === item.id ? 'is-active' : ''} aria-pressed={state.sample === item.id} onClick={() => update({ sample: item.id })}>{item.label}</button>)}
    </div>
    <div className="science-composition">
      <div className="science-composition-top"><div><span className="science-eyebrow">무엇을 전체로 보았나요?</span><strong>{sample.basis}</strong><span>전체 = {sample.total.toLocaleString('ko-KR')} {sample.unit}</span></div><div className="science-display-switch" role="group" aria-label="표시 방법"><button type="button" aria-pressed={state.percentage} onClick={() => update({ percentage: true })}>비율 %</button><button type="button" aria-pressed={!state.percentage} onClick={() => update({ percentage: false })}>실제 양</button></div></div>
      <div className="science-composition-bars" aria-label={`${sample.label} 구성 자료`}>
        {sample.parts.map((part, index) => <div className="science-composition-bar" key={part.label}><div><strong>{part.label}</strong><span>{show(part.value)}</span></div><div className="science-bar-track"><div className="science-bar-fill" style={{ width: `${Math.max(0, Math.min(100, state.percentage ? percent(part.value) : part.value / maximum * 100))}%`, background: part.color ?? palette[index % palette.length] }} /></div></div>)}
      </div>
      <p className="science-bar-scale">{state.percentage ? '모든 막대의 최대 눈금 = 전체의 100%' : `모든 막대의 최대 눈금 = ${maximum} ${sample.unit}`}</p>
      {sample.note && <p className="science-sample-note">{sample.note}</p>}
    </div>
    <ModelNote>{props.simplification ?? '비율은 부분의 양 ÷ 전체의 양 × 100이에요. 질량 기준과 원자 수 기준을 먼저 구분한 뒤 비교하세요.'}</ModelNote>
    <ChoiceChallenge question={props.question} state={state} update={update} onResult={onResult} />
  </LabShell>;
}

interface EvidenceProps {
  title?: string; prompt: string;
  bins: { id: string; label: string; description?: string }[];
  items: { id: string; text: string; bin: string; feedback: string }[];
  explanation?: string;
}

function EvidenceSort({ props, savedState, onState, onResult }: ScienceWidgetProps<EvidenceProps>) {
  const [state, update] = useDraft({ assignments: {} as Record<string, string>, checked: false, attempts: 0 }, savedState, onState);
  const allSet = props.items.every((item) => props.bins.some((bin) => bin.id === state.assignments[item.id]));
  const score = props.items.filter((item) => state.assignments[item.id] === item.bin).length;
  const correct = score === props.items.length;
  return <LabShell tag="증거를 구별하는 눈" title={props.title} intro={props.prompt}>
    <div className="science-bin-key">{props.bins.map((bin) => <div key={bin.id}><strong>{bin.label}</strong>{bin.description && <p>{bin.description}</p>}</div>)}</div>
    <ol className="science-evidence-list">{props.items.map((item, index) => {
      const itemCorrect = state.assignments[item.id] === item.bin;
      return <li key={item.id} className={state.checked ? itemCorrect ? 'is-correct' : 'needs-revision' : ''}>
        <div className="science-evidence-statement"><span>{index + 1}</span><strong>{item.text}</strong></div>
        <div className="science-tabs" role="group" aria-label={`${item.text} 분류`}>{props.bins.map((bin) => <button type="button" key={bin.id} disabled={state.checked} className={state.assignments[item.id] === bin.id ? 'is-active' : ''} aria-pressed={state.assignments[item.id] === bin.id} onClick={() => update({ assignments: { ...state.assignments, [item.id]: bin.id } })}>{bin.label}</button>)}</div>
        {state.checked && <p className="science-evidence-feedback"><strong>{itemCorrect ? '✓ 맞게 구별했어요.' : `↳ ${props.bins.find((bin) => bin.id === item.bin)?.label}`}</strong> {item.feedback}</p>}
      </li>;
    })}</ol>
    {!state.checked ? <button type="button" className="btn btn-primary science-check" disabled={!allSet} onClick={() => {
      if (!allSet) return;
      update({ checked: true, attempts: state.attempts + 1 });
      onResult({ correct });
    }}>{state.attempts ? '고친 분류 확인 · 연습' : '분류한 근거 확인'}</button> : <Feedback correct={correct} practice={state.attempts > 1} retry={!correct ? () => update({ checked: false, assignments: Object.fromEntries(Object.entries(state.assignments).filter(([id, bin]) => props.items.some((item) => item.id === id && item.bin === bin))) }) : undefined}>
      <p>{props.items.length}개 중 {score}개를 바르게 구별했어요. {props.explanation}</p>
      {!correct && <p>맞힌 항목은 남겨 두었어요. 틀린 항목의 근거를 읽고 다시 골라 보세요.</p>}
    </Feedback>}
  </LabShell>;
}

// The content builder owns the schema; runtime widgets use the same public contract as widgets.tsx.
export const SCIENCE_WIDGETS: Record<string, (props: ScienceWidgetProps<any>) => ReactElement> = {
  reasoning: Reasoning,
  spectrumLab: SpectrumLab,
  cosmicTimeline: CosmicTimeline,
  starForge: StarForge,
  compositionLab: CompositionLab,
  evidenceSort: EvidenceSort,
};
