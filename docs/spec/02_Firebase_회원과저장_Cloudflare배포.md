# 학생용 V1 구현 명세 — Firebase 회원가입·학습 기록·이용권 확장

공식 문서 확인일: 2026-10-17. 이 문서는 개발 프롬프트에 넣을 구현 지시이며 실제 Firebase 프로젝트 생성·접속·배포·결제 연결을 했다는 뜻이 아니다. 아래 기술 선택은 사용자 요구에 맞춘 설계안이다. 기존 상업화 계획의 관계형 DB 우선 제안은 이 V1에서 **Firebase Authentication + Cloud Firestore + Cloud Storage + Firebase Cloud Functions**로 대체한다. 개발·배포 흐름은 **Claude로 Vite/React/TypeScript 개발 → GitHub → Cloudflare Workers Static Assets 및 GitHub Builds**로 고정한다. 웹앱 프런트엔드를 Firebase Hosting에 배포하지 않는다. 학생 화면만 구현한다. 교사·학원·학교·학부모 대시보드와 결제 화면은 V2 이후이며, V1에 관리 화면을 먼저 만들지 않는다.

## 1. 계정은 학습 기록의 영구적인 주인이다

Firebase Auth `uid`를 학생의 내부 기준 ID로 쓴다. 이메일·닉네임·학교명·로그인 공급자 ID를 학습 문서의 기본 키로 쓰지 않는다. 이메일이 바뀌거나 Google과 Apple을 함께 연결해도 같은 `uid`의 노트·답안·진도·오답·사용권을 유지한다. 학생이 처음 로그인하면 서버의 `completeOnboarding`이 프로필·정책 동의·초기 이용권을 한 번만 만든다. 로그인 성공과 온보딩 완료는 구별한다.

학생 메뉴는 개발 시작 프롬프트(00)의 전체 구성인 `오늘의 학습 / 전체 학습 지도 / 모의고사 실전 / 복습 / 내 노트 / 내 학습 기록`을 따른다. 계정은 상단 프로필에서 열며, 이 계정·저장 명세가 학습 메뉴를 축소하지 않는다. 계정 설정에서 연결된 로그인 방식, 이메일 확인 상태, 기기 저장 설정, 데이터 내보내기·삭제 요청을 볼 수 있게 한다. 실명·학교·반·전화번호·성별·주소·주민등록번호는 V1 필수 가입 항목에 넣지 않는다. 이름은 별명으로 충분하다. 학년은 선택형이며 생년월일 전체를 기본 수집하지 않는다. 연령 확인에 필요한 항목·법정대리인 확인 방법은 아래 미성년자 절에 따라 확정한다.

## 2. 다섯 가지 로그인 방식을 실제로 연결한다

| 로그인 방식 | 구현 방식 | 외부 설정과 주의점 |
|---|---|---|
| Google | Firebase `GoogleAuthProvider` | 프로젝트에서 provider 활성화, 승인된 도메인·OAuth 표시명·지원 이메일 설정. 연락처 등 추가 scope 요청 금지. |
| Microsoft | Firebase `OAuthProvider('microsoft.com')` | Microsoft 앱 등록과 client ID/secret 설정. 개인 Microsoft 계정과 학교·조직 계정을 모두 허용할 대상 계정 유형을 명시하고 실제로 각각 시험. 학교 조직이 동의를 차단할 때 대체 가입 경로 제공. |
| Apple | Firebase `OAuthProvider('apple.com')` | Apple 개발자 설정의 Service ID, Team ID, key ID, private key, 허용 도메인/return URL. 비공개 이메일도 정상 계정으로 취급. |
| 네이버 | 자체 서버에서 네이버 OAuth를 검증한 뒤 Firebase custom token으로 로그인 | Firebase 네이티브 `naver.com` provider가 있다고 가정하지 않는다. 네이버 앱 등록·검수·callback 설정과 별도 서버 흐름이 필요하다. |
| 이메일 | Firebase 이메일/비밀번호 가입·이메일 인증·재설정 | 비밀번호를 Firestore나 서버 로그에 저장하지 않는다. 정책은 Firebase 설정과 UI가 일치하도록 하고 이메일 열거 방지를 켠다. |

