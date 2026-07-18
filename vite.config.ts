import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig(({ mode }) => ({
  server: {
    port: 3001,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'https://phieu.thitong.site',
        changeOrigin: true,
        rewrite: (requestPath) => requestPath,
      },
    },
  },
  plugins: [react(), cloudflare()],
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  build: {
    esbuild: {
      drop: mode === 'production' ? ['console'] : [],
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-state': ['zustand'],
          'vendor-motion': ['framer-motion'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
}));
