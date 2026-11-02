// One-off helper used to build the local image library in apps/web/public/images/products.
// Images come from The Metropolitan Museum of Art Open Access program and are public
// domain (CC0): https://www.metmuseum.org/about-the-met/policies-and-documents/open-access
// Usage: node scripts/fetch-images.mjs   (slow on purpose to respect the API's rate limits)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'apps/web/public/images/products');
mkdirSync(outDir, { recursive: true });

export const OBJECTS = {
  'athenian-owl-tetradrachm': 330160,
  'octavian-denarius': 248036,
  'cypriot-gold-stater': 243088,
  'parthian-tetradrachm': 322362,
  'severan-denarius': 469172,
  'bronze-cupid-statuette': 250787,
  'bronze-bull-statuette': 256661,
  'marble-herakles-head': 250678,
  'marble-youth-head': 248901,
  'gandhara-buddha': 646117,
  'mahogany-chest-on-chest': 2028,
  'mechanical-table': 197339,
  'walnut-folding-armchair': 229,
  'gilded-pier-mirror': 202230,
  'walnut-centre-table': 8083,
  'attic-neck-amphora': 254882,
  'iznik-dish': 446648,
  'nishapur-ewer': 448541,
  'celadon-hanaire': 902202,
  'korean-porcelain-jar': 57517,
  'book-of-hours': 468941,
  'italian-manuscript-leaf': 469041,
  'celestial-map-1515': 358366,
  'map-of-alexandria': 587676,
  'great-wave-print': 45434,
  'persian-astrolabe': 451699,
  'agate-snuff-bottle': 41546,
  'aventurine-snuff-bottle': 41517,
  'carriage-clock': 1454,
  'silver-ewer-1745': 202116,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const curlJson = (u) => JSON.parse(execFileSync('curl', ['-s', '-m', '30', u], { encoding: 'utf8' }));
const curlFile = (u, dest) => execFileSync('curl', ['-s', '-f', '-m', '60', '-o', dest, u]);

const manifest = {};
for (const [key, id] of Object.entries(OBJECTS)) {
  const o = curlJson(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
  if (!o.isPublicDomain) throw new Error(`${key} (${id}) is not public domain`);
  const urls = [o.primaryImageSmall, ...(o.additionalImages ?? []).slice(0, 2).map((u) => u.replace('/original/', '/web-large/'))].filter(Boolean);
  const files = [];
  for (const [i, u] of urls.entries()) {
    const file = `${key}-${i + 1}.jpg`;
    const dest = path.join(outDir, file);
    if (!existsSync(dest)) {
      try {
        curlFile(u, dest);
        await sleep(400);
      } catch {
        console.warn(`  ! could not download ${u}`);
        continue;
      }
    }
    files.push(`/images/products/${file}`);
  }
  manifest[key] = { objectID: id, title: o.title, date: o.objectDate, culture: o.culture || o.country, medium: o.medium, dimensions: o.dimensions, objectURL: o.objectURL, files };
  console.log(`✓ ${key}: ${files.length} image(s) — ${o.title}`);
  await sleep(1500);
}
writeFileSync(path.join(root, 'apps/api/prisma/image-manifest.json'), JSON.stringify(manifest, null, 2));
console.log('Wrote apps/api/prisma/image-manifest.json');
