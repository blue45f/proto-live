# ProtoLive (프로토라이브) - Live Prototype Investment Platform

ProtoLive는 극초기 웹/앱 프로토타입 투자 매칭 플랫폼입니다. 메이커는 반드시 실제 작동 중인 공개 라이브 URL을 제출해야 하며, NestJS 백엔드 검증 시스템이 공인망 HTTP/HTTPS 응답을 확인해야 최종 등록됩니다. 프론트엔드는 샘플 프로젝트나 가짜 통계를 표시하지 않고 API 상태만 사용합니다.

---

## 시작 가이드

### 0. 루트에서 한 번에 실행
```bash
npm run setup
npm run dev
```

포트 충돌이 나면 루트 실행 시 아래처럼 환경 변수를 오버라이드해서 띄울 수 있습니다.

```bash
BACKEND_PORT=3008 FRONTEND_PORT=4178 VITE_API_BASE_URL=http://localhost:3008/api npm run dev
```

`npm run dev`는 기본적으로 백엔드 `3003`, 프론트 `5174`를 사용합니다.
`npm run dev` 실행 시 백엔드에서는 현재 프론트 포트를 포함해 기본 `CORS_ORIGINS`를 자동 보정해 커스텀 포트에서도 API가 동작하도록 처리합니다.

테스트 계정 시드 생성이 필요한 경우:
```bash
npm run seed:test-accounts
```

프로젝트/제안/이벤트까지 포함한 통합 테스트 데이터 시드가 필요한 경우:
```bash
npm run seed:test-data
```

로컬 테스트 중 쌓인 임시 이벤트/프로젝트를 지우고 기준 샘플 상태로 되돌리려면:
```bash
npm run seed:test-data -- --reset
```

변경 없이 미리 보기만 하려면:
```bash
npm run seed:test-accounts -- --dry-run
```

`seed:test-accounts`는 `backend/fixtures/test-accounts.json`의 계정을, `seed:test-data`는 `backend/fixtures/test-data.json`의 계정+프로젝트+제안+이벤트를 기준으로 로컬 스토어 사용자(`PROJECT_STORE_PATH`)를 반영합니다. `seed:test-data -- --reset`은 기존 로컬 스토어를 기준 샘플 데이터만 남도록 재생성합니다.

백엔드가 `http://localhost:3003/api` 에서 동작하고, 프론트엔드가 `http://localhost:5174`에서 실행됩니다.

### 1. 백엔드 기동 (NestJS API)
```bash
cd backend
npm install
npm run start:dev
```

기본 포트는 `3003`입니다.
`npm run dev`를 사용할 때는 `BACKEND_PORT`로 백엔드 포트를 바로 바꿀 수 있습니다.

주요 API:
- `POST http://localhost:3003/api/projects/validate`: SSRF 방어 규칙으로 URL을 확인한 뒤 HEAD/GET 요청으로 라이브 상태를 검증합니다.
- `GET / POST http://localhost:3003/api/projects`: 검증된 프로젝트 목록 조회 및 신규 등록을 처리합니다.
- `GET http://localhost:3003/api/projects/config`: 카테고리, 투자 구간, 갱신 주기, 벤치마크 기반 신호를 제공합니다.
- `GET http://localhost:3003/api/projects/stats`: 검증률, 매칭 규모, 관심 신호 랭킹, 평균 응답 시간을 현재 등록 데이터에서 계산합니다.
- `POST http://localhost:3003/api/projects/refresh`: 등록된 전체 프로젝트 URL 상태를 다시 확인합니다.
- `POST http://localhost:3003/api/projects/:id/refresh`: 단일 프로젝트 URL 상태를 다시 확인합니다.
- `GET http://localhost:3003/api/projects/:id/events`: 프로젝트별 프리뷰, 새 탭 열기, 매칭, 갱신 이벤트 이력을 조회합니다.
- `POST http://localhost:3003/api/projects/:id/events`: 공개 프리뷰 프로젝트의 관심 신호를 기록합니다.
- `POST http://localhost:3003/api/projects/:id/match`: 투자 의향을 구조화된 데이터로 기록합니다.

환경 변수:
```bash
PORT=3003
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174
PROJECT_STORE_PATH=./data/protolive-store.json
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=120
```
`backend/.env.example` 파일을 기준으로 `.env`를 복사해 사용할 수 있습니다.

### 로컬 테스트 계정

로컬 개발/QA 테스트 계정은 `backend/fixtures/test-accounts.json`에 정리해 두었습니다.  
현재 앱은 로컬 테스트 계정(이메일 + 비밀번호)으로 로그인해 역할(메이커/투자자)을 식별합니다.

상세 목록은 `docs/test-accounts.md`를 참고하세요.
관리자 화면은 `?view=admin` 또는 `/admin` 경로로 진입할 수 있습니다.
유사 서비스 대비 차별화 기획은 `docs/differentiation-strategy.md`에 정리되어 있습니다.

### 2. 프론트엔드 기동 (Vite + React + TypeScript + Tailwind v4)
```bash
cd frontend
npm install
npm run dev
```

