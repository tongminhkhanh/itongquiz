import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
  trailingSlash: boolean;
  redirects: Array<{
    source: string;
    destination: string;
    permanent: boolean;
    has?: Array<{ type: string; key?: string; value?: string }>;
  }>;
  rewrites: Array<{ source: string; destination: string }>;
  headers: Array<{
    source: string;
    has?: Array<{ type: string; key?: string; value?: string }>;
    headers: Array<{ key: string; value: string }>;
  }>;
};

const headerValue = (source: string, key: string) => config.headers
  .find(entry => entry.source === source)
  ?.headers.find(header => header.key.toLowerCase() === key.toLowerCase())
  ?.value;

const queryHeaderValue = (queryKey: string, key: string) => config.headers
  .find(entry => entry.source === '/' && entry.has?.some(condition => condition.type === 'query' && condition.key === queryKey))
  ?.headers.find(header => header.key.toLowerCase() === key.toLowerCase())
  ?.value;

describe('Vercel route and SEO configuration', () => {
  it('keeps the API rewrite first and only serves known client routes', () => {
    expect(config.rewrites[0]).toEqual({
      source: '/api/:path*',
      destination: 'https://phieu.thitong.site/api/:path*',
    });
    expect(config.rewrites.some(item => item.source.includes('?!api/'))).toBe(false);
    expect(config.rewrites.map(item => item.source)).toEqual(expect.arrayContaining([
      '/about',
      '/contact',
      '/privacy',
      '/tos',
      '/huong-dan-tao-de-kiem-tra-tieu-hoc',
      '/huong-dan-giao-bai-truc-tuyen',
      '/huong-dan-xem-ket-qua-hoc-tap',
      '/student/practice/:subjectId',
      '/teacher/results/:resultId',
      '/teacher/quizzes/manual/new',
      '/teacher/quizzes/manual/:quizId/edit',
      '/phieu/p/:publicToken',
    ]));
    expect(config.rewrites.find(item => item.source === '/about')?.destination).toBe('/about.html');
    expect(config.rewrites.find(item => item.source === '/contact')?.destination).toBe('/contact.html');
    expect(config.rewrites.find(item => item.source === '/huong-dan-tao-de-kiem-tra-tieu-hoc')?.destination).toBe('/huong-dan-tao-de-kiem-tra-tieu-hoc.html');
  });

  it('normalizes the canonical host and trailing-slash policy', () => {
    expect(config.trailingSlash).toBe(false);
    expect(config.redirects).toContainEqual({
      source: '/:path*',
      has: [{ type: 'host', value: 'thitong.site' }],
      destination: 'https://www.thitong.site/:path*',
      permanent: true,
    });
  });

  it('marks parent routes noindex/no-referrer and authentication pages no-store', () => {
    const parentSources = ['/activate', '/login', '/dashboard', '/notifications', '/results/:path*', '/assignments', '/certificates', '/profile'];
    for (const source of parentSources) {
      expect(headerValue(source, 'X-Robots-Tag')).toBe('noindex, nofollow');
      expect(headerValue(source, 'Referrer-Policy')).toBe('no-referrer');
    }
    expect(headerValue('/activate', 'Cache-Control')).toBe('private, no-store');
    expect(headerValue('/login', 'Cache-Control')).toBe('private, no-store');
  });

  it('preserves immutable asset caching and does not globally noindex the main site', () => {
    expect(headerValue('/assets/(.*)', 'Cache-Control')).toBe('public, max-age=31536000, immutable');
    expect(headerValue('/(.*)', 'X-Robots-Tag')).toBeUndefined();
    expect(headerValue('/student/:path*', 'X-Robots-Tag')).toBe('noindex, nofollow');
    expect(headerValue('/teacher/:path*', 'X-Robots-Tag')).toBe('noindex, nofollow');
    expect(headerValue('/phieu/(.*)', 'X-Robots-Tag')).toBe('noindex, nofollow');
    expect(queryHeaderValue('quizId', 'X-Robots-Tag')).toBe('noindex, nofollow');
    expect(queryHeaderValue('quiz', 'X-Robots-Tag')).toBe('noindex, nofollow');
    expect(queryHeaderValue('category', 'X-Robots-Tag')).toBe('noindex, nofollow');
  });
});
