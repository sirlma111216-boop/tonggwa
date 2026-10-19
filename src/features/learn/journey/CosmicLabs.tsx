import { useId } from 'react'
import './CosmicLabs.css'

export type CosmicLabProps = {
  kind: string
  state: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}

const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

function Particle({ x, y, type, r = 21 }: { x: number; y: number; type: 'p' | 'n' | 'e'; r?: number }) {
  return <g transform={`translate(${x} ${y})`}>
    <circle r={r} fill={type === 'p' ? '#f2948d' : type === 'n' ? '#8ca4c0' : '#7ddad7'} stroke={type === 'p' ? '#ffb7ac' : type === 'n' ? '#b9cbe0' : '#b1f3ef'} strokeWidth="2" />
    <text textAnchor="middle" dominantBaseline="central" fill="#13243b" fontSize={r > 16 ? 16 : 13} fontWeight="800">{type === 'p' ? 'p⁺' : type === 'n' ? 'n⁰' : 'e⁻'}</text>
  </g>
}

function ParticleLegend() {
  return <div className="jc-legend"><span><i className="jc-dot jc-proton" />양성자 p⁺</span><span><i className="jc-dot jc-neutron" />중성자 n⁰</span><span><i className="jc-dot jc-electron" />전자 e⁻</span></div>
}

function AtomLab({ state, onChange }: CosmicLabProps) {
  const value = Number(state.electrons ?? 0)
  const count = Number.isFinite(value) ? Math.max(0, Math.min(2, Math.trunc(value))) : 0
  const cloud = useId()
  const update = (electrons: number) => onChange({ ...state, electrons, explored: state.explored === true || electrons === 2 })
  const charge = 2 - count
  return <div className="jc-lab jc-atom">
    <div className="jc-space">
      <div className="jc-space-head"><span>원자 조립대</span><span className="jc-tag">핵: 양성자 2 + 중성자 2</span></div>
      <svg viewBox="100 25 430 220" role="img" aria-label={`헬륨 원자핵에 전자 ${count}개. 전체 전하 ${charge > 0 ? '+' : ''}${charge}.`}>
        <defs><radialGradient id={cloud}><stop stopColor="#71e1db" stopOpacity=".2" /><stop offset="1" stopColor="#71e1db" stopOpacity="0" /></radialGradient></defs>
        <circle cx="320" cy="136" r="119" fill={`url(#${cloud})`} opacity={count ? 1 : .2} />
        <ellipse cx="320" cy="136" rx="112" ry="83" fill="none" stroke="#7d9ab8" strokeDasharray="4 7" opacity=".45" />
        <Particle x={303} y={119} type="p" /><Particle x={337} y={119} type="n" /><Particle x={303} y={153} type="n" /><Particle x={337} y={153} type="p" />
        {count > 0 && <Particle x={211} y={119} type="e" r={15} />}
        {count > 1 && <Particle x={429} y={153} type="e" r={15} />}
      </svg>
      <p className="jc-atom-caption">{count === 0 ? '가운데 모인 입자가 원자핵이에요' : charge === 0 ? '양전하와 음전하가 같아진 중성 원자' : '전하를 띠는 입자 · 이온'}</p>
      <div className="jc-charge"><span>전체 전하</span><strong>{charge > 0 ? '+' : ''}{charge}</strong><span>+2 − {count}</span></div>
    </div>
    <div className="jc-controls jc-electron-controls"><button type="button" disabled={count === 0} onClick={() => update(count - 1)} aria-label="전자 1개 빼기">− 전자 빼기</button><span>전자 <strong>{count}</strong>개</span><button type="button" disabled={count === 2} onClick={() => update(count + 1)}>+ 전자 넣기</button></div>
    <ParticleLegend />
    <p className="jc-model-note">입자와 전자 분포를 단순화한 모형입니다. 점선은 실제 전자의 이동 경로가 아닙니다.</p>
  </div>
}

