import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { PUBLIC_PAGE_METADATA, SITE_ORIGIN, TEACHER_GUIDE_METADATA } from '../src/seo/publicPageMetadata';
import { prerenderPublicPages, renderPublicPageHtml } from '../scripts/prerender-public-pages.mjs';

const shell = `<!doctype html><html lang="vi"><head><title>Old title</title><meta name="description" content="old"><link rel="canonical" href="https://example.com/"><script id="seo-jsonld" type="application/ld+json">{}</script></head><body><div id="root"></div></body></html>`;

describe('public-page prerendering', () => {
    it('writes unique canonical metadata and no-JavaScript content for each public route', () => {
        const outputDirectory = mkdtempSync(join(tmpdir(), 'itongquiz-prerender-'));
        try {
            writeFileSync(join(outputDirectory, 'index.html'), shell, 'utf8');
            prerenderPublicPages(outputDirectory);

            const about = readFileSync(join(outputDirectory, 'about.html'), 'utf8');
            expect(about).toContain('<html lang="vi" data-seo-prerendered="/about">');
            expect(about).toContain(`<title>${PUBLIC_PAGE_METADATA['/about'].title}</title>`);
            expect(about).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/about">`);
            expect(about).toContain(`<h1>${PUBLIC_PAGE_METADATA['/about'].heading}</h1>`);
            expect(about).toContain('"@type":"AboutPage"');
            expect(about).toContain('"@type":"BreadcrumbList"');

            const guide = readFileSync(join(outputDirectory, 'huong-dan-tao-de-kiem-tra-tieu-hoc.html'), 'utf8');
            expect(guide).toContain('<html lang="vi" data-seo-prerendered="/huong-dan-tao-de-kiem-tra-tieu-hoc">');
            expect(guide).toContain(`<title>${TEACHER_GUIDE_METADATA['/huong-dan-tao-de-kiem-tra-tieu-hoc'].title}</title>`);
            expect(guide).toContain('"@type":"Article"');
        } finally {
            rmSync(outputDirectory, { recursive: true, force: true });
        }
    });

    it('keeps the root canonical slash and escapes route content', () => {
        const html = renderPublicPageHtml(shell, '/', PUBLIC_PAGE_METADATA['/']);

        expect(html).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/">`);
        expect(html).toContain('data-seo-prerendered="/"');
        expect(html).not.toContain('<title>Old title</title>');
    });
});
