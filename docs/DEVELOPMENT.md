# ProtoLive — 개발 가이드

포트폴리오 공통 컨벤션(툴링·스크립트·CI 게이트·배포)은 상위 워크스페이스 루트의
`DEVELOPMENT.md`·`CONTRIBUTING.md`를 따릅니다.
이 문서는 ProtoLive 제품별 상세입니다. 구조/도메인은 [ARCHITECTURE.md](./ARCHITECTURE.md) 참고.

## 스택

- **Frontend** (`apps/web`): Vite 8 · React 19(React Compiler 활성화) · TypeScript 6 · Tailwind v4 · axios · lucide-react
- **Backend** (`apps/api`): NestJS 11 · JSON 파일 스토어(DB 의존성 0) · class-validator
- **Monorepo**: pnpm 11 workspace (`apps/*`)
- **품질**: ESLint 10(flat config) + Prettier · Vitest(web) / node:test(api) · husky + lint-staged + commitlint

## 셋업 & 실행

```bash
corepack enable          # pnpm 11.4.0 (packageManager 필드 기준)
pnpm install
pnpm dev                 # web + api 동시 기동 (scripts/dev.sh, 포트 충돌 시 자동 전환)
```

기본 포트는 백엔드 `3003`, 프론트 `4174`. 점유 중이면 다음 사용 가능 포트로 자동 전환되고 로그에 표시됩니다.
포트/주소 오버라이드:

```bash
BACKEND_PORT=3008 FRONTEND_PORT=4178 VITE_API_BASE_URL=http://localhost:3008/api pnpm dev
```

`apps/api/.env.example`·`apps/web/.env.example`을 복사해 `.env`로 사용합니다.
`NODE_ENV=production`에서는 `PROTOLIVE_SESSION_SECRET`을 반드시 명시해야 부팅됩니다.

### 시드 데이터

```bash
pnpm seed:test-accounts          # 테스트 계정만
pnpm seed:test-data              # 계정 + 프로젝트 + 제안 + 이벤트
pnpm seed:demo-data              # 원클릭 데모 재설정(--reset)
pnpm seed:test-accounts -- --dry-run   # 변경 없이 미리보기
```

운영자 샘플 계정 등 상세는 [test-accounts.md](./test-accounts.md). 관리자 화면은 `?view=admin` 또는 `/admin`.

## 검증 게이트

로컬·CI 동일하게 단일 명령으로 검증합니다.

```bash
pnpm verify              # validate:architecture → format:check → lint → typecheck → test → build
pnpm verify:push         # = verify (pre-push)
```

개별 단계:

```bash
pnpm lint                # eslint . (루트 flat config가 모노레포 전체 커버)
pnpm lint:fix
pnpm typecheck           # web tsc --noEmit + api tsc -p tsconfig.json --noEmit
pnpm test                # web vitest run + api node:test
pnpm format              # prettier --write
pnpm format:check
pnpm build               # web(tsc && vite build) + api(nest build)
pnpm smoke               # web+api 구동 상태에서 UI 스모크 (scripts/smoke_ui.py)
```

- **pre-commit**: lint-staged(prettier --write).
- **commit-msg**: commitlint(conventional). 헤더 ≤ 100자.
- 훅 우회(`--no-verify`/`HUSKY=0`) 금지 — 실패는 근본 원인을 수정.

## 코드 컨벤션

- **Prettier**: `.prettierrc` — no semi · singleQuote · trailingComma es5 · printWidth 100.
- **ESLint**: 루트 `eslint.config.mjs` 하나로 전체 커버. apps/web=React(browser),
  apps/api=NestJS(node, 빈 생성자/클래스 허용), 테스트=Vitest/node globals.
  - 게이트 정책: 진짜 버그(rules-of-hooks 등)만 error, 나머지(`no-explicit-any`, react-refresh,
    React Compiler 실험 진단 `set-state-in-effect`/`purity` 등)는 advisory `warn`. `verify` 통과 = 0 error.
- **React Compiler**: 컴포넌트 자동 메모이즈 — 순수 메모이제이션용 `useMemo`/`useCallback`/`React.memo`
  추가 금지, Rules of React 위반 금지. 배선은 `apps/web/vite.config.ts`(`reactCompilerPreset()`),
  테스트는 `vitest.config.ts`가 컴파일러 없이 `react()`만 로드.
- **커밋**: Conventional Commits (`feat`/`fix`/`refactor`/`chore`/`docs`/`test`/`ci`/`build`/`style`).
- 한국어 주석 허용, 식별자/문서 헤더는 영문 컨벤션 유지. WHY가 자명하지 않을 때만 주석.

## 디렉터리 핵심

```text
apps/web/src/
  App.tsx           # 자체 history/popstate 라우팅 진입점
  api.ts            # API 클라이언트(VITE_API_BASE_URL)
  components/  data/  lib/  state/  test/

apps/api/src/
  projects/   # 검증·등록·통계·리뷰·신고·운영 큐·매칭 (store/url-security/signals)
  health/     # GET /api/health
  common/     # cors-policy · rate-limit.middleware
  main.ts  app.module.ts
```

## 배포

[DEPLOYMENT.md](./DEPLOYMENT.md) 참고. JSON 파일 스토어는 컨테이너 FS가 휘발이므로 운영에서는 볼륨/DB가 필요합니다.
