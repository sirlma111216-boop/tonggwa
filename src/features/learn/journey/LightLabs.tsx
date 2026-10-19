import { useId } from 'react';
import './LightLabs.css';

export interface LabProps {
  kind: string;
  state: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}

const spectralColor = (nm: number) => nm < 450 ? '#a58aff' : nm < 490 ? '#6cafff' : nm < 530 ? '#48ddd2' : nm < 575 ? '#bce659' : nm < 610 ? '#ffd56a' : '#ff776e';
const validVisits = (value: unknown, allowed: string[], fallback: string[] = []) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && allowed.includes(item)) : fallback;

function Spectrum({ label, mode = 'absorption', lines = [], min = 400, max = 700, guides = [], height = 154, faint = false }: {
  label: string;
  mode?: 'continuous' | 'emission' | 'absorption';
  lines?: number[];
  min?: number;
  max?: number;
  guides?: number[];
  height?: number;
  faint?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  const left = 42, width = 716;
  const x = (nm: number) => left + (nm - min) / (max - min) * width;
  const ticks = Array.from({ length: 5 }, (_, i) => min + (max - min) * i / 4);
  return <svg className="jl-spectrum" viewBox={`0 0 800 ${height}`} role="img" aria-label={`${label}. 파장 범위 ${min}에서 ${max} 나노미터.${lines.length ? ` 선의 위치 ${lines.join(', ')} 나노미터.` : ' 파장이 연속적으로 이어집니다.'}`}>
    <defs><linearGradient id={id} gradientUnits="userSpaceOnUse" x1={x(400)} x2={x(700)}><stop offset="0" stopColor="#764cec" /><stop offset=".2" stopColor="#376be2" /><stop offset=".38" stopColor="#21c7c8" /><stop offset=".53" stopColor="#8dcc54" /><stop offset=".68" stopColor="#f6da56" /><stop offset=".82" stopColor="#f99a46" /><stop offset="1" stopColor="#ed555f" /></linearGradient></defs>
    <text x={left} y="21" className="jl-svg-label">{label}</text>
    <text x={left + width} y="21" textAnchor="end" className="jl-svg-tick">파장 (nm)</text>
    <rect x={left} y="35" width={width} height="42" rx="5" fill={mode === 'emission' ? '#070e1b' : `url(#${id})`} />
    {lines.map(nm => <g key={nm}>
      <line x1={x(nm)} x2={x(nm)} y1="36" y2="76" stroke={mode === 'emission' ? spectralColor(nm) : '#091122'} strokeWidth={mode === 'emission' ? (faint ? 3 : 6) : 5} opacity={faint ? .48 : 1} />
      <text x={x(nm)} y="100" textAnchor="middle" className="jl-svg-value">{nm}</text>
    </g>)}
    {guides.map(nm => <line key={nm} x1={x(nm)} x2={x(nm)} y1="28" y2="83" stroke="#fff" strokeWidth="2" strokeDasharray="4 4" />)}
    <line x1={left} x2={left + width} y1="111" y2="111" stroke="#586c86" />
    {ticks.map(tick => <g key={tick}><line x1={x(tick)} x2={x(tick)} y1="108" y2="115" stroke="#8094ae" /><text x={x(tick)} y="133" textAnchor="middle" className="jl-svg-tick">{tick}</text></g>)}
  </svg>;
}

function Prism({ state, onChange }: LabProps) {
  const open = state.prismOpen === true;
  const id = useId().replace(/:/g, '');
  const colors = ['#ff7b7c', '#ffae70', '#ffdc76', '#92e6ae', '#65d9ed', '#70a5ff', '#b69aff'];
  return <div className="jl-lab">
    <div className="jl-space jl-prism-stage">
      <span className="jl-diagram-tag">빛의 관찰실</span>
      <svg viewBox="0 0 800 255" role="img" aria-label={open ? '별빛이 프리즘을 지나 여러 파장 성분으로 펼쳐집니다.' : '별빛이 들어옵니다. 빛 펼치기를 눌러 프리즘을 놓아 보세요.'}>
        <defs><radialGradient id={`${id}-star`}><stop stopColor="#fffde5" /><stop offset=".35" stopColor="#ffe2a0" /><stop offset="1" stopColor="#ffbc78" stopOpacity="0" /></radialGradient><linearGradient id={`${id}-glass`}><stop stopColor="#c7eaff" stopOpacity=".3" /><stop offset="1" stopColor="#71b1e3" stopOpacity=".04" /></linearGradient></defs>
        {[45, 156, 234, 380, 498, 630, 745].map((x, i) => <circle key={x} cx={x} cy={26 + i % 3 * 63} r={i % 2 ? 1 : 1.8} fill="#bcd6ff" opacity=".4" />)}
        <circle cx="112" cy="125" r="60" fill={`url(#${id}-star)`} /><circle cx="112" cy="125" r="18" fill="#fff4cc" />
        <path d={open ? 'M145 125H327' : 'M145 125H700'} stroke="#fff2c8" strokeWidth="10" opacity=".1" /><path d={open ? 'M145 125H327' : 'M145 125H700'} stroke="#fff5dc" strokeWidth="3" />
        {open ? <g className="jl-reveal"><path d="M360 55L305 170H421Z" fill={`url(#${id}-glass)`} stroke="#a4cbea" strokeWidth="2" /><path d="M327 125L403 136" stroke="#fff5dc" strokeWidth="3" />{colors.map((color, i) => <path key={color} d={`M403 136L690 ${141 + i * 12}`} stroke={color} strokeWidth="4" opacity=".9" />)}<rect x="690" y="134" width="18" height="87" rx="5" fill="#c6dcf8" opacity=".08" /><text x="362" y="210" textAnchor="middle" className="jl-svg-label">프리즘</text><text x="628" y="242" textAnchor="middle" className="jl-svg-label">파장에 따라 펼쳐진 빛</text></g> : <g><path d="M360 55L305 170H421Z" fill="none" stroke="#91accd" strokeDasharray="6 7" opacity=".45" /><text x="363" y="210" textAnchor="middle" className="jl-svg-label">프리즘 자리</text></g>}
        <text x="112" y="210" textAnchor="middle" className="jl-svg-label">별에서 온 빛</text>
      </svg>
    </div>
    <div className="jl-control-row"><button type="button" className="jl-action" onClick={() => onChange({ ...state, prismOpen: !open, explored: true })}>{open ? '프리즘 빼 보기' : '빛 펼치기'}<span aria-hidden="true">{open ? ' ↶' : ' →'}</span></button><span className="jl-control-hint" role="status">{open ? '하나로 보이던 빛 속에 여러 파장 성분이 있어요.' : '별에 가지 않고도 빛을 펼쳐 볼 수 있어요.'}</span></div>
    <p className="jl-model-note">빛이 나뉘는 모습을 단순화한 학습 모형입니다. 별과 장치의 크기·거리 비율은 실제와 다릅니다.</p>
  </div>;
}

function Wave({ state, onChange }: LabProps) {
  const raw = typeof state.wavelength === 'number' ? state.wavelength : 500;
  const wavelength = Math.min(700, Math.max(400, raw));
  const period = wavelength * .5;
  const start = 95;
  const path = Array.from({ length: 301 }, (_, i) => { const x = 45 + i * 2.35; return `${i ? 'L' : 'M'}${x.toFixed(1)} ${(140 - 43 * Math.cos((x - start) * Math.PI * 2 / period)).toFixed(1)}`; }).join(' ');
  const id = useId().replace(/:/g, '');
  const update = (next: number) => onChange({ ...state, wavelength: next, explored: true });
  return <div className="jl-lab">
    <div className="jl-space"><span className="jl-diagram-tag">파장 눈금 실험</span><svg viewBox="0 0 800 250" role="img" aria-label={`같은 순간의 파동 모양. 이웃한 두 마루 사이 거리인 파장은 ${wavelength} 나노미터입니다.`}>
      <defs><marker id={id} viewBox="0 0 8 8" refX="4" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L8 4L0 8" fill="#e4ecfa" /></marker></defs>
      <line x1="45" x2="750" y1="140" y2="140" stroke="#334860" strokeDasharray="4 7" />
      <path d={path} stroke={spectralColor(wavelength)} strokeWidth="5" fill="none" />
      {[start, start + period].map(x => <g key={x}><line x1={x} x2={x} y1="65" y2="99" stroke="#a5b4ca" strokeDasharray="3 4" /><circle cx={x} cy="97" r="6" fill="#fff" /></g>)}
      <line x1={start + 5} x2={start + period - 5} y1="62" y2="62" stroke="#e4ecfa" strokeWidth="2" markerStart={`url(#${id})`} markerEnd={`url(#${id})`} />
      <text x={start + period / 2} y="42" textAnchor="middle" className="jl-wave-label">파장 {wavelength} nm</text>
      <text x={start} y="221" textAnchor="middle" className="jl-svg-label">마루</text><text x={start + period} y="221" textAnchor="middle" className="jl-svg-label">이웃한 마루</text>
      <text x="740" y="221" textAnchor="end" className="jl-svg-tick">공간에서의 위치 →</text>
    </svg></div>
    <div className="jl-wave-controls"><label htmlFor={`${id}-range`}>파장을 바꾸어 두 마루 사이를 보세요 <output>{wavelength} nm</output></label><div className="jl-slider-row"><button type="button" aria-label="파장 50 나노미터 줄이기" disabled={wavelength <= 400} onClick={() => update(Math.max(400, wavelength - 50))}>−</button><input id={`${id}-range`} type="range" min="400" max="700" step="50" value={wavelength} onChange={e => update(Number(e.target.value))} /><button type="button" aria-label="파장 50 나노미터 늘리기" disabled={wavelength >= 700} onClick={() => update(Math.min(700, wavelength + 50))}>+</button></div><div className="jl-range-labels"><span>400 nm · 짧음</span><span>700 nm · 긺</span></div></div>
    <p className="jl-model-note">파장(波長)은 ‘파동의 길이’. 1 nm(나노미터)는 10억 분의 1 m입니다. 그림은 한 순간의 파동을 크게 확대해 표현했습니다.</p>
  </div>;
}

const sourceOptions = [
  { id: 'continuous', label: '연속광', detail: '뜨겁고 밀도가 높은 광원', spectrum: '연속 스펙트럼' },
  { id: 'emission', label: '뜨거운 기체', detail: '뜨겁고 밀도가 낮은 기체', spectrum: '방출 선스펙트럼' },
  { id: 'absorption', label: '연속광 + 차가운 기체', detail: '연속광이 상대적으로 차가운 기체를 통과', spectrum: '흡수 스펙트럼' },
] as const;

function Sources({ state, onChange }: LabProps) {
  const mode = sourceOptions.find(x => x.id === state.source)?.id ?? 'continuous';
  const current = sourceOptions.find(x => x.id === mode)!;
  const visited = validVisits(state.sourcesVisited, sourceOptions.map(x => x.id), ['continuous']);
  const choose = (next: typeof mode) => { const nextVisits = [...new Set([...visited, next])]; onChange({ ...state, source: next, sourcesVisited: nextVisits, explored: nextVisits.length === 3 }); };
  return <div className="jl-lab">
    <div className="jl-switches" aria-label="빛이 만들어지는 조건">{sourceOptions.map(option => <button type="button" key={option.id} aria-pressed={mode === option.id} onClick={() => choose(option.id)}><span>{option.label}</span>{visited.includes(option.id) && <span className="jl-visited" aria-label="관찰함">✓</span>}</button>)}</div>
    <div className="jl-space jl-source-space">
      <span className="jl-diagram-tag">{current.detail}</span>
      <svg className="jl-source-path" viewBox="0 0 800 115" role="img" aria-label={mode === 'absorption' ? '연속광이 상대적으로 차가운 기체를 통과한 뒤의 빛을 분광 장치로 관찰합니다.' : `${current.detail}에서 나온 빛을 분광 장치로 관찰합니다.`}>
        <path d="M145 56H665" stroke={mode === 'emission' ? '#c7a1ff' : '#fff1c2'} strokeWidth="3" strokeDasharray={mode === 'emission' ? '10 8' : undefined} />
        {mode === 'emission' ? <g><rect x="54" y="19" width="104" height="69" rx="18" fill="#522d70" stroke="#b888ea" />{[75, 105, 134].map((x, i) => <circle key={x} cx={x} cy={43 + i % 2 * 22} r="5" fill="#d3abff" />)}<text x="107" y="109" textAnchor="middle" className="jl-svg-label">뜨거운 기체</text></g> : <g><circle cx="105" cy="55" r="28" fill="#ffe0a3" /><circle cx="105" cy="55" r="37" fill="#ffe0a3" opacity=".1" /><text x="105" y="109" textAnchor="middle" className="jl-svg-label">연속광 광원</text></g>}
        {mode === 'absorption' && <g><rect x="310" y="19" width="120" height="69" rx="13" fill="#244960" stroke="#80b7cc" />{[333, 367, 400].map((x, i) => <circle key={x} cx={x} cy={41 + i % 2 * 27} r="5" fill="#a7dbf0" />)}<text x="370" y="109" textAnchor="middle" className="jl-svg-label">차가운 기체</text></g>}
        <rect x="650" y="28" width="100" height="54" rx="10" fill="#22374d" stroke="#8da7c2" /><path d="M673 66L687 42L701 66Z" fill="#bad9ea" opacity=".8" /><path d="M707 45H731M707 55H731M707 65H731" stroke="#8dcbd5" strokeWidth="3" /><text x="700" y="109" textAnchor="middle" className="jl-svg-label">분광 장치</text>
      </svg>
      <Spectrum label={current.spectrum} mode={mode} lines={mode === 'continuous' ? [] : [430, 610]} />
    </div>
    <div className="jl-observation" role="status"><span className="jl-count">{visited.length} / 3 관찰</span><span>{mode === 'continuous' ? '사이사이 끊김 없이 빛이 이어지나요?' : mode === 'emission' ? '어두운 바탕에서 밝은 선이 있는 위치를 읽어 보세요.' : '밝은 바탕에서 어두운 선의 위치를 읽어 보세요.'}</span></div>
    <p className="jl-model-note">같은 기체의 대표적인 두 선만 나타낸 학습 모형입니다. 선의 폭과 색은 구별하기 쉽게 표현했습니다.</p>
  </div>;
}

function Axes({ state, onChange }: LabProps) {
  const aligned = state.axesAligned === true;
  return <div className="jl-lab">
    <div className="jl-space jl-stacked-spectra"><span className="jl-diagram-tag">{aligned ? '같은 파장 범위로 맞춘 자료' : '그림의 폭은 같지만 눈금은 다른 자료'}</span><Spectrum label="자료 가 · 475 nm의 선" mode="emission" lines={[475]} /><Spectrum label="자료 나 · 525 nm의 선" mode="emission" lines={[525]} min={aligned ? 400 : 500} max={aligned ? 700 : 600} /></div>
    <div className="jl-control-row"><button type="button" className="jl-action" onClick={() => onChange({ ...state, axesAligned: !aligned, explored: true })}>{aligned ? '원래의 서로 다른 축 보기' : '두 축을 400–700 nm로 맞추기'}<span aria-hidden="true"> ⇄</span></button><span className="jl-control-hint" role="status">{aligned ? '눈금을 맞추니 선이 어디에 놓이나요?' : '두 선의 가로 위치와 파장 값을 비교하세요.'}</span></div>
    <p className="jl-model-note">세로로 그어진 선의 길이는 파장을 뜻하지 않습니다. 파장은 가로축의 눈금으로 읽습니다.</p>
  </div>;
}

function Match({ state, onChange, kind }: LabProps) {
  const transfer = kind === 'transfer';
  const options = transfer ? [{ id: 'D', lines: [440, 590] }, { id: 'E', lines: [440, 620] }] : [{ id: 'A', lines: [430, 610] }, { id: 'B', lines: [430, 550] }, { id: 'C', lines: [470, 610] }];
  const selected = options.find(x => x.id === state.candidate) ?? options[0];
  const visited = validVisits(state.compared, options.map(x => x.id), [options[0].id]);
  const observation = transfer ? [440, 590] : [430, 610];
  const choose = (candidate: string) => { const compared = [...new Set([...visited, candidate])]; onChange({ ...state, candidate, compared, explored: compared.length === options.length }); };
  return <div className="jl-lab">
    <div className="jl-switches" aria-label="비교할 기준 원소">{options.map(option => <button type="button" key={option.id} aria-pressed={selected.id === option.id} onClick={() => choose(option.id)}><span>원소 {option.id}</span>{visited.includes(option.id) && <span className="jl-visited" aria-label="비교함">✓</span>}</button>)}</div>
    <div className="jl-space jl-stacked-spectra"><span className="jl-diagram-tag">같은 눈금에서 선의 위치 비교하기</span><Spectrum label="별빛에서 관찰한 흡수선" lines={observation} /><Spectrum label={`기준 자료 · 원소 ${selected.id}의 방출선`} mode="emission" lines={selected.lines} guides={observation} /><p className="jl-guide-key"><span aria-hidden="true">┆</span> 흰 점선은 위 자료의 흡수선 위치를 아래로 옮긴 표시예요.</p></div>
    <div className="jl-observation" role="status"><span className="jl-count">{visited.length}개 비교</span><span>기준 원소를 바꾸며 두 선의 위치를 모두 확인하세요.</span></div>
    <p className="jl-model-note">가상 원소의 파장 눈금과 원자 상태를 맞춘 비교입니다. 제시된 선은 모두 검출되며, 원소의 함량은 주어지지 않았어요.</p>
  </div>;
}

function Inference({ state, onChange }: LabProps) {
  const revealed = state.comparisonRevealed === true;
  return <div className="jl-lab">
    <div className="jl-space jl-stacked-spectra"><span className="jl-diagram-tag">같은 원소, 다른 관측 조건</span><Spectrum label="관측 ① · 조건 가" mode="emission" lines={[430, 550, 610]} />{revealed ? <div className="jl-reveal"><Spectrum label="관측 ② · 조건 나" mode="emission" lines={[430, 610]} faint /><p className="jl-guide-key">관측 ②에서는 550 nm의 약한 선을 구별하지 못했어요.</p></div> : <div className="jl-comparison-placeholder"><span aria-hidden="true">⋯</span><span>다른 조건에서 같은 원소를 관측하면?</span></div>}</div>
    <div className="jl-control-row"><button type="button" className="jl-action" disabled={revealed} onClick={() => onChange({ ...state, comparisonRevealed: true, explored: true })}>{revealed ? '두 조건을 나란히 관찰 중' : '다른 관측 조건의 자료 열기'}<span aria-hidden="true"> ⤓</span></button><span className="jl-control-hint" role="status">{revealed ? '보이는 선의 수와 밝기가 달라졌어요. 무엇까지 결론 낼 수 있을까요?' : '아래 자료를 열어 선의 수와 밝기를 비교하세요.'}</span></div>
    <p className="jl-model-note">측정 조건에 따라 보이는 선이 달라질 수 있음을 보여 주는 모형입니다. 이 자료에는 원소의 양이 주어져 있지 않습니다.</p>
  </div>;
}

export function LightLab(props: LabProps) {
  switch (props.kind) {
    case 'prism': return <Prism {...props} />;
    case 'wave': return <Wave {...props} />;
    case 'sources': return <Sources {...props} />;
    case 'axes': return <Axes {...props} />;
    case 'match': case 'transfer': return <Match {...props} />;
    case 'inference': return <Inference {...props} />;
    default: return null;
  }
}
