import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist' },
  // En desarrollo, /api se reenvía a `wrangler pages dev` (puerto 8788 por defecto).
  server: { proxy: { '/api': 'http://localhost:8788' } },
});
