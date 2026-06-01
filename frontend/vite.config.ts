import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const frontendPort = Number(process.env.FRONTEND_PORT ?? process.env.VITE_PORT ?? 4174);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: Number.isFinite(frontendPort) && frontendPort > 0 ? frontendPort : 4174,
    host: true,
  },
});
