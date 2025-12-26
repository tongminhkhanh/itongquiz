import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api/deepseek': {
          target: 'https://api.deepseek.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/deepseek/, ''),
        },
      },
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_API_KEY || env.API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    // Code Splitting Configuration
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks - rarely change, cache well
            'vendor-react': ['react', 'react-dom'],
            'vendor-icons': ['lucide-react'],

            // State management
            'vendor-state': ['zustand'],

            // Data parsing
            'vendor-data': ['papaparse', 'zod'],

            // Heavy animation library (if used)
            'vendor-motion': ['framer-motion'],
          },
        },
      },
      // Increase chunk size warning limit (optional)
      chunkSizeWarningLimit: 500,
    },
  };
});
