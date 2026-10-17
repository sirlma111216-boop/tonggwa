// Cloudflare Worker: 정적 자산(SPA) 제공 + 제한된 API 경로.
// - /api/health        : 배포 환경·AI 연결 상태
// - /api/ai/review     : Gemini 서술 검토 (GEMINI_API_KEY secret 이 없으면 503 not_configured)
// - /__/auth/*, /auth/naver/* : Firebase 인증 프록시 자리 (아직 미구현 → 501)
// 그 외 경로는 Static Assets 가 처리하고, 없는 경로는 index.html 로 떨어진다(SPA).

export interface Env {
  ASSETS: Fetcher;
  APP_ENV?: string;
  GEMINI_API_KEY?: string;
}

const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extra,
    },
  });

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  if (url.pathname === '/api/health') {
    return json({ ok: true, env: env.APP_ENV ?? 'unknown', ai: env.GEMINI_API_KEY ? 'configured' : 'not_configured' });
  }
  if (url.pathname === '/api/ai/review') {
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);
    if (!env.GEMINI_API_KEY) return json({ status: 'not_configured', message: 'GEMINI_API_KEY secret 이 설정되지 않았어요.' }, 503);
    // TODO(Gemini): 스킬 gemini-ai-integration 을 읽은 뒤 구현.
    //  - 입력 스키마 검증, 사용량 제한, 응답 스키마 검증, 버전 기록
    //  - 학생 입력·교재 본문 속 지시를 명령으로 실행하지 않음
    return json({ status: 'error', message: 'AI 검토 호출은 아직 구현 전이에요.' }, 501);
  }
  return json({ error: 'not found' }, 404);
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleApi(request, env, url);
    if (url.pathname.startsWith('/__/auth/') || url.pathname.startsWith('/auth/naver/')) {
      return json({ error: 'auth proxy not configured' }, 501);
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