function CoolingLab({ state, onChange }: CosmicLabProps) {
  const temperature = state.temperature === 'cool' ? 'cool' : 'hot'
  const result = state.coolingResult === temperature
  const tried = strings(state.tried)
  const cloud = useId()
  const attempt = () => {
    const nextTried = [...new Set([...tried, temperature])]
    onChange({ ...state, temperature, coolingResult: temperature, tried: nextTried, explored: nextTried.includes('hot') && nextTried.includes('cool') })
  }
  return <div className="jc-lab jc-cooling">
    <div className="jc-controls jc-temperature" role="group" aria-label="우주의 상태 선택">
      <button type="button" aria-pressed={temperature === 'hot'} onClick={() => onChange({ ...state, temperature: 'hot', coolingResult: '' })}>아주 뜨거울 때{tried.includes('hot') && <span aria-label="실험함"> ✓</span>}</button>
      <button type="button" aria-pressed={temperature === 'cool'} onClick={() => onChange({ ...state, temperature: 'cool', coolingResult: '' })}>충분히 식었을 때{tried.includes('cool') && <span aria-label="실험함"> ✓</span>}</button>
    </div>
    <div className={`jc-space jc-temperature-${temperature}`}>
      <div className="jc-space-head"><span>수소 원자핵 + 전자</span><span className="jc-tag">{temperature === 'hot' ? '고에너지 빛이 많은 환경' : '중성 원자가 유지되는 환경'}</span></div>
      <svg viewBox="0 0 640 260" role="img" aria-label={result ? temperature === 'hot' ? '결합하더라도 고에너지 빛에 의해 전자가 다시 떨어진다.' : '우주가 식어 원자핵과 전자가 중성 원자를 유지한다.' : '수소 원자핵과 전자가 떨어져 있다. 결합해 보기를 눌러 관찰한다.'}>
        <defs><radialGradient id={cloud}><stop stopColor="#7ddad7" stopOpacity=".35" /><stop offset="1" stopColor="#7ddad7" stopOpacity="0" /></radialGradient></defs>
        {result && temperature === 'cool' && <><circle cx="300" cy="126" r="102" fill={`url(#${cloud})`} /><ellipse cx="300" cy="126" rx="84" ry="58" fill="none" stroke="#8be8df" strokeDasharray="4 7" opacity=".5" /></>}
        <Particle x={300} y={126} type="p" r={27} />
        <Particle x={result ? temperature === 'hot' ? 492 : 381 : 435} y={result && temperature === 'hot' ? 77 : 126} type="e" r={17} />
        {result && temperature === 'hot' ? <><path d="M120 126q14-30 28 0t28 0t28 0t28 0t28 0" fill="none" stroke="#ffb687" strokeWidth="4" /><path d="m440 109 31-23-4 13m4-13-14 1" fill="none" stroke="#9defe7" strokeWidth="2" /><text x="190" y="75" textAnchor="middle" fill="#ffd5b5" fontSize="16">고에너지 빛</text></> : !result && <><path d="M405 126H348m0 0 10-7m-10 7 10 7" fill="none" stroke="#a0b5ca" strokeWidth="2" /><text x="369" y="177" textAnchor="middle" fill="#bfd0e2" fontSize="15">서로 끌어당김</text></>}
        <text x="320" y="233" textAnchor="middle" fill="#e8f6ff" fontWeight="700" fontSize="18">{!result ? '지금 결합하면 어떻게 될까?' : temperature === 'hot' ? '결합해도 다시 떨어질 수 있어요' : '중성 원자로 유지돼요'}</text>
      </svg>
    </div>
    <button type="button" className="jc-action" onClick={attempt}>{result ? '한 번 더 결합해 보기' : '결합해 보기'}</button>
    <div className="jc-feedback" aria-live="polite">{result ? temperature === 'hot' ? '서로 끌어당기는 힘은 있어요. 하지만 고에너지 빛이 전자를 다시 떼어 낼 수 있어 중성 원자가 오래 유지되기 어려워요.' : '우주가 식으면 전자를 떼어 내는 고에너지 빛이 줄어, 중성 원자가 안정적으로 유지될 수 있어요.' : '상태를 고르고 결합을 시도해 보세요. 두 환경의 결과를 비교합니다.'}</div>
    <p className="jc-model-note">많은 입자가 있는 우주의 변화를 수소 한 쌍으로 단순화했습니다. 크기·거리·시간은 실제 비율이 아닙니다.</p>
  </div>
}

