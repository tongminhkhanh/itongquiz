import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { resolveApiUrl } = require('../scripts/generate_sitemap.cjs') as {
  resolveApiUrl: (env?: Record<string, string | undefined>) => string;
};

describe('generate sitemap API URL resolution', () => {
  it('uses the production API when build variables are absent', () => {
    expect(resolveApiUrl({})).toBe('https://phieu.thitong.site');
  });

  it('prefers explicit sitemap configuration over other API variables', () => {
    expect(resolveApiUrl({
      SITEMAP_API_URL: 'https://sitemap.example.test ',
      WORKERS_API_URL: 'https://workers.example.test',
      VITE_WORKERS_API_URL: 'https://vite.example.test',
    })).toBe('https://sitemap.example.test');
  });

  it('falls back through worker variables in order', () => {
    expect(resolveApiUrl({
      WORKERS_API_URL: 'https://workers.example.test',
      VITE_WORKERS_API_URL: 'https://vite.example.test',
    })).toBe('https://workers.example.test');

    expect(resolveApiUrl({
      VITE_WORKERS_API_URL: 'https://vite.example.test',
    })).toBe('https://vite.example.test');
  });
});
