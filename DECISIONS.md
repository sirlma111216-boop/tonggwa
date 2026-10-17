# 결정 기록

## 2026-10-17 · V1 첫 구현

| 요구 | 결정 | 근거·비고 |
|---|---|---|
| 지금은 학생용만, 교사(관리자) 화면은 나중에 | 학생 라우트만 구현. 관리자 메뉴·빈 버튼 없음 | 사용자 지시 + 명세 00·01 |
| 검토용 로그인 1개 (사용자 지정 아이디/비번) | `services/auth/local.ts` + `accounts.json`(SHA-256 해시). `gmai.com`·`gmail.com` 두 표기를 모두 허용 | 사용자가 적은 `gmai.com`이 오타일 가능성에 대비. 정적 사이트이므로 접근 통제가 아니라 검토용 문 |
| 로그인 후 ‘처음으로 학습하기 / 학습 이어서 하기’ → 학기 → 단원 → 바로 학습 | `/` → `/start/semester` → `/start/units/:semester` → `/learn/:unitId/:stage`. 이어서 하기는 마지막 저장 위치로 | 사용자 지시. 명세 00의 6개 메뉴(오늘의 학습/전체 학습 지도/모의고사/복습/내 노트/내 기록)는 상단 메뉴로 축약해 두고 복습·오늘의 학습은 서버 채점·복습 일정과 함께 후속 |
| 1학기/2학기 구분 | 통합과학1(교재 01~03) = 1학기, 통합과학2(04~06) = 2학기. 07(운동량 도판 풀이)은 1학기 보충 묶음으로 ‘시스템과 상호작용’ 뒤에 배치 | 07은 새 성취기준이 아니므로 32번째 묶음으로만 센다 |
| 교재를 줄이지 않고 단계로 | 단계 본문은 원고 문단을 그대로 렌더(react-markdown + GFM). 긴 개념 단계도 한 화면이되 소제목으로 구분 | 명세 01 §2. 소제목 단위의 더 잘게 나눈 learning_step은 후속 |
| 정답 비공개 | `answers/*.json`을 본문과 분리하고 제출 후에만 fetch. 단, 정적 호스팅이라 URL을 알면 받을 수 있음 | 서버 채점(Firebase Functions)으로 옮길 때 진짜 비공개가 된다. 명세 02 §5 |
| 통과 기준(5문항 80%, 서버 고정 세션) | 미구현. 지금은 ‘제출 완료’만 기록 | 서버 채점·세션 고정은 Firebase 단계에서 |
| Firebase | 미연결. `auth/firebase.ts`, `progress/firestoreBackend.ts` 자리와 `.env.example` 준비 | 사용자 지시: 나중에 붙인다 |
| Gemini API | Worker `/api/ai/review`에만 자리. 키는 Worker secret `GEMINI_API_KEY`. 키가 없으면 503 → 화면 ‘검토 연결 전’ | 사용자 지시: 나중에 필요한 부분에 붙인다. 구현 시 gemini-ai-integration 스킬 선독 |
| 배포 | Cloudflare **Workers Static Assets** + GitHub Actions(`wrangler deploy`). Pages 미사용 | 명세 02 §11. Cloudflare Workers Builds(대시보드 Git 연동) 대신 Actions를 택해 저장소 안에서 배포 과정을 볼 수 있게 함 |
| 이미지 캡션 | kice=원문 보존, authored=자체 도해, IMG-00x=AI 생성 도판(검토본), 그 외=원본 이미지·재제작 필요 | 명세 00 §7. 현재 원고 MD에는 출판사 원본 도판(REF-xx)이 직접 삽입되어 있지 않아 ‘재제작 필요’ 캡션이 뜨는 그림은 아직 없음 |
| 글꼴 | Pretendard Variable(OFL) npm 패키지의 동적 서브셋을 로컬 번들 | 명세 03: 라이선스 확인된 한글 산세리프 로컬 제공 |
| 공개 저장소 | 깃허브 저장소가 PUBLIC이라 교재 원고·정답이 공개된다 | 사용자 확인 필요. 비공개 전환 권장 |

## 정답 표기 형식 (파서가 처리하는 5가지)

`**P1 — 답.** 해설` / `**D-P1. 답.** 해설` / `- **P1:** 답. 해설` / `- **S1 정답 ②.** 해설` / `**S1: ④.** 해설`. 새 형식이 생기면 `scripts/build-content.mjs`의 `parseAnswers`가 실패하며 멈춘다.
