import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPublicStructuredData, PUBLIC_PAGE_METADATA, SITE_ORIGIN } from '../src/seo/publicPageMetadata.js';

const ROOT_DIRECTORY = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const upsertHeadTag = (html, matcher, replacement) => (
    matcher.test(html)
        ? html.replace(matcher, replacement)
        : html.replace('</head>', `  ${replacement}\n</head>`)
);

const metaTag = (attribute, name, content) => `<meta ${attribute}="${name}" content="${escapeHtml(content)}">`;

const routeFilePath = (outputDirectory, route) => (
    route === '/'
        ? join(outputDirectory, 'index.html')
        : join(outputDirectory, `${route.slice(1)}.html`)
);

export const renderPublicPageHtml = (html, route, metadata) => {
    const canonical = new URL(route, `${SITE_ORIGIN}/`).toString();
    let rendered = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(metadata.title)}</title>`);

    for (const [attribute, name, content] of [
        ['name', 'title', metadata.title],
        ['name', 'description', metadata.description],
        ['name', 'keywords', metadata.keywords],
        ['name', 'robots', 'index, follow'],
        ['property', 'og:title', metadata.title],
        ['property', 'og:description', metadata.description],
        ['property', 'og:url', canonical],
        ['property', 'twitter:title', metadata.title],
        ['property', 'twitter:description', metadata.description],
        ['property', 'twitter:url', canonical],
        ['name', 'twitter:title', metadata.title],
        ['name', 'twitter:description', metadata.description],
    ]) {
        rendered = upsertHeadTag(
            rendered,
            new RegExp(`<meta\\b(?=[^>]*\\b${attribute}=["']${escapeRegExp(name)}["'])[^>]*>`, 'i'),
            metaTag(attribute, name, content),
        );
    }

    rendered = upsertHeadTag(
        rendered,
        /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i,
        `<link rel="canonical" href="${canonical}">`,
    );

    const jsonLd = JSON.stringify(buildPublicStructuredData(canonical, metadata));
    rendered = rendered.replace(
        /<script\s+id=["']seo-jsonld["'][^>]*>[\s\S]*?<\/script>/i,
        `<script id="seo-jsonld" type="application/ld+json">${jsonLd}</script>`,
    );

    const fallback = `<noscript><main><h1>${escapeHtml(metadata.heading)}</h1><p>${escapeHtml(metadata.summary)}</p></main></noscript>`;
    rendered = rendered.replace('<div id="root"></div>', `<div id="root"></div>${fallback}`);
    return rendered.replace('<html lang="vi">', `<html lang="vi" data-seo-prerendered="${route}">`);
};

export const prerenderPublicPages = (outputDirectory = join(ROOT_DIRECTORY, 'dist')) => {
    const sourceFile = join(outputDirectory, 'index.html');
    if (!existsSync(sourceFile)) {
        throw new Error(`Missing Vite output: ${sourceFile}`);
    }

    const shell = readFileSync(sourceFile, 'utf8');
    for (const [route, metadata] of Object.entries(PUBLIC_PAGE_METADATA)) {
        const target = routeFilePath(outputDirectory, route);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, renderPublicPageHtml(shell, route, metadata), 'utf8');
    }
};

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`).href) {
    try {
        prerenderPublicPages();
        console.log(`[seo-prerender] generated ${Object.keys(PUBLIC_PAGE_METADATA).length} public HTML documents.`);
    } catch (error) {
        console.error('[seo-prerender] failed:', error instanceof Error ? error.message : error);
        process.exitCode = 1;
    }
}
