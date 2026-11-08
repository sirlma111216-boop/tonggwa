import { useId } from 'react';
import './LightLabs.css';

export interface LabProps {
  kind: string;
  state: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}

const spectralColor = (nm: number) => nm < 450 ? '#a58aff' : nm < 490 ? '#6cafff' : nm < 530 ? '#48ddd2' : nm < 575 ? '#bce659' : nm < 610 ? '#ffd56a' : '#ff776e';
const validVisits = (value: unknown, allowed: string[], fallback: string[] = []) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && allowed.includes(item)) : fallback;

function Spectrum({ label, mode = 'absorption', lines = [], min = 400, max = 700, guides = [], height = 154, weakLines = [] }: {
  label: string;
  mode?: 'continuous' | 'emission' | 'absorption';
  lines?: number[];
  min?: number;
  max?: number;
  guides?: number[];
  height?: number;
  weakLines?: number[];
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
      <line x1={x(nm)} x2={x(nm)} y1="36" y2="76" stroke={mode === 'emission' ? spectralColor(nm) : '#091122'} strokeWidth={mode === 'emission' ? 6 : 5} opacity={weakLines.includes(nm) ? .45 : 1} />
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
  { id: 'continuous', label: '백열 전구', detail: '뜨거운 필라멘트가 빛을 내요', spectrum: '연속 스펙트럼', flow: ['백열 전구', '분광기'], description: '전구 안의 가는 금속선인 필라멘트가 뜨거워져 빛을 내요. 이 빛을 분광기로 나누어 보아요.' },
  { id: 'emission', label: '뜨거운 기체', detail: '기체에서 나온 빛을 관찰해요', spectrum: '방출 스펙트럼', flow: ['기체 방전관', '분광기'], description: '기체 방전관은 전기 에너지를 주어 희박한 기체가 빛을 내게 하는 장치예요. 이 빛을 분광기로 나누어 보아요.' },
  { id: 'absorption', label: '전구 빛 + 기체', detail: '전구의 빛이 기체를 지나가요', spectrum: '흡수 스펙트럼', flow: ['백열 전구', '기체층', '분광기'], description: '백열 전구에서 나온 빛을 상대적으로 온도가 낮은 기체에 통과시킨 뒤, 분광기로 나누어 보아요.' },
] as const;

function ApparatusImage({ name, alt, flow }: { name: string; alt: string; flow: readonly string[] }) {
  return <figure className="jl-apparatus">
    <img key={name} src={`/images/authored/spectra/${name}-v1.png`} width="2172" height="724" alt={alt} decoding="async" />
    <figcaption>{flow.map((label, i) => <span key={label}>{i > 0 && <span className="jl-flow-arrow" aria-hidden="true">→</span>}{label}</span>)}</figcaption>
  </figure>;
}

function Sources({ state, onChange }: LabProps) {
  const mode = sourceOptions.find(x => x.id === state.source)?.id ?? 'continuous';
  const current = sourceOptions.find(x => x.id === mode)!;
  const visited = validVisits(state.sourcesVisited, sourceOptions.map(x => x.id), ['continuous']);
  const choose = (next: typeof mode) => { const nextVisits = [...new Set([...visited, next])]; onChange({ ...state, source: next, sourcesVisited: nextVisits, explored: nextVisits.length === 3 }); };
  return <div className="jl-lab">
    <div className="jl-switches" aria-label="빛이 만들어지는 조건">{sourceOptions.map(option => <button type="button" key={option.id} aria-pressed={mode === option.id} onClick={() => choose(option.id)}><span>{option.label}</span>{visited.includes(option.id) && <span className="jl-visited" aria-label="관찰함">✓</span>}</button>)}</div>
    <div className="jl-space jl-source-space">
      <span className="jl-diagram-tag">{current.detail}</span>
      <ApparatusImage name={mode} alt={current.description} flow={current.flow} />
      <p className="jl-apparatus-description">{current.description}</p>
      <div className="jl-result-label">분광기로 관찰한 결과 ↓</div>
      <Spectrum label={current.spectrum} mode={mode} lines={mode === 'continuous' ? [] : [430, 610]} />
    </div>
    <div className="jl-observation" role="status"><span className="jl-count">{visited.length} / 3 관찰</span><span>{mode === 'continuous' ? '사이사이 끊김 없이 빛이 이어지나요?' : mode === 'emission' ? '어두운 바탕에서 밝은 선이 있는 위치를 읽어 보세요.' : '밝은 바탕에서 어두운 선의 위치를 읽어 보세요.'}</span></div>
    <p className="jl-model-note">장치와 빛의 경로는 이해를 돕기 위한 삽화예요. {mode === 'continuous' ? '아래는 백열 전구의 빛이 가시광선 범위에서 연속적으로 이어지는 모습을 나타낸 모형이에요.' : '방출·흡수 스펙트럼은 같은 기체의 대표적인 두 선을 비교한 학습용 자료이며, 선의 폭과 색은 구별하기 쉽게 표현했어요.'}</p>
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
    <section className="jl-space jl-measurement" aria-label="별에서 온 빛의 측정">
      <div className="jl-measurement-heading"><span>01 · 별빛 관측</span><h3>별에서 온 빛을 측정했어요</h3><p>별의 뜨거운 안쪽에서 나온 빛이 상대적으로 차가운 바깥 기체층을 지나왔어요. 이 빛을 망원경으로 모아 분광기로 조사해요.</p></div>
      <ApparatusImage name="star" alt="먼 별에서 온 빛을 망원경으로 모아 연결된 분광기로 관측하는 장면" flow={['별에서 온 빛', '망원경 · 분광기']} />
      <div className="jl-result-label">이 별빛에서 측정한 결과 ↓</div>
      <Spectrum label="흡수 스펙트럼" lines={observation} />
    </section>
    <div className="jl-measurement-bridge">이 선은 어떤 원소의 흔적일까요?<br /><strong>실험실에서 얻은 기체의 빛과 비교해요.</strong></div>
    <section className="jl-space jl-measurement" aria-label="원소 기체에서 나온 빛의 측정">
      <div className="jl-measurement-heading"><span>02 · 실험실 측정</span><h3>원소 한 종류로 된 기체에 에너지를 주면?</h3><p>{options.map(x => x.id).join('·')}는 비교 연습을 위해 이름 붙인 가상 원소예요. 방전관 속 기체의 종류를 바꾸며, 기체가 내는 빛을 분광기로 조사해요.</p></div>
      <div className="jl-switches jl-gas-switches" aria-label="방전관에 넣어 비교할 원소 기체">{options.map(option => <button type="button" key={option.id} aria-pressed={selected.id === option.id} onClick={() => choose(option.id)}><span>원소 {option.id} 기체</span>{visited.includes(option.id) && <span className="jl-visited" aria-label="비교함">✓</span>}</button>)}</div>
      <ApparatusImage name="emission" alt={`실험실에서 원소 ${selected.id} 기체가 든 방전관에 에너지를 주고, 나온 빛을 분광기로 측정하는 장면`} flow={[`원소 ${selected.id} 기체 방전관`, '분광기']} />
      <div className="jl-result-label">원소 {selected.id} 기체의 빛에서 측정한 결과 ↓</div>
      <Spectrum label="방출 스펙트럼" mode="emission" lines={selected.lines} guides={observation} />
      <p className="jl-guide-key"><span aria-hidden="true">┆</span> 흰 점선은 별빛의 흡수선 위치를 같은 눈금에 옮긴 표시예요.</p>
    </section>
    <div className="jl-observation" role="status"><span className="jl-count">{visited.length}개 비교</span><span>기체를 바꾸며, 별빛의 어두운 선과 기체의 밝은 선이 같은 파장에 있는지 확인하세요.</span></div>
    <p className="jl-model-note">장치·기체의 색·별의 크기와 거리는 실제를 그대로 재현한 것이 아닌 학습용 삽화예요. 위아래 파장 눈금은 같고, 제시된 선은 모두 검출된다고 가정해요. 원소의 함량은 주어지지 않았어요.</p>
  </div>;
}

function Inference({ state, onChange }: LabProps) {
  const revealed = state.detectorCompared === true;
  return <div className="jl-lab">
    <div className="jl-space jl-stacked-spectra">
      <span className="jl-diagram-tag">같은 기체 · 같은 양과 온도 · 같은 빛</span>
      <p className="jl-apparatus-description">① 약한 빛까지 구별하는 장치로 측정해요.</p>
      <Spectrum label="관측 ①" mode="emission" lines={[430, 550, 610]} weakLines={[550]} />
      <p className="jl-guide-key">550 nm의 빛은 다른 두 선보다 약해요.</p>
      {revealed ? <div className="jl-reveal">
        <p className="jl-apparatus-description">② 같은 빛을, 약한 빛을 구별하기 어려운 장치로 측정해요.</p>
        <Spectrum label="관측 ②" mode="emission" lines={[430, 610]} />
        <p className="jl-guide-key">430·610 nm는 같은 위치에 있어요. 550 nm의 약한 선은 검출되지 않았어요.</p>
      </div> : <div className="jl-comparison-placeholder"><span aria-hidden="true">⋯</span><span>장치의 감도가 낮아지면 어떤 선이 보일까요?</span></div>}
    </div>
    <div className="jl-control-row"><button type="button" className="jl-action" disabled={revealed} onClick={() => onChange({ ...state, detectorCompared: true, explored: true })}>{revealed ? '두 장치의 측정 결과를 비교 중' : '감도가 낮은 장치로 측정하기'}<span aria-hidden="true"> ⤓</span></button><span className="jl-control-hint" role="status">{revealed ? '없어진 것처럼 보이는 선은 어느 파장인가요? 바뀐 것은 기체일까요, 장치일까요?' : '기체는 그대로 두고, 측정 장치만 바꾸어 보세요.'}</span></div>
    <p className="jl-model-note">약한 선의 검출 여부를 비교한 학습 모형이에요. 선의 굵기는 모두 같으며, 밝기는 약한 선을 구별하기 위한 표시예요. 실제 밝기의 측정값이나 원소의 양을 나타내지는 않아요.</p>
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
