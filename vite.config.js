import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: ['es2020', 'safari14', 'chrome80', 'firefox78'],
    // Older WebKit can retain failed module preloads across a retry.
    // Native module imports still load dependencies; CSS stays preloaded by Vite.
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react-vendor';
          if (id.includes('/@radix-ui/')) return 'dialog-vendor';
          if (id.includes('/@phosphor-icons/')) return 'icons-vendor';
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    // Captures, documentation and SQLite snapshots are not application sources.
    // Watching them can raise EBUSY on Windows while a file is being copied.
    watch: {
      ignored: ['**/output/**', '**/exports/**', '**/backups/**', '**/.wrangler/**', '**/docs/**'],
    },
    proxy: { '/api': `http://127.0.0.1:${process.env.LANET_API_PORT || 8787}` },
  },
});
