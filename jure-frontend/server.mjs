/**
 * Production static server for the Vite SPA on Railway.
 * Serves `dist/`, falls back to index.html for client-side routes, and:
 *  - 301-redirects legacy unprefixed marketing URLs to locale-prefixed ones
 *  - injects per-URL SEO head tags (title/meta/canonical/hreflang/JSON-LD)
 *    from dist/seo-manifest.json so crawlers get correct metadata without
 *    executing JavaScript
 *  - injects a crawlable H1 + lead into #root (replaced when React hydrates)
 */
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');
const indexHtml = path.join(distDir, 'index.html');
const seoManifestPath = path.join(distDir, 'seo-manifest.json');
const port = Number(process.env.PORT) || 3000;

console.log('[jure-frontend] starting', {
  port,
  distDir,
  node: process.version,
  cwd: process.cwd(),
});

if (!fs.existsSync(indexHtml)) {
  console.error(`[jure-frontend] missing ${indexHtml} — did "vite build" run?`);
  process.exit(1);
}

const indexTemplate = fs.readFileSync(indexHtml, 'utf8');

let seoManifest = { locales: ['en', 'fr', 'ar'], defaultLocale: 'en', pages: {} };
try {
  seoManifest = JSON.parse(fs.readFileSync(seoManifestPath, 'utf8'));
  console.log(`[jure-frontend] seo-manifest loaded (${Object.keys(seoManifest.pages).length} pages)`);
} catch {
  console.warn('[jure-frontend] seo-manifest.json missing — serving default head tags');
}

const LOCALES = seoManifest.locales || ['en', 'fr', 'ar'];
const DEFAULT_LOCALE = seoManifest.defaultLocale || 'en';

/** Marketing slugs that used to live unprefixed; kept for old links/bookmarks. */
const LEGACY_MARKETING_SLUGS = new Set([
  '',
  'about',
  'features',
  'contact',
  'pricing',
  'privacy',
  'terms',
  'status',
  'status/subscribe',
  'docs',
  'community',
  'security',
  'demo',
  'juria',
  'insights',
  'legal-ai',
  'legal-case-management',
  'legal-practice-management',
  'legal-research',
  'legal-document-management',
  'legal-operations',
  'legal-knowledge-management',
  'responsible-legal-ai',
  'solutions/law-firms',
  'solutions/legal-departments',
]);

