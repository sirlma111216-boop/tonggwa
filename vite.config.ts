import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Keep the preview URL deterministic: a stale process must not silently move us to 5174.
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { sourcemap: false, chunkSizeWarningLimit: 900 },
});
