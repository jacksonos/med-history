import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: { postcss: { plugins: [] } },
  server: { port: 5174, proxy: { '/api': 'http://127.0.0.1:3000' } },
  test: { environment: 'jsdom', setupFiles: ['./src/test-setup.ts'], clearMocks: true },
});
