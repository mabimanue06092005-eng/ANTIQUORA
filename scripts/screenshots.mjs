// Dev utility: full-page screenshots of pages at desktop (1440) and mobile (390) widths.
// Usage: node scripts/screenshots.mjs <outDir> / /shop /artifact/iznik-dish   (dev server on :5173)
import { chromium } from '@playwright/test';
const out = process.argv[2];
const pages = process.argv.slice(3);
const browser = await chromium.launch();
for (const [w, h, tag] of [[1440, 900, 'd'], [390, 844, 'm']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && console.log('console error', m.text()));
  for (const p of pages) {
    await page.goto((process.env.BASE_URL ?? 'http://localhost:5173') + p, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    // trigger whileInView reveals
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } window.scrollTo(0, 0); });
    await page.waitForTimeout(500);
    const name = `${tag}-${p.replace(/[^a-z0-9]+/gi, '_') || 'home'}.png`;
    await page.screenshot({ path: `${out}/${name}`, fullPage: true });
    console.log('shot', name);
  }
  await ctx.close();
}
await browser.close();
