// 생성형 AI(Gemini) 검토 클라이언트.
// 브라우저는 API 키를 갖지 않는다. 항상 같은 origin 의 Worker 경로(/api/ai/review)를 거친다.
// Worker 에 GEMINI_API_KEY secret 이 없으면 'not_configured' 를 돌려주고, 화면은 '검토 연결 전' 상태를 보여 준다.
// 실제 Gemini 호출을 붙일 때는 저장소의 gemini-ai-integration 스킬(지역 차단·모델명·429 처리)을 먼저 읽는다.

export type AiReviewStatus = 'not_configured' | 'ok' | 'error';

export interface AiReviewRequest {
  questionId: string;
  prompt: string;
  rubric: string; // 교재의 정답·해설 (검토 기준)
  studentAnswer: string;
}

export interface AiReviewResult {
  status: AiReviewStatus;
  message?: string;
  review?: { correctPoints: string[]; missingPoints: string[]; wrongConditions: string[]; advice: string };
}

export async function requestAiReview(req: AiReviewRequest): Promise<AiReviewResult> {
  try {
    const r = await fetch('/api/ai/review', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (r.status === 503) return { status: 'not_configured', message: 'AI 검토가 아직 연결되지 않았어요.' };
    if (!r.ok) return { status: 'error', message: `검토 요청 실패 (${r.status})` };
    return (await r.json()) as AiReviewResult;
  } catch {
    return { status: 'error', message: '네트워크 오류로 검토를 요청하지 못했어요. 작성한 글은 이 기기에 남아 있어요.' };
  }
}

export async function aiHealth(): Promise<AiReviewStatus> {
  try {
    const r = await fetch('/api/health');
    if (!r.ok) return 'error';
    const j = (await r.json()) as { ai?: string };
    return j.ai === 'configured' ? 'ok' : 'not_configured';
  } catch {
    return 'not_configured';
  }
}
