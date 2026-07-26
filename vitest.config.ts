/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        env: {
            VITE_FEATURE_GIFT_SHOP_V2: 'false',
        },
        environment: 'jsdom',
        setupFiles: ['./tests/setup.ts'],
        include: ['tests/**/*.{test,spec}.{ts,tsx}', 'src/**/__tests__/**/*.{test,spec}.{ts,tsx}'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'json-summary', 'html'],
            exclude: [
                '**/*.d.ts',
                '**/*.config.{ts,js,mjs,cjs}',
                '**/index.ts',
                '**/types/**',
            ],
            thresholds: {
                statements: 30,
                lines: 30,
                functions: 30,
                branches: 20,
                'workers/src/{routes/practice.ts,services/practiceAttemptToken.ts}': {
                    statements: 90,
                    lines: 90,
                    functions: 80,
                    branches: 80,
                },
            },
        }
    }
});