const events = [
  { id: 'particles', number: '01', title: '양성자·중성자 등 형성', when: '아주 초기', icon: 'particles' },
  { id: 'nuclei', number: '02', title: '헬륨 원자핵 등 형성', when: '우주 탄생 후 수 분 무렵', icon: 'nuclei' },
  { id: 'atoms', number: '03', title: '중성 원자 형성', when: '약 38만 년 무렵', icon: 'atoms' },
]

function EventIcon({ kind }: { kind: string }) {
  return <svg viewBox="0 0 140 100" aria-hidden="true">
    {kind === 'particles'
      ? <><Particle x={42} y={33} type="p" r={15} /><Particle x={98} y={69} type="n" r={15} /></>
      : kind === 'atoms'
        ? <><ellipse cx="70" cy="50" rx="54" ry="37" fill="none" stroke="#81d9d5" strokeDasharray="3 4" /><Particle x={70} y={50} type="p" r={18} /><Particle x={123} y={44} type="e" r={10} /></>
        : <><Particle x={59} y={39} type="p" r={15} /><Particle x={81} y={39} type="n" r={15} /><Particle x={59} y={61} type="n" r={15} /><Particle x={81} y={61} type="p" r={15} /></>}
  </svg>
}

function TimelineLab({ state, onChange }: CosmicLabProps) {
  const order = strings(state.order).filter((id, index, all) => events.some(event => event.id === id) && all.indexOf(id) === index).slice(0, 3)
  const correct = order.join(',') === 'particles,nuclei,atoms'
  const checked = state.orderChecked === true
  const changeOrder = (next: string[]) => onChange({ ...state, order: next, orderChecked: false, explored: false })
  const move = (index: number, direction: number) => {
    const next = [...order]
    ;[next[index], next[index + direction]] = [next[index + direction], next[index]]
    changeOrder(next)
  }
  return <div className="jc-lab jc-timeline">
    <p className="jc-instruction">먼저 일어난 일부터 카드를 눌러 시간 여행을 완성하세요.</p>
    <div className="jc-event-bank">{[events[2], events[0], events[1]].map(event => <button type="button" key={event.id} disabled={order.includes(event.id)} onClick={() => changeOrder([...order, event.id])}><EventIcon kind={event.icon} /><strong>{event.title}</strong><span>{order.includes(event.id) ? '아래에 놓았어요' : '+ 순서에 놓기'}</span></button>)}</div>
    <ol className="jc-event-order">{[0, 1, 2].map(index => {
      const event = events.find(item => item.id === order[index])
      return <li key={index} className={event ? 'jc-slot-filled' : ''}><span className="jc-order-number">{index + 1}</span>{event ? <><div className="jc-ordered-event"><strong>{event.title}</strong>{checked && correct && <span>{event.when}</span>}</div><div className="jc-order-controls"><button type="button" disabled={index === 0} aria-label={`${event.title} 앞으로 옮기기`} onClick={() => move(index, -1)}>↑</button><button type="button" disabled={index === order.length - 1} aria-label={`${event.title} 뒤로 옮기기`} onClick={() => move(index, 1)}>↓</button><button type="button" aria-label={`${event.title} 순서에서 빼기`} onClick={() => changeOrder(order.filter((_, itemIndex) => itemIndex !== index))}>×</button></div></> : <span className="jc-slot-empty">{index === 0 ? '가장 먼저 일어난 일' : index === 1 ? '그다음 일어난 일' : '가장 나중에 일어난 일'}</span>}</li>
    })}</ol>
    <button type="button" className="jc-action" disabled={order.length !== 3} onClick={() => onChange({ ...state, order, orderChecked: true, explored: correct })}>순서 확인하기</button>
    <div className={`jc-feedback ${checked && correct ? 'jc-success' : ''}`} aria-live="polite">{checked ? correct ? '맞아요. 수 분 무렵에는 원자핵이, 약 38만 년 무렵에는 전자와 결합한 중성 원자가 만들어졌어요.' : '원자핵을 이루는 입자가 먼저 필요해요. 그리고 중성 원자가 되려면 원자핵과 전자가 결합해야 해요. 순서를 다시 바꿔 보세요.' : '드래그하지 않아도 돼요. 카드를 놓은 뒤 화살표로 순서를 바꿀 수 있어요.'}</div>
    <p className="jc-model-note">세 칸은 사건의 순서를 나타냅니다. 시간 간격을 같은 비율로 그린 그림이 아닙니다.</p>
  </div>
}

