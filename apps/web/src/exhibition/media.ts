/**
 * High-resolution exhibition photography. `scripts/fetch-hd-images.mjs` stores a 1600px
 * version of each seeded product's primary image at /images/hd/<slug>.jpg (Met Open Access,
 * CC0). Products added later through the admin have no HD file, so callers always pass the
 * regular image as a fallback (see <ExhibitImage>).
 */
export const hdFor = (slug: string) => `/images/hd/${slug}.jpg`;

/** Category images are seeded as /images/products/<slug>-1.jpg — map them to their HD version. */
export const hdFromProductImage = (url: string | null | undefined) => {
  const m = url?.match(/^\/images\/products\/(.+)-1\.jpg$/);
  return m ? `/images/hd/${m[1]}.jpg` : url ?? undefined;
};

/** One easing language for the whole exhibition: weighted, cinematic, never springy. */
export const EASE_OUT = 'power3.out';
export const EASE_INOUT = 'power2.inOut';

/** Height of the sticky site header; pinned halls start below it. */
export const headerOffset = () => (document.querySelector('header') as HTMLElement | null)?.offsetHeight ?? 0;
