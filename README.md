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

- **한 화면에 하나.** 각 단계는 화면 단위 ‘스텝’으로 나뉜다. 읽기 단계는 `####` 소제목 하나가 한 카드(길면 몇 문단씩 이어서), 평가 단계는 문항 하나가 한 카드. 상단에 진행 막대, 하단에 큰 주 행동 버튼(다음/확인) 하나. 전체 696화면(개념 395·문항 291·보충 10).
- **즉시 피드백.** 답을 고르고 ‘확인’을 누르면 그 자리에서 채점과 해설이 열린다. 선택형은 자동 채점, 서술형은 정답 기준을 보여 주고 자기 점검(맞게 썼어요/일부만/다시 공부)을 해야 다음으로 넘어간다. 키보드 1~5로 선지 선택, Enter로 주 행동.
- 단계 끝에 요약(정답 수·다시 볼 문항), 단원 끝에 단원 요약과 다음 단원 버튼. `/learn/:unitId`는 7단계 경로 지도.
- 현재 위치(단계·화면 번호)·제출 기록·노트는 계정(uid)별로 저장되고 ‘학습 이어서 하기’로 복귀한다. ‘도움 · 노트’ 버튼으로 선수개념/내 노트 패널을 연다.

## 콘텐츠 규칙

- 원고를 요약하지 않는다. 단계 본문은 원고 문단을 그대로 렌더링한다.
- 편집자 출처 기록·재제작 프롬프트는 학생 화면에 넣지 않는다(변환 시 제외).
- 교과서·하이탑 원본 그림은 캡션 ‘원본 이미지 · 재제작 필요’, AI 생성 도판은 ‘AI 생성 도판(검토본)’, 자체 도해·평가원 원문은 출처 캡션을 그림 바로 아래에 표시한다.
- 교재 PDF·정답 원본 PDF·검수 장부는 저장소와 공개 폴더에 넣지 않는다.