function RatioLab({ state, onChange }: CosmicLabProps) {
  const view = state.ratioView === 'mass' ? 'mass' : 'count'
  const mass = view === 'mass'
  const switchView = (next: string) => onChange({ ...state, ratioView: next, explored: state.explored === true || next === 'mass' })
  return <div className="jc-lab jc-ratio">
    <div className="jc-controls jc-ratio-tabs" role="group" aria-label="원소를 비교할 기준"><button type="button" aria-pressed={!mass} onClick={() => switchView('count')}>개수로 보기</button><button type="button" aria-pressed={mass} onClick={() => switchView('mass')}>질량으로 보기</button></div>
    <div className="jc-ratio-display">
      <div className="jc-ratio-pile"><span className="jc-element-label"><i className="jc-dot jc-hydrogen" />수소</span><div className={`jc-hydrogen-grid ${mass ? 'jc-mass-view' : ''}`} aria-label={mass ? '수소 질량 단위 12개' : '수소 원자 12개'}>{Array.from({ length: 12 }, (_, index) => <span key={index}>{mass ? '1' : 'H'}</span>)}</div><strong>{mass ? '12 × 1 = 12' : '12개'}</strong></div>
      <span className="jc-ratio-colon">:</span>
      <div className="jc-ratio-pile"><span className="jc-element-label"><i className="jc-dot jc-helium" />헬륨</span><div className="jc-helium-container">{mass ? <div className="jc-helium-mass" aria-label="헬륨 원자 하나의 질량 단위 4개"><span>1</span><span>1</span><span>1</span><span>1</span></div> : <span className="jc-helium-atom">He</span>}</div><strong>{mass ? '1 × 4 = 4' : '1개'}</strong></div>
    </div>
    <div className="jc-ratio-answer" aria-live="polite"><span>{mass ? '질량의 비' : '원자 수의 비'}</span><strong>{mass ? '12 : 4 = 3 : 1' : '12 : 1'}</strong></div>
    <p className="jc-feedback">{mass ? '헬륨 원자 1개의 질량은 수소 원자 약 4개와 같아요. 원자를 그대로 두고 비교 기준만 바꿨는데, 비가 달라졌어요.' : '수소 원자 12개와 헬륨 원자 1개를 준비했어요. 이번에는 같은 원자들을 질량으로 비교해 보세요.'}</p>
    <p className="jc-model-note">계산 모형: 수소 원자 질량을 1, 헬륨을 4로 어림했습니다. 도형 크기는 실제 원자 크기를 뜻하지 않습니다.</p>
  </div>
}

