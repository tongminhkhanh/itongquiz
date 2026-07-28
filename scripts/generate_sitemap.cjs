#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT_DIR, 'public', 'sitemap.xml');
const DEFAULT_SITE_URL = 'https://www.thitong.site';
const PUBLIC_PATHS = ['/', '/about', '/contact', '/privacy', '/tos'];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) return;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  });
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toUrl(base, pathname) {
  return new URL(pathname, base.endsWith('/') ? base : `${base}/`).toString();
}

function buildPublicEntries(siteUrl = DEFAULT_SITE_URL) {
  return PUBLIC_PATHS.map((pathname) => ({ loc: toUrl(siteUrl, pathname) }));
}

function renderSitemap(entries) {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
  for (const entry of entries) {
    lines.push('  <url>');
    lines.push(`    <loc>${xmlEscape(entry.loc)}</loc>`);
    lines.push('  </url>');
  }
  lines.push('</urlset>');
  return `${lines.join('\n')}\n`;
}

function main() {
  loadEnvFile(path.join(ROOT_DIR, '.env'));
  loadEnvFile(path.join(ROOT_DIR, '.env.local'));

  const siteUrl = (process.env.SITEMAP_SITE_URL || DEFAULT_SITE_URL).trim();
  const entries = buildPublicEntries(siteUrl);
  fs.writeFileSync(OUTPUT_FILE, renderSitemap(entries), 'utf8');
  console.log(`[sitemap] generated ${entries.length} canonical public URLs -> ${OUTPUT_FILE}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('[sitemap] generation failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

module.exports = { PUBLIC_PATHS, buildPublicEntries, renderSitemap };