`npm run dev` 기본 포트는 `5174`입니다.
`npm run dev`를 사용할 때는 `FRONTEND_PORT`로 프론트엔드 포트를 바꿀 수 있으며, 백엔드 포트 변경 시 같은 값으로 `VITE_API_BASE_URL`을 맞춰주어야 합니다.

프론트엔드 API 주소는 Vite 환경 변수로 조정할 수 있습니다:
```bash
VITE_API_BASE_URL=http://localhost:3003/api
```
`frontend/.env.example` 파일을 기준으로 `.env`를 복사해 사용할 수 있습니다.

프론트엔드는 백엔드가 꺼져 있으면 가짜 프로젝트를 보여주지 않습니다. 연결 오류와 복구 명령을 보여주고, API가 연결된 뒤 실제 검증 등록 데이터만 표시합니다.

---

## 데이터베이스 스키마

`db/schema.sql`에 PostgreSQL DDL이 있습니다. 모의 프로젝트 INSERT는 제거되어 실제 검증 API를 통과한 데이터만 표시하는 기준을 유지합니다.

로컬 PostgreSQL에서 개발/QA용 샘플을 바로 채우려면:

```bash
psql "$DATABASE_URL" -f db/seeds/sample-data.sql
```

`psql` 접속 문자열이 없다면 `DATABASE_URL`은 `.env` 기준으로 적절히 설정하고 실행하세요.

테이블 구성:
- `users`: 메이커/투자자 계정
- `projects`: 라이브 URL, 검증 결과, 공개 범위, 노출 위험 확인 여부, 매칭 카운터, 누적 의향 금액
- `project_events`: 프리뷰, 외부 열기, 매칭, 갱신 등 관심 신호 이벤트
- `match_proposals`: 프로젝트별 투자 의향 메시지와 금액 구간

현재 NestJS 구현은 의존성 추가 없이 즉시 실행 가능한 JSON 영속 저장소를 사용합니다. 기본 파일은 `PROJECT_STORE_PATH`로 바꿀 수 있으며, DDL은 PostgreSQL 전환 시 계약 기준으로 사용합니다.

---

## 적용 기술과 품질 기준

- **API 기반 데이터**: 카테고리, 투자 구간, 프로젝트, 통계, 매칭 의향을 백엔드 API에서 공급합니다.
- **JSON 영속 저장소**: 프로세스 재시작 후에도 프로젝트, 메이커, 투자 의향, 관심 신호, 다음 ID가 유지됩니다.
- **보안 URL 검증**: 서버가 사용자 입력 URL을 호출하므로 SSRF 방어를 위해 localhost, 사설망, 링크 로컬, 내부 도메인, 비 HTTP 프로토콜을 차단합니다.
- **상용화 전 제품 보호**: 기본 등록은 `선별 공개` 모드로 URL과 iframe 프리뷰를 공개 API에서 마스킹합니다. 메이커는 제출 권한과 노출 위험 안내를 확인해야 등록할 수 있습니다.
- **검색/참조 노출 최소화**: 프론트엔드와 API 응답에 `noindex`, `nofollow`, `noarchive`, `no-referrer` 정책을 적용합니다.
- **Rate limiting**: 외부 URL 검증과 API 남용을 줄이기 위해 IP 기반 요청 제한을 적용합니다.
- **Diligence Cockpit UI**: 마케팅 히어로 대신 검증 텔레메트리, 프로젝트 상태 갱신, 보호형 프리뷰, 매칭 의향, 활동 타임라인을 한 화면에서 다룹니다.
- **실시간 동기화**: 프론트엔드는 프로젝트, 설정, 통계를 병렬 로딩하고 기본 30초 주기로 동기화합니다.
- **검증 가능한 품질**: 백엔드에는 Node 내장 테스트 러너 기반의 URL 보안, 저장소, rate limit, 관심 신호 테스트가 포함되어 있습니다.

## 입점 전 보호 안내

`선별 공개`는 플랫폼 화면과 API에서 원본 URL을 마스킹하고 프리뷰/새 탭 열기를 매칭 요청 흐름으로 전환합니다. 단, 메이커가 제출한 URL 자체가 인터넷에 공개되어 있으면 제3자가 플랫폼 밖에서 접근할 가능성은 남아 있습니다. 상용화 전 서비스는 아래 기준을 지켜 등록하는 것을 권장합니다.

- 실제 고객 개인정보, 운영 관리자 화면, 비공개 가격표, 미공개 파트너 정보는 데모 빌드에서 제거합니다.
- 데모 계정은 권한을 최소화하고, 데이터는 샘플/가명 데이터만 사용합니다.
- 핵심 플로우에는 워터마크, 사용량 제한, 만료되는 데모 토큰, 접근 로그를 적용합니다.
- 특허, 영업비밀, 계약 전 공개가 제한된 기능은 공개 프리뷰 대신 선별 공개와 별도 NDA 흐름을 사용합니다.

---

## 검증 명령

```bash
cd backend && npm test
cd backend && npm run build
cd frontend && npm run build
cd frontend && npm run lint
```

또는 루트에서 `npm run check`를 실행하면 `build/lint/test`를 한 번에 점검할 수 있습니다.

로컬에서 UI 동작 확인은 백엔드와 프론트엔드가 둘 다 구동 중인 상태에서 `npm run smoke`로 수행합니다.
