import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function captionFor(src: string): { text: string; warn: boolean } {
  if (src.includes('/images/kice/')) return { text: '평가원 공식 예시 원문 페이지 이미지 · 원문 그대로 보존', warn: false };
  if (src.includes('/images/authored/')) return { text: '자체 과학 도해 · 공개 원리를 검증해 작성', warn: false };
  if (src.includes('/images/IMG-')) return { text: 'AI 생성 도판(검토본) · 본문 조건과 대조 필요', warn: true };
  return { text: '원본 이미지 · 재제작 필요', warn: true };
}

export function Markdown({ md, wide = false }: { md: string; wide?: boolean }) {
  return (
    <div className={`prose${wide ? ' prose-wide' : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt }) => {
            const s = typeof src === 'string' ? src : '';
            const cap = captionFor(s);
            return (
              <span className="fig">
                <img src={s} alt={alt ?? ''} loading="lazy" />
                <span className={`figcap${cap.warn ? ' warn' : ''}`}>{cap.text}</span>
              </span>
            );
          },
          a: ({ href, children }) => (
            <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {md}
      </ReactMarkdown>
    </div>
  );
}
