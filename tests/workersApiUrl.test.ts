import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { normalizeWorkersApiUrl } from '../src/config/constants';
import { resolveWorkersApiBaseUrl } from '../src/services/api/config';

describe('normalizeWorkersApiUrl', () => {
  it('removes literal escaped line endings from deployment environment values', () => {
    expect(normalizeWorkersApiUrl('https://phieu.thitong.site\\r\\n')).toBe(
      'https://phieu.thitong.site',
    );
  });

  it('removes real line endings, whitespace, and trailing slashes', () => {
    expect(normalizeWorkersApiUrl('  https://phieu.thitong.site/\r\n')).toBe(
      'https://phieu.thitong.site',
    );
  });

  it('uses a same-origin API base on Vercel Preview but keeps the configured production origin', () => {
    expect(resolveWorkersApiBaseUrl({
      configuredUrl: 'https://phieu.thitong.site',
      isDev: false,
      hostname: 'itongquiz-git-security.vercel.app',
    })).toBe('');
    expect(resolveWorkersApiBaseUrl({
      configuredUrl: 'https://phieu.thitong.site',
      isDev: false,
      hostname: 'thitong.site',
    })).toBe('https://phieu.thitong.site');
  });

  it('orders the external API rewrite before the SPA fallback', () => {
    const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
    expect(config.rewrites[0]).toEqual({
      source: '/api/:path*',
      destination: 'https://phieu.thitong.site/api/:path*',
    });
    const spaFallback = config.rewrites.find((rewrite: { source: string }) => rewrite.destination === '/index.html' && rewrite.source.includes('?!api/'));
    expect(config.rewrites.indexOf(spaFallback)).toBeGreaterThan(0);
  });
});
