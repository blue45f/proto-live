import { defineConfig } from 'vitest/config';

// Vitest config kept separate from vite.config.ts so the React Compiler babel
// plugin (build-only) is not pulled into the test toolchain.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    passWithNoTests: true,
  },
});
