import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Vitest config kept separate from vite.config.ts so the React Compiler babel
// plugin (build-only) is not pulled into the test toolchain. We still load
// @vitejs/plugin-react here (without the compiler preset) so component tests get
// the automatic JSX runtime + Fast Refresh-free transform for React 19.
export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom so component characterization tests for App.tsx can render the full
    // DOM tree (the app hand-rolls history/popstate routing and relies on
    // window/localStorage). Pure-helper tests (local-auth) are env-agnostic.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    passWithNoTests: true,
  },
})
