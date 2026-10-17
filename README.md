# 통합과학 학습실 (tonggwa)

고등학교 1학년 통합과학 학생용 학습 웹앱 V1. 교재 검토본 0.3(31개 성취기준·32개 학습 묶음·291문항 + 평가원 공식 예시 37문항)을 **선개념 → 개념 → 개념평가 → 심화개념 → 심화평가 → 수능대비 전략 → 수능대비평가**의 일곱 단계로 학습한다.

- 프론트: React 19 + TypeScript + Vite 8
- 배포: GitHub `main` 푸시 → GitHub Actions → Cloudflare Workers Static Assets (`wrangler deploy`)
- 회원·학습 기록: 지금은 로컬(검토용 계정 + 이 기기 저장). Firebase Auth/Firestore 어댑터 자리를 만들어 두었다.
- 생성형 AI: Gemini는 Worker 경로 `/api/ai/review`로만 호출한다(키는 Worker secret). 아직 호출 구현 전이며 화면에는 ‘검토 연결 전’으로 표시된다.

## 실행

```bash
npm install
npm run dev        # 교재 JSON 생성(predev) 후 Vite 개발 서버
npm run build      # 콘텐츠 생성 → 타입 검사 → Vite 빌드 (dist/)
npm run deploy     # build 후 wrangler deploy (로컬에서 Cloudflare 로그인 필요)
```

검토용 로그인 계정은 `src/services/auth/accounts.json`에 이메일과 비밀번호 SHA-256 해시로 들어 있다. 정적 사이트이므로 이 로그인은 접근 통제가 아니라 검토용 문이다. 실서비스 인증은 Firebase로 교체한다.

## 폴더

| 위치 | 역할 |
|---|---|
| `content/source/교재/` | 교재 원고 MD 10편 + 이미지 (앱 내용의 원본, 수정 시 여기서) |
| `content/source/index/` | 교재 구성·문항 색인, 중학교 선수개념 연결 색인 |
| `scripts/build-content.mjs` | 원고 → `public/content/` JSON 변환. 문항 ID·정답·이미지 경로를 색인과 대조하고 불일치 시 실패 |
| `public/content/` (생성물, git 제외) | `manifest.json`, `units/*.json`(본문·문항), `answers/*.json`(정답·해설, 제출 후에만 요청), `exams/kice*.json`, `images/` |
| `src/features/` | `account`(로그인), `start`(시작·학기·단원 선택), `learn`(학습 화면), `exams`(평가원 예시), `record`(기록) |
| `src/services/` | `auth`(local / firebase 자리), `progress`(localStorage / firestore 자리), `ai`(Gemini 클라이언트) |
| `worker/index.ts` | Cloudflare Worker: 정적 자산 + `/api/*` |
| `docs/spec/` | 인계받은 개발 명세 00~05, 교재 제작 기준 |
| `docs/진행기록.md`, `DECISIONS.md` | 진행 상황과 결정 기록 |

## 학생 흐름 (현재 구현)

로그인 → **처음으로 학습하기 / 학습 이어서 하기** → (처음) 1학기/2학기 선택 → 단원 선택 → 그 단원의 선개념 단계로 바로 진입 → 7단계 순서대로 학습 → 단원 마침 → 다음 단원.

- 평가 단계는 모든 문항을 응답해야 제출되고, 제출 후에만 정답·해설이 열린다. 선택형은 자동 채점, 서술형은 정답 기준과 비교한 자기 점검(맞게 썼어요/일부만/다시 공부)을 기록한다.
- 작성 중 답안은 기기에 자동 보관되고, 현재 위치·제출 기록·노트는 계정(uid)별로 저장된다.
- 오른쪽 패널: 선수개념(중학교 연결 단원) / 내 노트.

## 콘텐츠 규칙

- 원고를 요약하지 않는다. 단계 본문은 원고 문단을 그대로 렌더링한다.
- 편집자 출처 기록·재제작 프롬프트는 학생 화면에 넣지 않는다(변환 시 제외).
- 교과서·하이탑 원본 그림은 캡션 ‘원본 이미지 · 재제작 필요’, AI 생성 도판은 ‘AI 생성 도판(검토본)’, 자체 도해·평가원 원문은 출처 캡션을 그림 바로 아래에 표시한다.
- 교재 PDF·정답 원본 PDF·검수 장부는 저장소와 공개 폴더에 넣지 않는다.
