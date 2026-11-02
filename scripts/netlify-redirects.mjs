#!/usr/bin/env node
/**
 * Writes apps/web/dist/_redirects for Netlify after the storefront build.
 *
 * The storefront calls the API with relative paths (/api, /uploads, /sitemap.xml). Netlify only
 * hosts static files, so those paths are proxied (status 200) to the API host named by API_ORIGIN.
 * Proxying keeps the API on the storefront's origin, so the session and CSRF cookies keep working
 * without cross-site cookies. Every other path falls back to index.html for client-side routing.
 *
 *   API_ORIGIN=https://antiquora-api.onrender.com node scripts/netlify-redirects.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'apps/web/dist');
const raw = (process.env.API_ORIGIN ?? '').trim();

const fail = (msg) => {
  console.error(`\n✖ ${msg}\n  Set API_ORIGIN in Netlify → Site configuration → Environment variables (e.g. https://antiquora-api.onrender.com).\n`);
  process.exit(1);
};

if (!raw) fail('API_ORIGIN is not set, so the storefront would have no API.');
let origin;
try {
  origin = new URL(raw);
} catch {
  fail(`API_ORIGIN is not a valid URL: ${raw}`);
}
if (origin.protocol !== 'https:') fail(`API_ORIGIN must use https:// (got ${origin.protocol}//).`);
if (/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(origin.hostname)) fail('API_ORIGIN points at localhost, which Netlify cannot reach.');
if (!fs.existsSync(path.join(dist, 'index.html'))) fail('apps/web/dist/index.html is missing; run the web build first.');

const api = origin.origin; // drops any path or trailing slash
const rules = [
  `/api/*        ${api}/api/:splat        200`,
  `/uploads/*    ${api}/uploads/:splat    200`,
  `/sitemap.xml  ${api}/sitemap.xml       200`,
  `/*            /index.html             200`,
];
fs.writeFileSync(path.join(dist, '_redirects'), `${rules.join('\n')}\n`);
console.log(`✔ Wrote apps/web/dist/_redirects (API → ${api})`);
