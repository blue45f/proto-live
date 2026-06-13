import { base, react, plugin, defineConfig } from '@heejun/eslint-config'
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

  // apps/web 레포 정책: 네이티브 window.confirm/alert/prompt 금지
  // (포트폴리오 표준 — DEVELOPMENT.md §5.1). 브랜드 다이얼로그/toast/인라인
  // 알림으로 대체한다. 로컬 변수는 섀도잉이라 영향 없음.
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'confirm',
          message: '브랜드 확인 다이얼로그를 사용하세요 (window.confirm 금지).',
        },
        { name: 'alert', message: 'toast/인라인 알림을 사용하세요 (window.alert 금지).' },
        { name: 'prompt', message: '브랜드 입력 다이얼로그를 사용하세요 (window.prompt 금지).' },
      ],
    },
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
