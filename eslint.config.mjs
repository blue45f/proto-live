import reactCompiler from 'eslint-plugin-react-compiler'
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Single flat config covering the whole monorepo (`pnpm lint` = `eslint .`),
// mirroring the sibling repos (offhours / family-care / PromptMarket / rotifolk).
export default defineConfig(
  [
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

    // Shared TS rules for the whole monorepo.
    {
      files: ['**/*.{ts,tsx}'],
      extends: [js.configs.recommended, tseslint.configs.recommended],
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
        ],
        '@typescript-eslint/no-unsafe-function-type': 'error',
        '@typescript-eslint/no-require-imports': 'error',
        '@typescript-eslint/no-unused-expressions': 'error',
        'no-empty': ['error', { allowEmptyCatch: true }],
        'no-useless-escape': 'error',
      },
    },

    // apps/web — React 19 + Vite (browser).
    {
      files: ['apps/web/**/*.{ts,tsx}'],
      extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
      languageOptions: {
        ecmaVersion: 2022,
        globals: globals.browser,
      },
      rules: {
        // 네이티브 window.confirm/alert/prompt 금지 (포트폴리오 표준 — DEVELOPMENT.md §5.1).
        // 브랜드 다이얼로그/toast/인라인 알림으로 대체한다. 로컬 변수는 섀도잉이라 영향 없음.
        'no-restricted-globals': [
          'error',
          {
            name: 'confirm',
            message: '브랜드 확인 다이얼로그를 사용하세요 (window.confirm 금지).',
          },
          { name: 'alert', message: 'toast/인라인 알림을 사용하세요 (window.alert 금지).' },
          { name: 'prompt', message: '브랜드 입력 다이얼로그를 사용하세요 (window.prompt 금지).' },
        ],
        'react-hooks/exhaustive-deps': 'error',
        'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
        // react-hooks v7 ships React Compiler diagnostics; enforce them as errors.
        'react-hooks/set-state-in-effect': 'error',
        'react-hooks/purity': 'error',
        'react-hooks/incompatible-library': 'error',
        'react-hooks/immutability': 'error',
        'react-hooks/refs': 'error',
        'react-hooks/preserve-manual-memoization': 'error',
        'react-hooks/static-components': 'error',
      },
    },

    // apps/api — NestJS (Node). Decorator-heavy; empty constructors/interfaces are idiomatic.
    {
      files: ['apps/api/**/*.ts'],
      languageOptions: {
        ecmaVersion: 2022,
        globals: globals.node,
      },
      rules: {
        '@typescript-eslint/no-empty-object-type': 'off',
        '@typescript-eslint/no-extraneous-class': 'off',
      },
    },

    // Test files — Vitest (web) / node:test (api) globals; relax fast-refresh constraint.
    {
      files: ['**/*.{test,spec}.{ts,tsx}', '**/test/**/*.{ts,tsx}'],
      languageOptions: {
        globals: { ...globals.node, ...globals.browser },
      },
      rules: {
        'react-refresh/only-export-components': 'off',
      },
    },
  ],
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: {
      'react-compiler': reactCompiler,
    },
    rules: {
      'react-compiler/react-compiler': 'error',
    },
  }
)
