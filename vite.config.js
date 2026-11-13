import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'client',
  plugins: [react()],
  build: { outDir: '../dist', emptyOutDir: true, chunkSizeWarningLimit: 900 },
  server: { port: 5173, proxy: { '/api': process.env.API_URL || 'http://localhost:3000' } },
});