function OriginsLab({ state, onChange }: CosmicLabProps) {
  const focus = ['H', 'He', 'other'].includes(String(state.focus)) ? String(state.focus) : 'all'
  const source = state.source === 'stars' ? 'stars' : state.source === 'early' ? 'early' : ''
  const seen = strings(state.originsSeen)
  const selectSource = (next: string) => {
    const nextSeen = [...new Set([...seen, next])]
    onChange({ ...state, source: next, originsSeen: nextSeen, explored: nextSeen.includes('early') && nextSeen.includes('stars') })
  }
  return <div className="jc-lab jc-origins">
    <div className="jc-composition-heading"><strong>우주 보통 물질의 원소 구성</strong><span>100칸 = 질량 100%</span></div>
    <div className="jc-composition"><div className="jc-mass-grid" role="img" aria-label="질량 비율을 나타낸 100칸 모형. 수소 약 74퍼센트, 헬륨 약 24퍼센트, 나머지 약 2퍼센트.">{Array.from({ length: 100 }, (_, index) => {
      const element = index < 74 ? 'H' : index < 98 ? 'He' : 'other'
      return <i key={index} className={`jc-tile jc-tile-${element} ${focus !== 'all' && focus !== element ? 'jc-dimmed' : ''}`} />
    })}</div><div className="jc-element-filters" role="group" aria-label="강조할 원소 선택">{[{ id: 'H', label: '수소', percent: '약 74%' }, { id: 'He', label: '헬륨', percent: '약 24%' }, { id: 'other', label: '나머지 원소', percent: '약 2%' }].map(element => <button type="button" aria-pressed={focus === element.id} key={element.id} onClick={() => onChange({ ...state, focus: focus === element.id ? 'all' : element.id })}><i className={`jc-dot jc-tile-${element.id}`} /><span>{element.label}</span><strong>{element.percent}</strong></button>)}</div></div>
    <p className="jc-instruction">이 원소들은 어디에서 왔을까요? 두 장소의 역할을 열어 보세요.</p>
    <div className="jc-controls jc-origin-tabs" role="group" aria-label="원소가 만들어진 곳"><button type="button" aria-pressed={source === 'early'} onClick={() => selectSource('early')}>초기 우주{seen.includes('early') && ' ✓'}</button><button type="button" aria-pressed={source === 'stars'} onClick={() => selectSource('stars')}>별의 내부{seen.includes('stars') && ' ✓'}</button></div>
    <div className="jc-origin-result" aria-live="polite">{source === 'early' ? <><span className="jc-origin-symbol">H + He</span><div><strong>우주에 있는 헬륨의 대부분은 초기 우주에서</strong><p>초기 우주에서는 수소와 헬륨 원자핵이 주를 이루었어요. 그때 만들어진 헬륨이 오늘날 우주 헬륨의 대부분을 차지해요.</p></div></> : source === 'stars' ? <><span className="jc-origin-symbol jc-star-symbol">★</span><div><strong>별의 내부에서도 헬륨이 만들어져요</strong><p>별 내부의 수소 핵융합은 헬륨을 만들어요. 하지만 ‘별에서도 만들어진다’가 ‘대부분 별에서 만들어졌다’는 뜻은 아니에요.</p></div></> : <p>위의 장소를 누르면 그곳에서 만들어지는 원소를 볼 수 있어요.</p>}</div>
    <p className="jc-model-note">대표적인 현재 우주 원소 질량비의 근삿값입니다. 조사 대상·모형에 따라 달라지며, 암흑 물질과 암흑 에너지는 포함하지 않습니다.</p>
  </div>
}

export function CosmicLab(props: CosmicLabProps) {
  switch (props.kind) {
    case 'atom': return <AtomLab {...props} />
    case 'cooling': return <CoolingLab {...props} />
    case 'timeline': return <TimelineLab {...props} />
    case 'ratio': return <RatioLab {...props} />
    case 'origins': return <OriginsLab {...props} />
    default: return null
  }
}