Google·Microsoft·Apple은 Firebase가 제공하는 web SDK의 로그인 흐름을 사용한다. 데스크톱은 사용자 버튼 클릭에 이어 popup을 열고, 차단·취소·쿠키 제한에 대응한다. 필요 시 redirect로 전환하며 **Cloudflare 외부 호스팅에 해당하는** Firebase redirect 지침을 적용한다. Firebase Hosting 전용 방식처럼 `authDomain`만 Cloudflare 도메인으로 바꾸면 안 된다. 이 앱의 구체적인 popup·redirect·투명 프록시 계약은 11절을 따른다. 임의 URL로 돌아가게 하지 말고 `returnTo`는 앱 내부 경로 허용 목록만 받는다. callback의 오류에도 학생이 원래 학습 위치를 잃지 않게 한다. [Google](https://firebase.google.com/docs/auth/web/google-signin), [Microsoft](https://firebase.google.com/docs/auth/web/microsoft-oauth), [Apple](https://firebase.google.com/docs/auth/web/apple), [redirect 지침](https://firebase.google.com/docs/auth/web/redirect-best-practices)

이메일 가입자는 인증 메일을 보낸 뒤 “메일 확인 중” 상태를 보여 준다. 주소 변경, 재발송 대기, 받은편지함을 못 찾을 때의 안내, 재설정 만료·이미 사용한 링크·다른 계정으로 열린 링크를 처리한다. 인증 전에는 공개 미리보기만 제공하고 개인 학습 기록의 본격 저장·AI 요청은 인증 및 온보딩 완료 후 허용한다. 로그인 실패 문구로 특정 이메일의 회원 여부를 누설하지 않는다. `fetchSignInMethodsForEmail`의 결과를 가입 판별의 필수 조건으로 삼지 않는다. [비밀번호 정책·이메일 열거 방지](https://firebase.google.com/docs/auth/web/password-auth), [인증 메일·계정 관리](https://firebase.google.com/docs/auth/web/manage-users)

이메일/비밀번호 계정의 이메일 인증 조건을 모든 소셜 계정에 무차별 적용하지 않는다. 서버의 `accountEligibility`는 로그인 방식별 증거와 온보딩 상태를 검사한다. 네이버는 서버가 확인한 고유 회원 ID를 로그인 증거로 사용하고, 네이버가 돌려준 이메일 문자열을 근거 없이 Firebase의 `emailVerified=true`로 올리지 않는다. 소셜 공급자가 이메일을 주지 않아도 안전하게 확인한 계정 ID로 학습 계정을 만들 수 있게 하며, 추가 연락 이메일을 받는다면 별도로 확인한다. 계정의 소유 증명과 연락 이메일의 확인은 별개의 상태다.

Apple의 숨긴 이메일은 정상 연락 주소다. Firebase가 보내는 인증·계정 안내 메일이 도착하도록 Apple private email relay에 Firebase 발신 주소 또는 실제 사용 발신 도메인을 등록한다. Apple의 이름 정보는 첫 승인 때만 제공될 수 있으므로 이름이 없다고 가입을 실패시키지 않는다. 익명화된 Apple ID에 식별 가능한 다른 계정/이메일을 연결할 때 필요한 명시적 동의를 연결 화면에 둔다. [Apple 연동 및 relay](https://firebase.google.com/docs/auth/web/apple)

### 네이버 custom authentication의 서버 계약

1. `/auth/naver/start`는 추측할 수 없는 `state`를 만들고 짧은 유효기간의 서버 저장소에 해시·생성 시각·사용 여부·시작 목적(`signIn`/`link`)·허용된 복귀 경로를 기록한다. 브라우저에는 Secure/HttpOnly/SameSite 정책을 검토한 세션 쿠키를 사용한다. URL에 Firebase ID token이나 custom token을 싣지 않는다.
2. 연결 목적이라면 서버가 현재 Firebase ID token과 최근 재인증을 먼저 확인하고, 해당 `uid`를 state의 서버 레코드에 묶는다. 브라우저가 전달한 `uid`를 믿지 않는다.
3. `/auth/naver/callback`은 state 일치·만료·일회성·동일 브라우저 세션을 확인한 후 code를 네이버 token endpoint에서 교환한다. client secret은 Secret Manager에 둔다.
4. 서버가 access token으로 네이버 회원 프로필 API를 호출하여 응답 상태와 앱에 대해 발급된 고유 회원 식별자를 확인한다. 브라우저가 보낸 프로필이나 이메일을 신원 증거로 받지 않는다. 앱별 네이버 ID의 변경/재가입 가능성을 고려해 이력을 둔다.
5. 서버 전용 `authIdentityMappings/{providerSubjectHash}`에서 네이버 ID를 기존 Firebase UID로 조회한다. 최초 가입만 새 UID를 만든다. 동일 ID의 동시 최초 가입은 예약 문서/멱등 키로 한 계정만 생성하고, Auth와 Firestore 사이 중간 실패는 재실행 가능한 온보딩 작업으로 복구한다.
6. 서버가 Admin SDK `createCustomToken(uid)`으로 발급하고, 브라우저는 인증된 완료 응답에서 받아 `signInWithCustomToken`을 호출한다. custom token은 로그·URL·장기 저장소에 남기지 않는다. 완료 코드를 쓰는 경우 짧은 만료·일회 사용·브라우저 세션 바인딩을 적용한다.
7. 연결 모드에서는 해당 네이버 ID가 다른 UID에 이미 묶였는지 원자적으로 검사한다. 기존 계정에 충돌하면 자동 병합하지 않고 안전한 복구 경로를 안내한다. 기본 Firebase `providerData`에 네이버가 네이티브 provider처럼 표시될 것이라고 가정하지 말고 서버의 연결 정보로 계정 설정 UI를 만든다.
8. 로그인만을 위해 받은 네이버 access/refresh token은 후속 필요가 없다면 폐기한다. 연동 해제·탈퇴 시 필요한 네이버 연결 해제 절차와 재인증 흐름은 구현하고 검증한다. token을 장기 보관해야 한다면 그 목적·기간을 별도로 확정하고 암호화·접근 통제한다.

이 절의 상세 상태 관리·멱등 처리·복구 방식은 본 앱을 위한 설계다. 네이버 OAuth의 state/code/token/프로필 조회 계약과 Firebase custom token 흐름을 기반으로 구현한다. [네이버 개발가이드](https://developers.naver.com/docs/login/devguide/devguide.md), [네이버 Web 구현](https://developers.naver.com/docs/login/web/web.md), [Firebase custom 인증](https://firebase.google.com/docs/auth/web/custom-auth), [서버 custom token 생성](https://firebase.google.com/docs/auth/admin/create-custom-tokens)

### 계정 연결과 충돌

- 사용자가 현재 계정으로 로그인하고 최근 재인증한 다음, 새 공급자도 직접 인증하여 같은 UID에 연결한다. `linkWithPopup`·`linkWithRedirect`·`linkWithCredential` 등 실제 SDK 계약을 따른다. 선택한 SDK 버전을 고정하고 연결 관련 알려진 문제와 해결 상태를 구현 시 재확인한다.
- 이메일 문자열이 같다는 이유로 노트·구매권·계정을 자동 병합하지 않는다. Firebase가 반환한 동일 이메일 충돌은 기존 방식으로 재인증한 뒤 pending credential을 안전하게 연결한다. 기존 로그인 방식을 몰라도 복구할 수 있게 일반적인 안내를 제공한다.
- 두 UID에 각각 기록이 이미 있으면 증명 없는 자동 이전을 금지한다. V1은 명시적 두 계정 소유 증명과 기록 충돌 검토를 거치는 복구 절차를 준비한다. 교사/관리자 웹 UI를 새로 만드는 대신 권한이 제한된 운영 절차·서버 작업으로 처리할 수 있다.
- 마지막 유효 로그인 수단은 해제할 수 없게 한다. Apple 익명 계정 연결 동의를 별도로 처리한다. 계정 연결 후에는 `uid`, 응시 횟수, 노트, 복습 일정, 이용권이 그대로인지 검증한다.

[Firebase 계정 연결](https://firebase.google.com/docs/auth/web/account-linking)

## 3. 데이터 모델: 학생 기록과 승인된 콘텐츠의 분리

콘텐츠의 기준 원본은 교재다. import 과정에서 `bookVersion`, `sourceFile`, `sourceHeading`, `achievementCode`, `conceptId`, `questionId`, `questionVersion`을 유지한다. 학생에게 보여 주는 문항 본문과 서버 채점용 정답·루브릭은 별도 저장한다. 전체 정답을 브라우저에 미리 내려 주거나 숨겨진 HTML 속성으로 넣지 않는다. 해설은 제출 후 제공 정책에 따라 서버에서 반환한다. 공개 학습용 본문에 포함된 풀이 예시와 평가용 비공개 정답은 구별한다.

| 경로/영역 | 핵심 필드 | 읽기/쓰기 주체 |
|---|---|---|
| `users/{uid}` | `nickname`, `gradeBand`, `onboardingStatus`, `locale`, `createdAt`, `schemaVersion` | 본인 읽기. 허용된 개인 설정만 본인 수정. 상태/권한은 서버만. |
| `users/{uid}/preferences/{id}` | 글자 크기, 영상 자막, 동작 줄이기, 알림 선택, 신뢰 기기 설정 | 본인. 길이·enum·타입 검증. |
| `users/{uid}/notes/{noteId}` | `conceptId`, `contentRevision`, `currentRevisionId`, `updatedAt`, `deletedAt` | 본인 읽기, 노트 저장 API를 통한 쓰기. |
| `users/{uid}/noteRevisions/{revisionId}` | `noteId`, `baseRevision`, `body`, `clientMutationId`, `serverAt` | 본인 읽기, 서버가 추가. 과거 원문을 덮어쓰지 않음. |
| `users/{uid}/activityDrafts/{draftId}` | `activityVersion`, `response`, `clientMutationId`, `localSequence`, `updatedAt` | 본인만 제한된 직접 저장 또는 서버 저장. 채점값 없음. |
| `users/{uid}/attempts/{attemptId}` | 문항·활동 버전, 원답안, 제출 시각, 힌트 사용, mode, score, gradingVersion, evidence | 본인 읽기. 확정 답안·채점 결과는 서버만 추가. |
| `users/{uid}/assessmentSessions/{sessionId}` | 서버가 사전 고정한 5개 probe의 ID/버전/형식/skill, gateSession 정책, 상태, 최초 답안, 연습 전환 여부 | 본인 읽기, 서버만 쓰기. |
| `users/{uid}/exposureEvents/{eventId}` | 문항·instance·exposureGroup·reasoningFamily, 힌트/정답/해설 종류, gateSession, 서버 제공 시각 | 서버만 추가. 본인용 필요한 요약만 조회. |
| `users/{uid}/mastery/{conceptId}` | `state`, `evidenceAttemptIds`, `policyVersion`, `scoreSummary`, `lastVerifiedAt` | 본인 읽기, 서버만 쓰기. |
| `users/{uid}/reviewQueue/{reviewId}` | `questionFamilyId`, `conceptId`, `dueAt`, `reason`, `stage`, `lastAttemptId` | 본인 읽기, 서버만 쓰기. |
| `users/{uid}/learningEvents/{eventId}` | 완료·복습·정정·이전 등 학습 사건, 콘텐츠 버전, `serverAt` | 본인에게 필요한 일부만 읽기, 서버만 쓰기. |
| `users/{uid}/feedbackJobs/{jobId}` | 답안/노트 revision, 상태, 피드백, 참조 근거, 비용 요약, model/prompt version | 본인 읽기, 서버만 쓰기. |
| `consentRecords/{recordId}` | UID 또는 임시 가입 ID, 정책 종류·버전·확인 방법·시각·철회 상태 | 서버만, 본인용 최소 조회 API 제공. |
| `authIdentityMappings/{id}` | provider, provider subject 식별용 해시, UID, 연결/해제 이력 | 서버만. 이메일 검색 API 공개 금지. |
| `contentReleases/{releaseId}` | 교재 버전, manifest hash, 게시 상태, 포함된 concept/step/question 버전 | 게시된 안전 필드만 조회. 서버/배포 절차만 쓰기. |
| `conceptVersions/{id}` / `stepVersions/{id}` | 학습 순서, 선개념, 단계 유형, 본문·활동 참조, 영상 슬롯 | 승인된 버전만 제공. 학생 쓰기 금지. |
| `questionVersions/{id}` | 본문, 선택지, 도표, 난이도, 개념/문항 family, 근거·출처 | 승인된 문항 본문을 서버/API에서 제공. 학생 쓰기 금지. |
| `answerKeys/{questionVersionId}` | 정답·선지 판정·채점 규칙·해설·핵심 오개념 | 브라우저 직접 접근 전부 금지. |
| `mediaAssets/{assetId}` | 파일 경로·버전·대체텍스트·출처·재제작 상태·공개 범위 | 승인된 필드만 학생에게. 학생 쓰기 금지. |
| `entitlements/{entitlementId}` | 아래 이용권 계약 | 본인에게 서버가 계산한 사용 가능 범위만 제공. 쓰기는 서버만. |
| `operationReceipts/{id}` | UID, 요청 종류, 멱등 키, 상태, 결과 참조 | 서버만. 중복 제출·중복 발급 방지. |

전체 노트·전체 응시 기록을 `users/{uid}` 하나의 거대한 배열로 저장하지 않는다. Firestore 문서 크기 상한과 실제 조회 단위를 고려해 분리한다. 긴 본문·노트 원문은 불필요한 필드 인덱스를 끄고, 이미지·영상은 Storage에 둔다. 일반 목록은 페이지 단위로 읽고 모든 응시 이력에 상시 실시간 listener를 붙이지 않는다. [Firestore 제한](https://firebase.google.com/docs/firestore/quotas), [과금 단위](https://firebase.google.com/docs/firestore/pricing)

필수 인덱스는 저장소에 선언한다: 복습 큐 `state + dueAt`, 응시 기록 `conceptId + submittedAt`, 노트 `conceptId + updatedAt`, 피드백 작업 `state + createdAt`. 실제 쿼리를 기준으로 composite index를 만들고 존재하지 않는 인덱스를 콘솔에서 수동으로 추가한 채 배포 문서에 누락하지 않는다.

## 4. 저장과 동기화: 타이핑한 내용은 사라지지 않아야 한다

학생 화면에는 `저장 중 / 저장됨 / 기기에 임시 저장됨·연결 후 전송 / 저장 실패·다시 시도`를 구별해 표시한다. 서버에서 확인되지 않은 기록을 “저장됨”이라고 표시하지 않는다. 노트는 편집 중 800ms 정도의 입력 중단에 맞춰 자동 저장하고, 화면 이동 시 미전송 상태를 보존한다. 수치는 구현 중 조정할 초기 설정이다.

초기 기본은 메모리 캐시 및 세션 인증이다. “내 기기에 로그인 유지”를 선택한 신뢰 기기에서만 디스크 캐시와 장기 로그인 유지를 켠다. 학교 공용 PC에서는 영구 캐시를 기본으로 켜지 않는다. 사용자 전환·로그아웃 때 listener, UI 상태, 대기열, 임시 파일을 정리하고 이전 사용자의 캐시를 다음 사용자에게 노출하지 않는다. pending 제출이 있으면 연결 복구·저장 확인·안전한 로그아웃 선택을 제공한다.

Firebase Auth의 기본 지속성에 기대지 말고 위 정책에 맞는 `setPersistence`를 로그인 시작 전에 명시한다. 브라우저 세션 인증과 Firestore 디스크 캐시는 서로 다른 설정이다. 하나를 끈 것으로 다른 하나도 지워졌다고 판단하지 않는다. [인증 상태 지속성](https://firebase.google.com/docs/auth/web/auth-state-persistence)

Firestore offline persistence는 일부 데이터를 캐시하고 재연결 시 동기화하며, 같은 문서 충돌은 기본적으로 마지막 쓰기가 이긴다. 이것만으로 노트 충돌 해결이 끝났다고 간주하지 않는다. 이 앱은 revision 및 `baseRevision`을 확인해 두 기기에서 동시에 수정한 글을 모두 보존하고 “다른 기기의 수정본이 있어요” 비교·선택 화면을 제공한다. 자동 병합이 확실하지 않으면 원문을 지우지 않는다. [오프라인 캐시와 충돌 특성](https://firebase.google.com/docs/firestore/manage-data/enable-offline)

각 제출은 `clientMutationId`/`attemptId`를 재사용해 재전송한다. 연결이 끊겼다고 새 ID로 중복 제출하지 않는다. 서버 확인 전 답안은 `pending`으로 남기고 재연결 시 제출한다. 오프라인에서는 이미 받은 설명 읽기·노트 작성·임시 풀이를 허용하되 서버 채점·다음 단계 확정은 온라인 복구 후 처리한다. 임시 미채점 답을 이용해 성취도나 사용권을 직접 수정하지 않는다. 미채점 중에도 이미 개방된 본문·복습을 계속 볼 수 있다.

## 5. 진급·성취도·오답을 서버에서 일관되게 판정한다

채점은 `submitAttempt` 서버 함수가 수행한다. 요청의 UID는 Firebase 인증에서 가져오며, 클라이언트가 보낸 score/correct/mastery/unlocked/evidenceEligibility/독립 풀이 여부를 판정 근거로 믿지 않는다. 문항 버전·학습 단계·세션·이용권·서버 노출 이력을 검증한 후 승인된 정답표·루브릭으로 계산한다. 클라이언트가 보내는 도움 사용 선언은 보조 기록일 뿐이다.

힌트·정답·해설 제공 endpoint는 응답을 보내기 전에 `exposureEvents`에 서버 제공 이력을 기록한다. 앱이 정답을 보여 주고 클라이언트가 나중에 노출 이력을 보고하는 구조를 금지한다. 진행 중인 gateSession에서 핵심 힌트나 정답·해설을 요청하면 서버가 먼저 세션을 `practice`로 전환하고, 그 세션 전체를 진급용 독립 증거에서 제외한 다음 자료를 제공한다. 이때 학생의 원답·학습 시도는 보존한다. 제출과 힌트 요청이 동시에 도착해도 같은 세션 상태를 트랜잭션에서 확인해 순서가 일관되어야 한다. 5개 답안을 모두 확정하여 채점이 끝난 세션의 사후 해설 열람은 당시의 독립 풀이 기록을 소급 취소하지 않지만, 해당 문항의 다음 시도는 이미 노출된 연습으로 분류한다.

원자 처리 순서: `attemptId` 처리 여부 → 발급된 session과 문항 버전 확인 → 답안/채점 결과 기록 → 해당 개념의 evidence 추가 → 정책 버전에 따른 mastery 갱신 → 오답/지연 복습 큐 갱신 → 처리 영수증 기록. 이 핵심 상태 변경은 Firestore transaction으로 묶는다. 서버가 여러 번 실행되어도 결과는 한 번만 반영되어야 한다. 트랜잭션 내부에서 AI 호출, 메일 발송, 외부 결제 요청을 하지 않는다. Firestore transaction은 충돌 때 재실행될 수 있으므로 외부 작업은 확정 후 별도 작업 큐와 멱등 키로 수행한다. [Firestore 원자적 처리](https://firebase.google.com/docs/firestore/manage-data/transactions)

진급 정책의 단일 원본은 학습 상세 명세에 맞춘 공용 버전 정책 파일이다. Firebase와 프런트에서 서로 다른 점수 규칙을 만들지 않는다. 초기 gateSession은 시작 전에 서버가 **미노출 검수 probe 5개를 사전 고정**한다. 이 5개에는 최소 두 자료/과제 형식과 조건이 달라진 전이 문제 1개 이상을 포함하고, 모든 필수 skill을 관찰할 수 있어야 한다. 충분한 문항이 없으면 `evidence_insufficient`로 남긴다. 과거에 맞힌 답만 골라 5개를 구성하거나 진행 중 틀린 문항을 분모에서 빼는 것을 금지한다.

통과는 **그 세션의 최초 독립 제출 5개 중 4개 이상 정답(80% 이상) + 전이 문제 정답 1개 이상 + 모든 필수 skill 확인 + 필수 관계의 오류 미해결 상태 없음**이다. 두 자료/과제 형식과 전이 문항의 사전 포함 조건도 충족해야 한다. 전이 문제가 하나뿐인데 그 문제를 틀렸다면 다른 네 문제를 맞혀 4/5여도 통과하지 않는다. 분모는 5로 고정하며 오답과 최종 제출 시 미응답도 포함한다. 미완료·채점 보류 상태는 통과로 처리하지 않는다. 복합 probe는 사전 승인된 채점 기준을 모두 충족해야 해당 probe의 성공 1개로 세며, 부분 점수는 상세 피드백용으로 남긴다. 힌트/해설 때문에 `practice`로 전환한 세션은 점수 비율과 무관하게 gate 통과를 부여하지 않는다. 보충 후 재평가는 새로운 미노출 5개를 사전 고정한 새 gateSession으로 진행하며, 이전 세션의 최초 오답·교정·전환 기록은 삭제하지 않는다. 초기 정책은 조정 가능한 운영 기준이고 교육 효과가 검증된 절대 점수선은 아니다. 진단형 선개념 문항은 이 gate와 분리해 보충 경로를 정하는 데 사용한다.

단순 반복 클릭을 숙달로 오인하지 않도록 `unaidedFirst`, `assistedPractice`, `delayedRetrieval`, `transferCheck`를 구별한다. 같은 문항 정답 암기와 새로운 유사 문항 적용을 별도로 기록한다. 오답 시 근거 설명→짧은 회복 활동→다른 검수 문항으로 재확인한다. 계속 틀렸을 때 끝없는 잠금 화면을 만들지 말고 선수 개념으로 돌아가는 경로·기존 개방 콘텐츠 읽기·연습 경로를 유지한다. 다만 필수 관문을 통과하지 않았으면 숙달로 표시하지 않는다.

복습 간격과 확인 등급도 학습 상세 명세의 공용 정책 버전을 따른다. 약 24시간 뒤 원문/근접 재확인, 3~7일 뒤 미노출·도움 없는 전이 확인을 기본 경로로 삼는다. 21일은 필요에 따라 붙이는 추가 유지 복습이며 그 날짜가 되거나 한 번 맞았다고 지연 확인 등급을 자동 부여하지 않는다. 지연 확인 등급은 시간 간격이 있는 두 회차의 독립 성공 중 하나가 전이 문제이고 핵심 기능도 다시 확인되었을 때 기록한다. 실제 간격·문항·노출 여부를 저장하고 학생 부담과 결과에 따라 조정한다. 이 숫자는 효과를 보장하지 않는다. 사용자가 철회된 잘못된 문항을 다시 풀지 않도록 `questionVersion`과 철회 상태를 검사한다. 정답 오류를 수정했을 때 기존 답안을 지우지 않고 `regradeEvent`를 추가하여 score/mastery/복습 큐를 다시 계산한다.

자유 서술·개념 정리는 학생 원문 revision을 보존하고 루브릭의 충족·누락·오개념·근거를 제시한다. AI는 학생의 다음 관문을 임의로 열거나 공식 정답을 바꾸지 못한다. 자동 판정이 불확실하면 형성 피드백과 보충 문항을 제공하고 `needsReview`로 남긴다. 유일한 진급 경로를 불확실한 AI 채점에 종속시키지 않는다. AI 장애 시 승인된 모범 구조·자기 점검표·규칙 기반 확인 문항으로 학습을 이어간다.

## 6. 데이터·파일 접근 통제

Firestore와 Storage 모두 기본 거부로 시작한다. 로그인했다는 조건만으로 모든 학생의 문서가 열리는 규칙을 금지한다. 각 경로의 본인 UID 일치, 읽기/추가/수정/삭제 구별, 허용 필드 목록, 타입·길이·크기·enum, immutable 필드, 서버 타임스탬프 조건을 검사한다. 클라이언트가 쓸 수 있는 것은 지정한 개인 설정·초안뿐이며, 확정 성적·사용권·권한·동의 확인 완료 상태·공식 정답·콘텐츠 발행은 서버 전용이다.

Admin SDK는 Firestore Security Rules를 우회하므로 모든 서버 endpoint에도 UID·소유권·요청 schema·상태 전이·속도 제한·권한 검사를 넣는다. Rules가 보호하므로 서버 검사 없이 안전하다고 설명하지 않는다. [Firestore Rules](https://firebase.google.com/docs/firestore/security/rules-conditions)

Storage는 승인된 교육 자료와 개인 노트 첨부를 분리한다. 개인 파일은 `userUploads/{uid}/...`에 두고 다른 UID는 읽지 못한다. 이미지 형식·크기·개수·객체명·메타데이터를 검증하고 실행 가능한 HTML/SVG 등의 무분별한 업로드를 허용하지 않는다. 공개 파일과 개인 파일을 같은 공개 토큰 URL 방식으로 다루지 않는다. 공개 범위가 제한된 파일은 권한 확인을 거치는 다운로드 또는 짧은 유효기간의 URL을 사용하며 URL을 문항/노트 전체와 함께 분석 로그로 보내지 않는다. 출판사 도판은 지정된 검토 표시를 항상 유지한다. [Storage Rules](https://firebase.google.com/docs/storage/security)

App Check는 web의 reCAPTCHA Enterprise 등을 검토해 시험 환경에서 먼저 계측한 뒤 Firestore/Storage/호출 가능한 함수에 enforcement한다. 개발 debug token은 운영에 넣지 않는다. App Check는 사용자 인증이나 소유권 검사를 대신하지 않는다. 네이버 외부 callback은 일반 callable과 다른 검증 경계이므로 OAuth state·code·세션 검증을 적용하고, 시작/완료의 자사 요청에는 가능한 범위에서 App Check와 rate limit을 추가한다. [Web App Check](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider), [함수 enforcement](https://firebase.google.com/docs/app-check/cloud-functions), [역할과 한계](https://firebase.google.com/docs/app-check)

## 7. 결제 없는 V1이지만 이용권은 지금부터 분리한다

V1에는 결제 버튼·카드 입력·자동 결제·가격표를 구현하지 않는다. `entitlements` 및 `AccessPolicy` 계약만 만들고 서버에서 발급하는 `pilot`/`free` 이용권으로 작동시킨다. `users.isPaid = true`처럼 바꿀 수 있는 한 필드에 서비스 권한을 의존하지 않는다.

```text
Entitlement {
  entitlementId,
  beneficiaryUid,
  issuerType: pilot | free | purchase | subscription | organization,
  productId,
  scope: { courseIds[], featureIds[] },
  validFrom, validUntil?,
  status: active | suspended | expired | revoked,
  originRef?, policyVersion, createdAt, updatedAt
}
```

V1에서는 `purchase/subscription/organization`를 위한 타입 확장 지점만 마련하고 발급 기능은 숨겨 두거나 비활성화한다. 서버 시각을 기준으로 사용 가능 범위를 계산하고 브라우저 시계·로컬 저장 값·결제 성공 화면을 권한 근거로 삼지 않는다. 이용권 만료와 계정 삭제를 분리하며, 만료되었다고 학생의 노트·기존 답안을 삭제하지 않는다. 자신의 작성물 조회/내보내기 범위는 별도 정책으로 보장한다.

향후 결제 단계에서는 payer와 beneficiary를 분리해 보호자 결제를 지원하고 `orders`, `payments`, `subscriptions`, `refunds`, `webhookReceipts`를 추가할 수 있게 한다. 서버가 결제사 서명·거래 상태·금액·통화·주문을 검증한 뒤 멱등 처리로 이용권을 발급한다. V1에서는 실결제 비밀키·카드 정보·PG 호출을 넣지 않는다. 기관 제공권과 개인 구매권이 겹치는 경우도 한 UID의 여러 이용권을 합성할 수 있도록 `AccessPolicy` 인터페이스를 고정한다. 학교·교사 역할 UI는 구현하지 않는다.

## 8. 미성년자·개인정보: 실제 가입 경로에 반영할 사항

만 14세 미만의 개인정보 처리에서 법에 따른 동의가 필요한 때에는 법정대리인의 동의를 받고 동의 여부를 확인해야 한다. 법정대리인 동의를 받는 데 필요한 최소 정보의 처리에 관한 규정도 있으므로 모든 가입 정보를 먼저 수집한 뒤 나중에 보호자 체크박스를 받는 흐름으로 만들지 않는다. 미성년자의 계약 관련 법정대리인 동의와 만 14세 미만의 개인정보 동의는 별개의 문제다. [개인정보 보호법 제22조의2](https://law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1020398521), [민법 제5조](https://law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1026990807)

구현은 소셜 계정 생성 전에 이해하기 쉬운 연령 안내/확인 단계부터 둔다. 만 14세 미만 경로는 적절한 보호자 동의·확인 절차를 통과하기 전 본격적인 계정/학습 기록 수집을 시작하지 않는다. 보호자 이메일에 링크를 보내는 것만으로 법정대리인 확인까지 완료되었다고 단정하지 않는다. 서비스가 채택할 확인 방식과 필요한 최소 정보는 출시 전에 실제 사업 조건에 맞춰 확정한다. 절차가 미구현이면 해당 경로를 “완료”로 가장하지 말고 공개 미리보기와 준비 상태를 안내한다. 이 절차의 필요성이 교사·보호자 대시보드를 V1에 만드는 이유는 아니다.

연령 화면은 클라이언트 UI만으로 끝내지 않는다. 서버가 동의·온보딩 자격을 확인하기 전에는 개인 문서 생성과 학습 서비스 접근을 Rules/API에서 거부한다. Firebase Auth의 첫 소셜 로그인 자체가 Auth 계정을 만들 수 있다는 점까지 포함해 가입 이전 처리 흐름을 검토한다. 미완료 임시 Auth 계정의 정리 기준을 두고, 미성년자 동의 전에 수집되는 항목이 없다고 실제 흐름 확인 없이 단정하지 않는다.

필수 서비스 제공·선택 마케팅·선택 분석 목적을 구별하고, 선택 동의를 거절했다고 기본 학습을 불가능하게 하지 않는다. 아동·청소년에게 이해하기 쉬운 안내를 제공한다. 초기 V1은 광고·공개 순위표·실명 노출·행동 광고 SDK를 기본 도입하지 않는다. [개인정보 포털의 법정대리인 안내](https://www.privacy.go.kr/front/contents/cntntsView.do?contsNo=75)

Firebase, 오류 추적, 영상, 생성형 API 등 실제 데이터 흐름별 수탁자·위치·이전 국가·항목·목적·기간을 확인한다. 서울 리전을 선택한 Firestore 하나만 보고 모든 인증·분석·AI 처리가 국내에만 있다고 고지하지 않는다. 국외 이전에 적용되는 법적 근거·고지·동의는 실제 방식에 맞춰 확인한다. 국외 이전은 항상 하나의 동의만으로 해결되거나 항상 같은 동의 방식이 필요한 것으로 단순화하지 않는다. [개인정보 보호법 제28조의8](https://law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1020398611)

탈퇴는 최근 재인증과 명확한 확인을 거쳐 처리한다. Auth 계정을 지웠다고 Firestore subcollection·Storage 파일·AI 작업·백업까지 자동 삭제되었다고 표시하지 않는다. `deletionJob`으로 경로별 삭제·적법한 보존 대상 분리·재시도·완료 증적을 남긴다. 데이터 내보내기는 현재 학생 자신의 노트·응답·학습 이력만 포함하고 다른 학생/내부 정답 DB는 포함하지 않는다. 로그에서 이메일·토큰·학생 자유서술 원문을 기본 수집하지 않는다. 보존 기간·백업 잔존 처리·권리 요청 담당은 서비스 운영자가 출시 전에 확정한다. 이는 구현 체크 항목이며 법률 적합성 인증을 의미하지 않는다.

Firestore의 상위 문서 삭제는 하위 collection 삭제를 자동으로 수행하지 않는다. 삭제 작업은 실제 데이터 경로 목록을 기준으로 시험한다. [Firestore 삭제 동작](https://firebase.google.com/docs/firestore/manage-data/delete-data)

## 9. 외부 설정 목록 — 개발자가 임의로 지어내지 말 것

1. 개발/시험/운영 Firebase 프로젝트 및 도메인. Firebase Auth authorized domains, 실제 callback/action URL, 이메일 발신자·템플릿.
2. Google 공급자 설정, Microsoft 앱 등록·대상 계정 유형·client secret 만료 관리, Apple Service/Team/key 정보와 relay 발신 허용, 네이버 앱 등록·검수·callback 목록.
3. Firestore/Functions/Storage 위치·요금제·IAM·예산 알림·백업. 2026-10-17 공식 문서상 Cloud Storage for Firebase는 Blaze 요금제를 요구한다. 사용자 결제를 붙이지 않는 V1도 인프라 비용은 생길 수 있으므로 무료 운영을 보장하지 않는다. [Storage 요금제 조건](https://firebase.google.com/docs/storage/faq-and-troubleshooting)
4. Secret Manager의 네이버 client secret, Apple private key 등 실제 비밀정보. 프런트엔드 환경 변수의 접두어를 붙였다고 비밀이 되는 것이 아니다. Firebase web config와 서버 비밀키를 구별한다. 서버에서는 관리형 서비스 계정/ADC를 우선하고 서비스 계정 JSON을 번들·Git·출력 로그에 넣지 않는다. [함수 환경/비밀정보 설정](https://firebase.google.com/docs/functions/config-env)
5. App Check 사이트 키·허용 도메인·운영 enforcement. 개발 debug 값과 운영 값을 분리한다.
6. 서비스 이용약관·개인정보 처리방침·보존/삭제 정책의 확정 버전, 미성년자 확인 방식, 계정 복구 연락 경로.
7. 실서버가 준비되지 않은 상태에서는 Emulator Suite로 회원가입·저장·채점 계약을 구현/검증한다. 화면에 “연결 완료”라고 표시할 수 있는 근거를 별도 확인하고, 부족한 외부 설정을 README의 실제 값 없는 체크리스트로 남긴다. 키를 사용자 채팅에 붙여 넣도록 요구하지 않는다.

예산 알림은 자동 비용 차단 장치로 간주하지 않는다. AI 요청량·업로드 크기·요청 속도·Functions 최대 인스턴스·목록 페이지 크기 등 앱 측 제한을 둔다. 익명 요청·실패 재시도 폭증과 문항 오류를 구별해 관측한다. 운영 배포와 DB 복원은 별개의 절차이며 앱 버전을 되돌리면서 최근 학생 답안을 지우지 않는다.

## 10. 완료 판정에 필요한 시험

| 영역 | 반드시 확인할 사례 |
|---|---|
| 기본 인증 | Google/MS 개인/MS 학교/Apple 실메일/Apple relay/네이버/이메일 각각 신규 가입·재로그인·로그아웃. 팝업 차단·취소·네트워크 끊김·redirect 재진입. |
| 이메일 | 검증 전 개인 기록/AI 차단, 유효·만료·사용된 인증 링크, 재발송 제한, 재설정, 이메일 변경 및 계정 열거 방지. |
| 연결 | 이메일 충돌 때 소유 증명 없는 병합 거부. 동일 UID 유지. 네이버 연결 충돌. 마지막 로그인 방식 해제 거부. Apple 연결 동의. |
| OAuth 공격 | 잘못된/만료/재사용 state, code 재사용, 외부 returnTo, 잘못된 세션, 브라우저 조작 UID·프로필 거부. 토큰이 URL·로그에 남지 않음. |
| 규칙 | 익명 읽기 범위 제한, A 학생의 B 학생 노트·초안·Storage 접근 거부, 본인의 score/mastery/entitlement/consentVerified 변경 거부, 필드 끼워 넣기·거대 데이터 거부. |
| 채점 | 중복 제출 20회여도 확정 시도 1건, 동시 두 기기 제출, 철회된 문항 버전, 고정 5개 분모와 4/5 경계, 부분 점수/미응답/보류, 두 형식·전이 정답 1개 이상·필수 skill, 유일한 전이 문제 오답이면 4/5여도 통과 거부, 오답 제거/성공만 선별 거부, 새 5개 재평가 세션. |
| 도움 노출 | client의 힌트 사용 누락·evidenceEligibility 위조 거부. 서버 노출 선기록, 진행 중 힌트/해설 요청 시 세션 연습 전환·진급 제외, 제출과 노출 동시 요청, 완료 후 해설과 진행 중 해설의 구별. |
| 저장 | 새로고침·브라우저 재시작·두 탭·두 기기·오프라인 재연결·노트 충돌. 미전송 상태를 저장 완료로 표시하지 않음. |
| 관문/복습 | 실패 시 보충→재확인, 미채점 AI 응답이 잠금 해제하지 않음, 잘못된 정답 수정 후 재채점/복습 재계산, 만료 이용권과 개인 기록 보존. |
| 계정 종료 | 데이터 내보내기 자기 자료만, 탈퇴 작업 재시도, 삭제 후 개인 파일 접근 불가, 다른 사용자 로그인 시 캐시/대기열 미노출. |
| 운영 | 권한 없는 서버 요청 거부, App Check enforcement, AI 중단 시 기존 학습 지속, 비밀정보 노출 검사, 백업 복원 연습과 콘텐츠 rollback. |

Security Rules는 Emulator에서 자동 시험하고 실제 공급자 OAuth/메일/relay/브라우저 제한은 별도 시험 프로젝트에서 확인한다. Emulator만 통과한 결과로 다섯 실제 가입 방식이 운영 검증되었다고 보고하지 않는다. [Rules 시험](https://firebase.google.com/docs/firestore/security/test-rules-emulator)

납품에는 동작하는 학생 화면 외에 데이터 schema, Rules, 인덱스, 서버 함수, emulator seed, 환경 변수 이름만 있는 예시, 실제 공급자 설정 안내, 위 시험 결과, 미설정 항목을 포함한다. 실키·실학생 데이터는 포함하지 않는다. V1 완료 판정은 “로그인 버튼이 보인다”가 아니라 **가입→학습→노트 작성→답안 제출→관문 판정→다른 기기에서 이어하기→오답 복습**이 실제 저장된 기록으로 이어지는 것이다.

## 11. Cloudflare 배포 계약 — Claude → GitHub → Workers

### 선택한 기본 구성

프런트엔드는 Vite + React + TypeScript SPA로 만든다. Cloudflare Vite plugin과 Wrangler를 프로젝트 개발 의존성으로 고정하고, Workers Static Assets에서 정적 번들을 제공한다. GitHub 저장소를 Workers Builds에 연결해 검토된 변경을 배포한다. Cloudflare는 새 프로젝트의 시작점으로 Workers를 권장하고 React SPA의 공식 구성을 제공한다. [신규 프로젝트 권고](https://developers.cloudflare.com/pages/framework-guides/), [React SPA 튜토리얼](https://developers.cloudflare.com/workers/vite-plugin/tutorial/), [GitHub Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)

Cloudflare Pages도 지원되는 대안이지만 이번 개발 프롬프트의 기본은 Workers다. Pages용 `dist` 업로드, Pages Functions, Workers 설정을 한 저장소에서 이유 없이 혼용하지 않는다. Workers Vite plugin이 생성한 배포용 Wrangler 출력 경로를 따른다.

| 위치 | 맡는 일 | 맡지 않는 일 |
|---|---|---|
| React 브라우저 | 학생 화면, 단계별 학습, 활동, 인증 SDK, 본인 데이터 조회, 초안 큐 | 서버 비밀키 보관, 공식 채점, 이용권 발급, 네이버 token 교환 |
| Cloudflare Worker | 정적 파일 배포, SPA 라우팅, 지정된 인증 경로의 투명 프록시, 필요한 응답 헤더 | Firebase Admin을 브라우저처럼 임의 실행, 정답·채점·계정 원장 중복 보유 |
| Firebase Functions | 네이버 OAuth 검증과 custom token 발급, 계정 연결, 노트 revision 저장, 채점, 성취도·복습, AI 호출, 이용권, 삭제/내보내기 | 학생용 정적 사이트 호스팅 |
| Firestore/Storage/Auth | 검증된 계정과 학생 기록·콘텐츠·미디어 | Cloudflare를 쓴다는 이유로 D1/R2에 동일 데이터 원장 복제 |

Firebase Admin SDK는 Firebase Functions의 관리형 실행 신원/권한으로 사용한다. Cloudflare Worker에 서비스 계정 private key를 복제하지 않는다. Worker의 인증 프록시는 고정된 공개 upstream으로만 전달하고, upstream의 Firebase 서버 함수는 누구나 주소를 알아도 동일하게 토큰·state·권한 검사를 수행한다. “Cloudflare를 거쳐 왔다”는 헤더만으로 요청을 신뢰하지 않는다.

### 저장소와 빌드

권장 저장소 구조는 `src/`(학생 UI), `worker/`(경로 제한 프록시), `functions/`(Firebase 서버), `content/`(검수 콘텐츠와 import manifest), `public/`(공개해도 되는 정적 자산), `tests/`, `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `firebase.json`, `wrangler.jsonc`다. 공개를 의도하지 않은 교재 원본 PDF·정답표·개인 자료를 `public/` 또는 정적 build output에 복사하지 않는다.

GitHub에는 lockfile·개발 문서·테스트·콘텐츠 버전·비밀값 없는 설정만 커밋한다. `.env*`, `.dev.vars*`, 서비스 계정 JSON, 키 파일, 실제 학생 데이터, 로컬 캐시를 제외하고 `.env.example`만 예외적으로 포함한다. Cloudflare GitHub App 권한은 대상 저장소로 제한한다.

Workers Builds에는 실제 기본 브랜치를 production으로 지정한다. PR/작업 브랜치에서는 preview를 생성한다. 빌드 전에 타입 검사·콘텐츠 누락 검사·단위 시험·규칙 시험이 실패하면 운영 배포를 막는다. Vite 빌드는 `npm run build`, 운영 배포는 프로젝트에 고정한 Wrangler를 사용하는 `npx wrangler deploy`를 기본으로 한다. Workers Vite plugin은 빌드 산출물용 Wrangler 설정을 만들므로 일반 Pages의 출력 폴더 규칙을 그대로 덮어쓰지 않는다. Cloudflare dashboard의 Worker 이름과 저장소 설정의 name을 맞춘다. [Workers 빌드 설정](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [GitHub 통합](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/)

Firebase Functions·Rules·인덱스의 배포는 프런트엔드 배포와 별도다. Cloudflare에 프런트를 올렸다고 서버 함수까지 배포되었다고 보고하지 않는다. GitHub의 분리된 신뢰 가능한 배포 작업 또는 개발자의 Firebase 배포 절차로 대상 프로젝트를 명확하게 지정한다. 시험 프로젝트에 먼저 배포한 후 운영에 적용하고, 호환 가능한 API/콘텐츠 버전인지 smoke test한다.

### SPA 경로와 인증 경로를 분리한다

Workers Static Assets에는 `assets.not_found_handling: 'single-page-application'`을 사용해 `/learn/...`, `/review/...`, `/notes/...`의 새로고침이 정상 동작하게 한다. 인증 요청까지 `index.html`로 바뀌면 안 된다. Worker가 맡는 `/__/auth/*`, `/auth/naver/*`는 `assets.run_worker_first` 경로로 분리하고, 프록시에서 실패하면 올바른 오류를 반환한다. 그 외 알 수 없는 서버 경로는 404로 처리한다. [SPA와 경로 우선순위](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)

Wrangler의 구조 예시는 다음과 같다. 실제 Worker 이름과 compatibility date는 구현 시 확정한다. `vars`에는 비밀이 아닌 고정 upstream/환경 이름만 넣는다. 아래 예시는 비밀값을 포함하지 않는 계약 예시이며 그대로 배포한 결과물이 아니다.

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "science-student-v1",
  "main": "worker/index.ts",
  "compatibility_date": "2026-10-17",
  "assets": {
    "binding": "ASSETS",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/__/auth/*", "/auth/naver/*"]
  }
}
```

### OAuth popup 기본·redirect 대안의 정확한 구현

운영 custom domain을 확정한 후 Firebase Auth authorized domains, 공급자의 허용 callback, 이메일 action URL, App Check 허용 호스트를 모두 일치시킨다. 고정 staging 도메인과 별도 Firebase 시험 프로젝트를 만들어 실제 인증 시험을 수행한다. 무작위 PR preview hostname 전부를 운영 Auth/OAuth에 자동 허용하지 않는다.

Google/MS/Apple은 popup을 기본으로 하고 취소를 오류 폭탄으로 다루지 않는다. 팝업 차단 시 다시 열기와 redirect 로그인을 제공한다. redirect를 제품 기능으로 제공하는 경우, Firebase 공식 외부 호스팅 지침의 **Option 3 투명 reverse proxy**를 Cloudflare Worker에서 구현한다. 브라우저가 보는 `https://<app-domain>/__/auth/...` 요청을 해당 환경의 `https://<firebase-project>.firebaseapp.com/__/auth/...`로 서버 측 전달한다. 이는 302 redirect가 아니다. `authDomain`은 앱 도메인으로 지정하고, 공급자 callback은 정확히 `https://<app-domain>/__/auth/handler`로 등록한다. Firebase가 제공하는 인증 helper를 활용하는 것이며 프런트엔드 사이트를 Firebase Hosting에 배포하는 것은 아니다. [Firebase 외부 호스팅 인증 지침](https://firebase.google.com/docs/auth/web/redirect-best-practices)

프록시는 고정 upstream·허용 경로·GET/POST와 필요한 body/query를 정확히 전달한다. 사용자가 보내는 임의 `target` URL로 접속하는 공개 프록시를 만들지 않는다. 인증 응답을 공유 CDN 캐시에 저장하거나 code/token/query를 로그에 남기지 않는다. provider callback에 필요한 POST·쿠키·응답 헤더를 깨뜨리지 않고, 프록시 경로를 SPA fallback/앱용 CSP로 덮어쓰지 않는다. helper code를 파일로 내려받아 직접 운영하는 Firebase Option 4는 Apple을 지원하지 않는다고 명시되어 있으므로 이 앱의 대안으로 쓰지 않는다.

네이버의 `/auth/naver/*`도 같은 앱 origin의 제한된 Worker 프록시로 Firebase HTTP Functions에 전달하도록 한다. 네이버 callback에 등록할 공개 주소는 운영/staging의 정확한 `/auth/naver/callback`이다. state 쿠키·완료 쿠키는 앱 origin에서 유지하고 실제 state/code/profile 검증과 custom token 서명은 Firebase Functions에서 수행한다. 서버는 환경별 canonical origin을 설정값으로 관리하고 브라우저가 조작한 forwarded host/return URL을 그대로 신뢰하지 않는다. 프록시의 존재는 검증을 생략하는 이유가 아니다.

### 공개 빌드 변수와 서버 비밀정보

`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_APP_ID`, `VITE_FUNCTIONS_REGION`, `VITE_APP_ENV` 등 브라우저 공개용 설정만 Vite에 제공한다. Firebase API key는 서버 관리자 키와 다르며 접근 통제는 Rules/Auth/App Check로 수행한다. 네이버 client secret·Apple private key·AI key·서비스 계정 key를 `VITE_`에 넣지 않는다. Vite의 `VITE_` 변수는 클라이언트 번들에 포함된다. [Vite 환경 변수](https://vite.dev/guide/env-and-mode)

이 설계에서 인증/채점용 비밀정보는 Firebase 쪽에만 둔다. 추가적인 Worker 비밀이 실제 필요해지면 Cloudflare Secrets를 사용하고 Wrangler의 `vars`나 Git에 값을 넣지 않는다. Cloudflare의 암호화된 secret 저장 기능도 그 값을 React 빌드에 주입해 주면 비밀성을 지켜 주지 못한다. [Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)

### Preview와 시험 데이터

Workers Preview는 브랜치별 설정을 사용할 수 있지만 외부 Firebase 프로젝트가 자동으로 복제·격리되는 것은 아니다. preview의 공개 설정이 반드시 시험 Firebase 프로젝트를 가리키게 검증한다. 운영 DB endpoint·운영 OAuth secret·실학생 자료를 preview에 사용하지 않는다. 실제 소셜 인증은 고정된 staging 호스트에서 시험하고 일반 PR preview는 demo/emulator 또는 제한된 시험 계정만 사용한다. 미등록 preview에서 로그인 버튼이 실패할 경우 운영으로 몰래 우회시키지 않는다. [Workers Previews](https://developers.cloudflare.com/workers/previews/), [리소스 격리](https://developers.cloudflare.com/workers/previews/resources/)

확인일 기준 새 Workers Preview 기능은 Wrangler 4.135.0 이상을 요구한다. 구현 시 호환되는 프로젝트 버전을 lockfile에 고정하고 `previews` 설정에 시험용 변수·바인딩을 명시한다. 브랜치 시험은 해당 기능의 `npx wrangler preview` 계약을 따르고 운영의 `wrangler deploy`와 구별한다. GitHub Builds의 브랜치별 실제 명령·설정을 문서와 대조해 검증한다.

preview가 공개되지 않도록 Cloudflare Access 등으로 개발 검토자만 접근하게 한다. noindex는 접근 제한이 아니다. Access와 OAuth callback이 서로 방해하는지 staging에서 검증하되 편의를 위해 운영의 인증 검사를 제거하지 않는다. Preview URL과 특정 Worker 버전 URL은 개념이 다르고, 버전 URL을 시험한다고 자동으로 시험 데이터에 연결되는 것도 아니다.

### 헤더·캐시·검증

정적 파일은 `public/_headers`에 필요한 정책을 두고, Worker가 직접 만드는 응답에는 코드에서 헤더를 설정한다. `_headers`가 Worker 응답에도 자동 적용된다고 가정하지 않는다. 기본 검토 대상은 `X-Content-Type-Options: nosniff`, 적절한 Referrer-Policy, 앱의 frame-ancestors, Permissions-Policy, 실제 Firebase·App Check·영상 공급자에 맞춘 CSP다. 인증 popup의 opener 흐름을 깨뜨리는 COOP 정책을 무작정 복사하지 않는다. OAuth helper iframe과 학생 화면은 적용 정책을 구별하여 실제 브라우저에서 확인한다. [정적/Worker 응답 헤더 차이](https://developers.cloudflare.com/workers/static-assets/headers/)

해시가 붙은 공개 JS/CSS/교육용 정적 이미지와 인증/개인정보 응답의 캐시 정책을 구별한다. 학생 노트·답안·custom token·인증 callback 응답은 공유 캐시에 넣지 않는다. Service Worker를 도입한다면 개인 API·인증 경로를 무조건 precache하지 않는다. 과거 프런트 번들과 새 API/콘텐츠가 섞여도 학생 답안이 유실되지 않도록 release/version 확인과 재시도 안내를 둔다.

배포 검수에는 다음을 추가한다: deep link 새로고침, favicon/JS MIME, 404와 SPA fallback의 경계, `/__/auth/*`가 HTML 앱으로 변환되지 않음, 네이버 state cookie 유지, 모든 OAuth의 popup/redirect, preview의 운영 DB 접근 부재, Vite 번들의 비밀값 부재, 보안 헤더와 영상/인증 호환, Cloudflare 프런트 rollback 후 학생 기록 보존. 납품 시 로컬 실행·시험 Firebase·staging·GitHub CI·Cloudflare 운영의 각 단계에서 무엇이 검증되었는지 구분해 보고한다.
