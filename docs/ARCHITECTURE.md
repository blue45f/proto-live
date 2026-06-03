# ProtoLive — 아키텍처

라이브 프로토타입 투자 매칭 플랫폼. 메이커는 **실제 작동하는 공개 라이브 URL**을 제출하고,
NestJS 백엔드가 공인망 HTTP/HTTPS 응답을 검증해야 등록됩니다. 프론트엔드는 가짜 통계/샘플을
표시하지 않고 API 상태만 사용합니다(제품 원칙은 [PRODUCT.md](../PRODUCT.md) 참고).

## 모노레포 구성

pnpm workspace(`pnpm-workspace.yaml` → `apps/*`).

```text
proto-live/
  apps/
    web/      # Vite 8 + React 19 + TypeScript + Tailwind v4 (Diligence Cockpit UI)
    api/      # NestJS 11 (JSON 영속 스토어, DB 의존성 0)
  db/         # PostgreSQL DDL(schema.sql) + 샘플 시드 — PG 전환 시 계약 기준
  docs/       # ARCHITECTURE · DEVELOPMENT · DEPLOYMENT · 차별화 전략 · 테스트 계정
  scripts/    # dev.sh(포트 자동 전환 동시 기동) · validate-architecture · smoke_ui.py
```

> 포트폴리오 공통 표준은 상위 워크스페이스 루트의 `DEVELOPMENT.md`·`CONTRIBUTING.md` 참고.
> `apps/web` + `apps/api` 표준 풀스택 레이아웃을 따릅니다.

## 프론트엔드 (`apps/web`)

- **스택**: Vite 8, React 19, TypeScript, Tailwind v4(`@tailwindcss/vite`), axios, lucide-react.
- **React Compiler**: `vite.config.ts`에서 `@vitejs/plugin-react`의 `reactCompilerPreset()`를
  `@rolldown/plugin-babel`로 배선(React 19 네이티브). 컴포넌트가 자동 메모이즈되므로 순수 메모이제이션
  목적의 `useMemo`/`useCallback`/`React.memo`를 손으로 추가하지 않습니다. 테스트 도구체인에는 컴파일러를
  넣지 않도록 `vitest.config.ts`가 별도로 `react()`만 로드합니다.
- **라우팅/상태**: 외부 라우터 의존 없이 `history`/`popstate` 기반 자체 라우팅 + 컴포넌트 로컬 상태.
- **데이터 로딩**: 프로젝트·설정·통계를 병렬 로딩하고 기본 30초 주기로 동기화. 백엔드가 꺼져 있으면
  가짜 데이터 대신 연결 오류와 복구 안내를 표시.

## 백엔드 (`apps/api`)

- **스택**: NestJS 11(Express 플랫폼), class-validator/class-transformer, axios(URL 검증 호출).
- **영속성**: 의존성 추가 없이 즉시 실행되는 **JSON 파일 스토어**(`PROJECT_STORE_PATH`,
  기본 `./data/protolive-store.json`). 프로세스 재시작 후에도 프로젝트·메이커·투자 의향·관심 신호·
  다음 ID가 유지됩니다. `db/schema.sql`은 PostgreSQL 전환 시의 계약(테이블 `users`/`projects`/
  `project_events`/`match_proposals`).
- **모듈**:
  - `projects` — 검증/등록/조회, 설정·통계 계산, 리뷰·신고·운영 검토 큐·감사 로그, 매칭 의향.
  - `health` — `GET /api/health` 라이브니스(status/timestamp/uptime).
  - `common` — `cors-policy`(운영은 화이트리스트만, dev는 localhost 자동 허용),
    `rate-limit.middleware`(IP 기반 요청 제한).
- **세션**: 이메일/비밀번호 검증 후 httpOnly 세션 쿠키로 역할(메이커/투자자/일반/운영자) 식별.

## 보안 경계

- **SSRF 방어**: 사용자 입력 URL을 서버가 호출하므로 localhost·사설망·링크로컬·내부 도메인·비 HTTP
  프로토콜을 차단(`projects/url-security.ts`).
- **선별 공개(screened access)**: 기본 등록은 원본 URL/iframe 프리뷰를 공개 API에서 마스킹하고
  프리뷰/새 탭 열기를 매칭 요청 흐름으로 전환. 메이커는 노출 위험 안내를 확인해야 등록 가능.
- **노출 최소화**: 응답에 `noindex`/`nofollow`/`noarchive`/`no-referrer` 정책.
- **투자 관심 동의 기록**: 제출 전 투자 권유 아님 고지·개인정보 연락 동의·초기 위험 안내 확인을 필수 저장.
- **운영 검토 큐 + 감사 로그**: 신고 리뷰 공개/숨김/복구, 모든 처리·동의를 감사 로그에 기록.

## 헬스 체크

루트 표준(liveness + readiness) 패턴을 따릅니다.

- 라이브니스: `GET /api/health` — status/timestamp/uptime.
- 리드니스: `GET /api/health/ready` — JSON 스토어 사용 가능성(디렉터리 쓰기 가능 + 기존 파일 파싱)을
  `JsonProjectsStore.checkReadiness()`로 확인. 준비됨이면 `{ status: 'ready', store: 'ok' }`,
  실패면 **503**(`{ status: 'unavailable', store: 'unwritable' | 'unreadable' }`)로 트래픽 차단.

## 검증·배포

- 로컬/CI 게이트는 단일 `pnpm verify`(= `validate:architecture → format:check → lint → typecheck →
test → build`). 자세한 흐름은 [DEVELOPMENT.md](./DEVELOPMENT.md), 배포는 [DEPLOYMENT.md](./DEPLOYMENT.md).