function preferredLocale(req) {
  const header = String(req.headers['accept-language'] || '').toLowerCase();
  for (const part of header.split(',')) {
    const code = part.trim().slice(0, 2);
    if (LOCALES.includes(code)) return code;
  }
  return DEFAULT_LOCALE;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHead(entry, canonicalBase) {
  const title = escapeHtml(entry.title);
  const description = escapeHtml(entry.description);
  const canonical = escapeHtml(entry.canonical);
  const slugPath = entry.canonical.replace(canonicalBase, ''); // e.g. /en/legal-ai
  const slug = slugPath.split('/').filter(Boolean).slice(1).join('/');
  const ogImage = `${canonicalBase}/og/og-default.jpg`;

  const hreflangs = LOCALES.map((locale) => {
    const href = `${canonicalBase}/${locale}${slug ? `/${slug}` : ''}`;
    return `    <link rel="alternate" hreflang="${locale}" href="${href}" />`;
  }).join('\n');
  const xDefault = `    <link rel="alternate" hreflang="x-default" href="${canonicalBase}/${DEFAULT_LOCALE}${slug ? `/${slug}` : ''}" />`;

  const jsonLd = (entry.jsonLd || [])
    .map((block) => `    <script type="application/ld+json">${JSON.stringify(block)}</script>`)
    .join('\n');

  return [
    `    <title>${title}</title>`,
    `    <meta name="description" content="${description}" />`,
    `    <meta name="author" content="JURE" />`,
    `    <link rel="canonical" href="${canonical}" />`,
    hreflangs,
    xDefault,
    `    <meta property="og:site_name" content="JURE" />`,
    `    <meta property="og:type" content="${entry.ogType || 'website'}" />`,
    `    <meta property="og:title" content="${title}" />`,
    `    <meta property="og:description" content="${description}" />`,
    `    <meta property="og:url" content="${canonical}" />`,
    `    <meta property="og:image" content="${ogImage}" />`,
    `    <meta property="og:locale" content="${entry.locale}" />`,
    `    <meta name="twitter:card" content="summary_large_image" />`,
    `    <meta name="twitter:title" content="${title}" />`,
    `    <meta name="twitter:description" content="${description}" />`,
    `    <meta name="twitter:image" content="${ogImage}" />`,
    jsonLd,
  ].join('\n');
}

/** Static body for crawlers; React replaces #root children on hydrate. */
function buildBodySnippet(entry) {
  if (!entry?.h1) return '<div id="root"></div>';
  const h1 = escapeHtml(entry.h1);
  const lead = escapeHtml(entry.lead || entry.description || '');
  const dir = entry.locale === 'ar' ? 'rtl' : 'ltr';
  return [
    '<div id="root">',
    `  <div id="jure-seo-body" data-seo-static dir="${dir}" style="max-width:48rem;margin:2rem auto;padding:0 1rem;font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a">`,
    `    <p style="font-size:0.875rem;font-weight:600;color:#64499D;margin:0 0 0.75rem">JURE</p>`,
    `    <h1 style="font-size:1.75rem;line-height:1.2;margin:0 0 1rem">${h1}</h1>`,
    lead ? `    <p style="font-size:1rem;color:#334155;margin:0">${lead}</p>` : '',
    '  </div>',
    '</div>',
  ]
    .filter(Boolean)
    .join('\n');
}

const SEO_START = '<!-- seo:start -->';
const SEO_END = '<!-- seo:end -->';
const htmlCache = new Map();

function htmlForPath(reqPath) {
  const normalized = reqPath.length > 1 ? reqPath.replace(/\/+$/, '') : reqPath;
  if (htmlCache.has(normalized)) return htmlCache.get(normalized);

  const entry = seoManifest.pages[normalized];
  let html = indexTemplate;
  if (entry) {
    const canonicalBase = (seoManifest.siteUrl || '').replace(/\/+$/, '');
    const startIdx = indexTemplate.indexOf(SEO_START);
    const endIdx = indexTemplate.indexOf(SEO_END);
    if (startIdx !== -1 && endIdx !== -1) {
      html =
        indexTemplate.slice(0, startIdx + SEO_START.length) +
        '\n' +
        buildHead(entry, canonicalBase) +
        '\n    ' +
        indexTemplate.slice(endIdx);
      html = html.replace('<html lang="en"', `<html lang="${entry.locale}"`);
      if (entry.locale === 'ar') {
        html = html.replace(`<html lang="ar"`, `<html lang="ar" dir="rtl"`);
      }
    }
    if (html.includes('<div id="root"></div>')) {
      html = html.replace('<div id="root"></div>', buildBodySnippet(entry));
    }
  }
  htmlCache.set(normalized, html);
  return html;
}

const app = express();

app.get('/health', (_req, res) => {
  res.status(200).type('text/plain').send('ok');
});

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const trimmed = req.path.replace(/^\/+|\/+$/g, '');
  const [head] = trimmed.split('/');
  if (LOCALES.includes(head)) return next();
  if (!LEGACY_MARKETING_SLUGS.has(trimmed)) return next();
  const locale = preferredLocale(req);
  res.redirect(301, `/${locale}${trimmed ? `/${trimmed}` : ''}`);
});

app.use(
  express.static(distDir, {
    index: false,
    maxAge: '1y',
    immutable: true,
  })
);

app.use((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).type('text/plain').send('Method Not Allowed');
    return;
  }
  res
    .status(200)
    .set('Cache-Control', 'no-cache')
    .type('html')
    .send(htmlForPath(req.path));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[jure-frontend] listening on http://0.0.0.0:${port}`);
});
