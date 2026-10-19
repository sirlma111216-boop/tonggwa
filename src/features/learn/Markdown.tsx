import { Children, isValidElement, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { normTerm, useTermApi } from './TermContext';

/* ---------- 도판 캡션 ---------- */
function captionFor(src: string, alt: string): { text: string; warn: boolean; title?: string } {
  const parts = alt.split('|');
  if (parts.length === 3) {
    const [title, kind, id] = parts;
    return { text: `${kind} 원본 이미지 · 재제작 필요 (${id})`, warn: true, title };
  }
  if (src.includes('/images/kice/')) return { text: '평가원 공식 예시 원문 페이지 이미지 · 원문 그대로 보존', warn: false };
  if (src.includes('/images/authored/')) return { text: '자체 과학 도해 · 공개 원리를 검증해 작성', warn: false };
  if (src.includes('/images/IMG-')) return { text: 'AI 생성 도판(검토본) · 본문 조건과 대조 필요', warn: true };
  return { text: '원본 이미지 · 재제작 필요', warn: true };
}

/* ---------- 계산식 강조: "8 ÷ 0.2 = 40" 같은 식을 코드 스팬으로 감싼다 ---------- */
const CALC_RE = /(?<![\w`])(\d[\d.,]*(?:\s?[×÷+\-−/]\s?(?:\(?[\d.,]+\)?|10[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+))+(?:\s?×\s?10[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)?\s?=\s?[\d.,]+(?:\s?×\s?10[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)?(?:\s?(?:m\/s|g\/cm³|kg\/m³|N·s|kg·m\/s|μm|μs|mm|nm|cm|km|ms|kg|m|s|g|N|J|개|배))?)(?![\w`])/g;
export function emphasizeCalc(md: string) {
  return md
    .split('\n')
    .map((line) => (line.startsWith('|') || line.startsWith('#') || line.startsWith('!') ? line : line.replace(CALC_RE, '`$1`')))
    .join('\n');
}

/* ---------- 문단 유형 판별 ---------- */
function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children);
  return '';
}

const CIRC = '①②③④⑤⑥⑦⑧⑨⑩';

function Term({ children }: { children: ReactNode }) {
  const { unit, openTerm } = useTermApi();
  const raw = textOf(children);
  const term = normTerm(raw);
  const known = !!unit && !!unit.glossary[term];
  if (!known) return <strong>{children}</strong>;
  return (
    <button type="button" className="term" onClick={() => openTerm(term)} title="용어 설명 열기">
      {children}
    </button>
  );
}

// react-markdown 이 만드는 요소의 type 과 비교하려면 모듈 수준의 고정 컴포넌트가 필요하다
const Strong = ({ children }: { children?: ReactNode }) => <Term>{children}</Term>;
const Img = ({ src, alt }: { src?: string | Blob; alt?: string }) => {
  const s = typeof src === 'string' ? src : '';
  const cap = captionFor(s, alt ?? '');
  return (
    <span className="fig">
      <a href={s} target="_blank" rel="noreferrer" title="크게 보기">
        <img src={s} alt={cap.title ?? alt ?? ''} loading="lazy" />
      </a>
      {cap.title && <span className="figtitle">{cap.title}</span>}
      <span className={`figcap${cap.warn ? ' warn' : ''}`}>{cap.text}</span>
    </span>
  );
};

function Paragraph({ children }: { children?: ReactNode }) {
  const kids = Children.toArray(children);
  const first = kids[0];
  const firstIsStrong = isValidElement(first) && (first.type === Strong || first.type === 'strong');
  const firstText = firstIsStrong ? textOf(first) : '';
  const rest = kids.slice(1);
  const restText = textOf(rest).trim();
  const whole = textOf(kids).trim();

  // 그림만 있는 문단은 그대로
  if (kids.every((k) => (isValidElement(k) && k.type === Img) || (typeof k === 'string' && !k.trim()))) return <>{children}</>;

  // 1) 정의: **용어:** 정의문
  if (firstIsStrong && /[:：]$/.test(firstText) && restText) {
    const label = firstText.replace(/[:：]$/, '');
    const isProc = CIRC.includes(restText.charAt(0));
    return (
      <div className={`callout ${isProc ? 'proc' : 'def'}`}>
        <div className="callout-label">{isProc ? '순서' : '정의'}</div>
        <div className="callout-body">
          <span className="def-term">{isValidElement(first) ? first : label}</span>
          {isProc ? <StepList text={restText} /> : <span className="def-text">{rest}</span>}
        </div>
      </div>
    );
  }
  // 2) 소표제: **그림 읽기.** / **완결 예제.** 처럼 짧은 굵은 머리말
  if (firstIsStrong && /[.。]$/.test(firstText) && firstText.length <= 10 && restText) {
    return (
      <div className="callout note">
        <div className="callout-label">{firstText.replace(/[.。]$/, '')}</div>
        <div className="callout-body">{rest}</div>
      </div>
    );
  }
  // 3) 잠깐 확인해요 → 생각해 보기
  if (/^잠깐 확인해요/.test(whole)) {
    return (
      <div className="callout think">
        <div className="callout-label">🤔 생각해 보기</div>
        <div className="callout-body">{children}</div>
      </div>
    );
  }
  // 4) 문단 전체가 굵은 핵심 문장
  if (kids.length === 1 && firstIsStrong) {
    return <p className="keyline">{children}</p>;
  }
  // 5) ① ② … 순서 나열이 본문에 있는 문단
  if (whole.startsWith('①') && whole.includes('②')) {
    return <StepList text={whole} />;
  }
  return <p>{children}</p>;
}

function StepList({ text }: { text: string }) {
  const parts = text.split(/(?=[①②③④⑤⑥⑦⑧⑨⑩])/).map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return <p>{text}</p>;
  return (
    <ol className="steps">
      {parts.map((p, i) => (
        <li key={i}>
          <span className="step-no">{i + 1}</span>
          <span>{p.replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, '')}</span>
        </li>
      ))}
    </ol>
  );
}

export function Markdown({ md, wide = false, plain = false }: { md: string; wide?: boolean; plain?: boolean }) {
  return (
    <div className={`prose${wide ? ' prose-wide' : ''}`}>
      <ReactMarkdown
        remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
        components={{
          img: Img,
          a: ({ href, children }) => (
            <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
              {children}
            </a>
          ),
          ...(plain
            ? {}
            : {
                strong: Strong,
                p: Paragraph,
                code: ({ children }) => <span className="calc">{children}</span>,
              }),
        }}
      >
        {plain ? md : emphasizeCalc(md)}
      </ReactMarkdown>
    </div>
  );
}
