#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT_DIR, 'public', 'sitemap.xml');
const DEFAULT_SITE_URL = 'https://www.thitong.site';
const DEFAULT_CATEGORIES = ['vioedu', 'trang-nguyen', 'ioe', 'on-tap'];

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
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}

function toBoolLike(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  return defaultValue;
}

function isQuizPublic(quiz) {
  const requireCode = toBoolLike(quiz.require_code ?? quiz.requireCode, false);
  const showOnHome = toBoolLike(quiz.show_on_home ?? quiz.showOnHome, true);
  return showOnHome && !requireCode;
}

function safeDate(value, fallbackDate) {
  if (!value) return fallbackDate;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallbackDate;
  return d.toISOString().slice(0, 10);
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toUrl(base, pathname, queryPairs) {
  const u = new URL(pathname, base.endsWith('/') ? base : `${base}/`);
  if (Array.isArray(queryPairs)) {
    for (const [k, v] of queryPairs) {
      if (v !== undefined && v !== null && v !== '') {
        u.searchParams.set(k, String(v));
      }
    }
  }
  return u.toString();
}

function renderSitemap(entries) {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
  for (const entry of entries) {
    lines.push('  <url>');
    lines.push(`    <loc>${xmlEscape(entry.loc)}</loc>`);
    lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
    lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    lines.push(`    <priority>${entry.priority}</priority>`);
    lines.push('  </url>');
  }
  lines.push('</urlset>');
  return `${lines.join('\n')}\n`;
}

async function fetchPublicQuizzes(apiUrl, token) {
  const url = new URL('/api/quizzes', apiUrl).toString();
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-API-Token': token,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Sitemap fetch failed (${response.status}): ${text || response.statusText}`);
  }
  const payload = await response.json();
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
  return rows.filter(isQuizPublic);
}

async function main() {
  loadEnvFile(path.join(ROOT_DIR, '.env'));
  loadEnvFile(path.join(ROOT_DIR, '.env.local'));

  const siteUrl = (process.env.SITEMAP_SITE_URL || DEFAULT_SITE_URL).trim();
  const apiUrl = (process.env.SITEMAP_API_URL || process.env.WORKERS_API_URL || process.env.VITE_WORKERS_API_URL || '').trim();
  const apiToken = (process.env.SITEMAP_API_TOKEN || process.env.API_SECRET_TOKEN || process.env.VITE_API_SECRET_TOKEN || '').trim();

  if (!apiUrl) {
    throw new Error('Missing API URL. Set SITEMAP_API_URL or WORKERS_API_URL or VITE_WORKERS_API_URL.');
  }
  if (!apiToken) {
    throw new Error('Missing API token. Set SITEMAP_API_TOKEN (recommended) or API_SECRET_TOKEN.');
  }

  const today = new Date().toISOString().slice(0, 10);
  const quizzes = await fetchPublicQuizzes(apiUrl, apiToken);

  const categories = new Set(DEFAULT_CATEGORIES);
  quizzes.forEach((q) => {
    const raw = q.category ?? q.category_name ?? '';
    const category = String(raw).trim();
    if (category) categories.add(category);
  });

  const entries = [];
  entries.push({
    loc: toUrl(siteUrl, '/', []),
    lastmod: today,
    changefreq: 'daily',
    priority: '1.0',
  });

  entries.push({
    loc: toUrl(siteUrl, '/about', []),
    lastmod: today,
    changefreq: 'weekly',
    priority: '0.8',
  });

  entries.push({
    loc: toUrl(siteUrl, '/contact', []),
    lastmod: today,
    changefreq: 'weekly',
    priority: '0.8',
  });

  Array.from(categories)
    .sort((a, b) => a.localeCompare(b))
    .forEach((category) => {
      entries.push({
        loc: toUrl(siteUrl, '/', [['category', category]]),
        lastmod: today,
        changefreq: 'daily',
        priority: '0.9',
      });
    });

  quizzes
    .slice()
    .sort((a, b) => String(b.created_at || b.createdAt || '').localeCompare(String(a.created_at || a.createdAt || '')))
    .forEach((quiz) => {
      entries.push({
        loc: toUrl(siteUrl, '/', [['quizId', quiz.id]]),
        lastmod: safeDate(quiz.created_at || quiz.createdAt, today),
        changefreq: 'weekly',
        priority: '0.7',
      });
    });

  const xml = renderSitemap(entries);
  fs.writeFileSync(OUTPUT_FILE, xml, 'utf8');
  console.log(`[sitemap] generated ${entries.length} URLs (${quizzes.length} public quizzes) -> ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error('[sitemap] generation failed:', error.message);
  process.exit(1);
});
