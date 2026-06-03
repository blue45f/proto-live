import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

const frontendPort = Number(process.env.FRONTEND_PORT ?? process.env.VITE_PORT ?? 4174)

// React Compiler (React 19 native) runs via @rolldown/plugin-babel + the
// reactCompilerPreset() helper from @vitejs/plugin-react v6 — the portfolio's
// standard wiring (see ../../DEVELOPMENT.md §1). Auto-memoizes components, so do
// not hand-add useMemo/useCallback/React.memo purely for memoization.
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  server: {
    port: Number.isFinite(frontendPort) && frontendPort > 0 ? frontendPort : 4174,
    host: true,
  },
})
