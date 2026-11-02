// Builds the high-resolution image set used by the homepage exhibition (apps/web/public/images/hd).
// Source: The Metropolitan Museum of Art Open Access — public domain (CC0) originals for the objects
// already listed in apps/api/prisma/image-manifest.json. Originals are downscaled to a 1600px long edge
// with the Chromium that Playwright already installs (no image-processing dependency needed).
// Usage: node scripts/fetch-hd-images.mjs     (slow on purpose: the Met API rate-limits bursts)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(path.join(root, 'apps/api/prisma/image-manifest.json'), 'utf8'));
const outDir = path.join(root, 'apps/web/public/images/hd');
mkdirSync(outDir, { recursive: true });
const tmp = path.join(os.tmpdir(), 'antiquora-hd');
mkdirSync(tmp, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX = 1600;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('about:blank');

for (const [key, entry] of Object.entries(manifest)) {
  const dest = path.join(outDir, `${key}.jpg`);
  if (existsSync(dest)) {
    console.log(`= ${key} (exists)`);
    continue;
  }
  try {
    const obj = JSON.parse(execFileSync('curl', ['-s', '-m', '30', `https://collectionapi.metmuseum.org/public/collection/v1/objects/${entry.objectID}`], { encoding: 'utf8' }));
    if (!obj.isPublicDomain || !obj.primaryImage) throw new Error('not public domain / no original');
    const raw = path.join(tmp, `${key}.orig.jpg`);
    execFileSync('curl', ['-s', '-f', '-m', '120', '-o', raw, obj.primaryImage]);
    const b64 = readFileSync(raw).toString('base64');
    const out = await page.evaluate(
      async ({ b64, MAX }) => {
        const img = new Image();
        img.src = `data:image/jpeg;base64,${b64}`;
        await img.decode();
        const s = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * s);
        c.height = Math.round(img.naturalHeight * s);
        const g = c.getContext('2d');
        g.imageSmoothingQuality = 'high';
        g.drawImage(img, 0, 0, c.width, c.height);
        return { data: c.toDataURL('image/jpeg', 0.84).split(',')[1], w: c.width, h: c.height };
      },
      { b64, MAX },
    );
    writeFileSync(dest, Buffer.from(out.data, 'base64'));
    rmSync(raw, { force: true });
    console.log(`✓ ${key} ${out.w}x${out.h} ${Math.round(Buffer.byteLength(out.data, 'base64') / 1024)}KB`);
  } catch (e) {
    console.warn(`! ${key}: ${e.message}`);
  }
  await sleep(1500);
}
await browser.close();
