import { base, react, plugin, boundaries, defineConfig } from '@heejun/eslint-config'
import { globalIgnores } from 'eslint/config'
import globals from 'globals'

// 모노레포 전체 플랫 config(`pnpm lint` = `eslint .`).
// 공유 프리셋 @heejun/eslint-config 를 단일 소스로 채택해 형제 레포와
// 린트 규칙을 일치시킨다(offhours / family-care / PromptMarket / rotifolk).
export default defineConfig(
  globalIgnores([
    '**/dist/**',
    '**/dist-test/**',
    '**/build/**',
    '**/coverage/**',
    '**/node_modules/**',
    '**/*.d.ts',
    '**/*.tsbuildinfo',
    '**/*.config.{js,mjs,cjs,ts}',
    'db/**',
    '**/public/**',
  ]),

  // 공유 베이스(TS + import 위생 + 커스텀 규칙 + prettier 충돌 비활성).
  base({ files: ['**/*.{ts,tsx}'] }),

  // apps/web — React 19 + Vite + RC + jsx-a11y (react-hooks 컴파일러 진단 포함).
  react({ files: ['apps/web/**/*.{ts,tsx}'] }),

  // heejun 개인 테스트/목 컨벤션 규칙은 비활성 — 횡단 일관성 대상이 아니라
  // proto-live 자체 테스트 스타일과 충돌한다(shared base 의 일반 규칙만 채택).
  {
    plugins: { '@heejun': plugin },
    rules: {
      '@heejun/vitest-mock-import': 'off',
      '@heejun/vitest-mock-import-original': 'off',
      '@heejun/mock-response-naming': 'off',
      '@heejun/no-js-interface-direct-access': 'off',
    },
  },

  // apps/web 레포 정책: 네이티브 globalThis.confirm/alert/prompt 금지
  // (포트폴리오 표준 — DEVELOPMENT.md §5.1). 브랜드 다이얼로그/toast/인라인
  // 알림으로 대체한다. 로컬 변수는 섀도잉이라 영향 없음.
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'confirm',
          message: '브랜드 확인 다이얼로그를 사용하세요 (globalThis.confirm 금지).',
        },
        { name: 'alert', message: 'toast/인라인 알림을 사용하세요 (globalThis.alert 금지).' },
        {
          name: 'prompt',
          message: '브랜드 입력 다이얼로그를 사용하세요 (globalThis.prompt 금지).',
        },
      ],
    },
  },

  // 라우트 테이블은 매처/빌더 + 상수 혼재라 컴포넌트 전용 규칙을 적용하지 않는다.
  // main.tsx 는 fast-refresh 대상이 아닌 진입점(createRoot + pathname 분기 마운트)이라 함께 제외.
  {
    files: ['apps/web/src/router/route.ts', 'apps/web/src/main.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },

  // apps/web 계층 경계 — 개발가이드의 app/domains/shared/infrastructure 4계층.
  // proto-live 는 피처 우선으로 짜이지 않아 domains/ 그룹(projects·community)을
  // 백엔드 모듈(apps/api/src/{projects,community}) 기준으로 신규 도출했다.
  // 도메인 소유가 명확한 모듈만 물리 이동하고, 앱 셸/공용 모듈은 실제 경로 그대로
  // app/shared 로 매핑한다(offhours 파일럿과 동일 — components/lib/hooks/state 는
  // 옮기지 않음). app 패턴이 shared 보다 먼저 와야 components/pages·useProtoLiveApp
  // 이 app 으로 먼저 잡힌다(boundaries 는 첫 매칭 element 를 채택).
  ...boundaries({
    files: ['apps/web/src/**/*.{ts,tsx}'],
    elements: [
      {
        type: 'app',
        pattern: [
          'apps/web/src/{App,main}.{ts,tsx}',
          'apps/web/src/router/**/*',
          'apps/web/src/components/pages/**/*',
          'apps/web/src/state/useProtoLiveApp.ts',
          // useProtoLiveApp 의 서버 상태(react-query) 패치 계층 — 훅과 동일하게
          // infrastructure/api 를 직접 호출하므로 app 으로 분류한다.
          'apps/web/src/state/snapshotQueries.ts',
        ],
        mode: 'full',
      },
      { type: 'domains', pattern: 'apps/web/src/domains/*/**/*', mode: 'full' },
      {
        type: 'shared',
        pattern: 'apps/web/src/{components,lib,hooks,state,styles}/**/*',
        mode: 'full',
      },
      { type: 'infrastructure', pattern: 'apps/web/src/infrastructure/**/*', mode: 'full' },
    ],
    rules: [
      { from: ['app'], allow: ['app', 'domains', 'shared', 'infrastructure'] },
      { from: ['domains'], allow: ['domains', 'shared', 'infrastructure'] },
      { from: ['infrastructure'], allow: ['shared', 'infrastructure'] },
      { from: ['shared'], allow: ['shared'] },
    ],
  }),
  // boundaries 는 TS 임포트를 분류하려면 리졸버가 필요하다(없으면 조용히 no-op).
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    settings: {
      'import/resolver': { typescript: { project: 'apps/web/tsconfig.json' }, node: true },
    },
  },
  // 기술부채 완화(차기 패스에서 정리 예정) — proto-live 는 계층 우선으로 만들어진
  // 적이 없어 다음 두 결합이 깊게 박혀 있다:
  //
  // 1) infrastructure/api.ts 가 axios 클라이언트뿐 아니라 도메인 타입(Project,
  //    CommunityAttachment, AuthSession 등)의 단일 정의처라, 순수 shared 인
  //    lib(constants·format) 와 state(storage) 가 이 타입을 import 한다
  //    (shared→infrastructure 위반). 타입을 별도 shared 모듈로 떼어내는 것은 30+
  //    파일에 걸친 대규모 작업이라 이번 패스 범위 밖이다.
  // 2) state/ 의 일부 클라이언트 상태 훅(storage)이 도메인 타입에 의존한다.
  //
  // 따라서 lib/format·lib/constants·state/storage 의 element-types 만 완화한다.
  // 나머지 순수 shared(components 의 일반 UI·hooks·styles)는 strict 를 유지한다.
  {
    files: [
      'apps/web/src/lib/constants.ts',
      'apps/web/src/lib/format.ts',
      'apps/web/src/state/storage.ts',
    ],
    rules: { 'boundaries/element-types': 'off' },
  },
  // shared 컴포넌트 다수가 infrastructure/api 의 도메인 타입을 직접 import 한다
  // (NotificationBell 의 알림 타입, modals 의 Project/AuthSession 등). 이들은
  // 사실상 도메인 결합 피처 컴포넌트지만, 공용 빌딩블록(Modal·EmptyState 등)과 한
  // 디렉터리에 섞여 있어 물리 분리가 대규모 리팩터다 — 해당 파일만 완화한다.
  {
    files: [
      'apps/web/src/components/NotificationBell.tsx',
      'apps/web/src/components/modals/**/*.{ts,tsx}',
    ],
    rules: { 'boundaries/element-types': 'off' },
  },
  // domains→app 결합 1건: community/DiscussionHub 가 router/route 의
  // DiscussionRoute 라우트 타입을 import 한다. 라우트 타입을 shared 로 떼어내거나
  // 훅 props 로 주입하면 풀리지만, 그건 라우팅 계약 재설계라 차기 패스로 미룬다.
  {
    files: ['apps/web/src/domains/community/DiscussionHub.tsx'],
    rules: { 'boundaries/element-types': 'off' },
  },

  // apps/api — NestJS (Node). 데코레이터 + 빈 생성자/클래스 관용.
  {
    files: ['apps/api/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },

  // 테스트 — Vitest(web) / node:test(api) globals; fast-refresh 제약 완화.
  {
    files: ['**/*.{test,spec}.{ts,tsx}', '**/test/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'react-refresh/only-export-components': 'off',
    },
  }
)
