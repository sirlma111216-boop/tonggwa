# 작업 규칙 (tonggwa)

- 먼저 `README.md`, `DECISIONS.md`, `docs/진행기록.md`를 읽는다. 원래 개발 명세는 `docs/spec/00`~`05`.
- 교재 내용은 `content/source/교재/*.md`가 원본이다. 앱 화면에 본문을 직접 박아 넣지 말고 `scripts/build-content.mjs` → `public/content/`를 통해 가져온다. 변환 스크립트는 문항 수·정답·이미지 경로를 색인과 대조하며 불일치 시 실패해야 한다.
- 원고를 요약하거나 필수 설명을 접지 않는다. 정답·해설은 제출 전 화면에 노출하지 않는다. 편집자 기록·재제작 프롬프트는 학생 화면에 넣지 않는다.
- 학생용 V1만. 교사·관리자 화면은 사용자가 요청할 때 붙인다(1:1 학습 전제).
- Firebase(회원·기록)와 Gemini(서술 검토)는 어댑터 자리만 있다. Gemini를 붙일 때는 `gemini-ai-integration` 스킬을 먼저 읽고, 키는 Worker secret으로만 둔다.
- 배포: `main` 푸시 → GitHub Actions → `wrangler deploy`(Cloudflare Workers Static Assets). Pages·Firebase Hosting으로 바꾸지 않는다.
- 비밀값·교재 PDF·정답 원본 PDF·학생 데이터를 저장소나 `public/`에 넣지 않는다.
- 외부 설정 잔여 항목은 `docs/외부설정_체크리스트.md`에 유지한다.
