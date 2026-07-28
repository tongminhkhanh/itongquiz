import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { PUBLIC_PAGE_METADATA, SITE_ORIGIN } from '../src/seo/publicPageMetadata';

const require = createRequire(import.meta.url);
const { PUBLIC_PATHS, buildPublicEntries, renderSitemap } = require('../scripts/generate_sitemap.cjs') as {
  PUBLIC_PATHS: string[];
  buildPublicEntries: (siteUrl?: string) => Array<{ loc: string }>;
  renderSitemap: (entries: Array<{ loc: string }>) => string;
};

describe('canonical public sitemap', () => {
  it('stays aligned with the prerendered public route contract', () => {
    expect(PUBLIC_PATHS).toEqual(Object.keys(PUBLIC_PAGE_METADATA));
    expect(buildPublicEntries()).toEqual(PUBLIC_PATHS.map((pathname) => ({
      loc: new URL(pathname, `${SITE_ORIGIN}/`).toString(),
    })));
  });

  it('contains only canonical URLs without query parameters or ignored hints', () => {
    const sitemap = renderSitemap(buildPublicEntries());
    const locations = Array.from(sitemap.matchAll(/<loc>(.*?)<\/loc>/g), match => match[1]);

    expect(locations.every(location => !location.includes('?'))).toBe(true);
    expect(sitemap).not.toContain('<priority>');
    expect(sitemap).not.toContain('<changefreq>');
    expect(sitemap).not.toContain('<lastmod>');
    expect((sitemap.match(/<url>/g) || [])).toHaveLength(PUBLIC_PATHS.length);
  });
});
