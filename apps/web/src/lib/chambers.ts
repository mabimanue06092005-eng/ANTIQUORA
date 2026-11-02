/**
 * Visual identity for each Collector's Chamber, keyed by category slug. Content (names,
 * counts, products) always comes from the API — this only maps a category to its "room".
 */
export type FrameShape = 'medallion' | 'plinth' | 'panel' | 'niche' | 'folio' | 'cabinet';

export interface ChamberTheme {
  title: string;
  tagline: string;
  /** Section background (gradient). */
  bg: string;
  /** Accent text colour. */
  accent: string;
  /** Tint laid over the navigator thumbnail. */
  tint: string;
  /** Glass variant for labels. */
  glass: 'glass-dark' | 'glass-emerald' | 'glass';
  /** Light or dark room — decides text colour. */
  tone: 'dark' | 'light';
  frame: FrameShape;
  numeral: string;
}

const FALLBACK: ChamberTheme = {
  title: 'The Collection Room',
  tagline: 'Objects gathered for their craft and their stories.',
  bg: 'bg-[radial-gradient(ellipse_at_30%_20%,#2D5240_0%,#14271E_55%,#0b1510_100%)]',
  accent: 'text-gold-light',
  tint: 'from-emerald-dark/80',
  glass: 'glass-dark',
  tone: 'dark',
  frame: 'panel',
  numeral: '·',
};

export const CHAMBERS: Record<string, ChamberTheme> = {
  'ancient-coins': {
    title: 'The Numismatic Vault',
    tagline: 'Silver owls, Roman emperors and Cypriot gold — history struck in metal.',
    bg: 'bg-[radial-gradient(ellipse_at_50%_0%,#1A5A44_0%,#0F3D2E_40%,#061a12_100%)]',
    accent: 'text-gold-light',
    tint: 'from-emerald-dark/85',
    glass: 'glass-emerald',
    tone: 'dark',
    frame: 'medallion',
    numeral: 'I',
  },
  'sculptures-statues': {
    title: 'The Hall of Marble',
    tagline: 'Heroes, gods and devotional figures, lit as their carvers intended.',
    bg: 'bg-[radial-gradient(ellipse_at_50%_-10%,#5C4536_0%,#241912_55%,#120b07_100%)]',
    accent: 'text-gold-light',
    tint: 'from-walnut-dark/85',
    glass: 'glass-dark',
    tone: 'dark',
    frame: 'plinth',
    numeral: 'II',
  },
  'vintage-furniture': {
    title: 'The Cabinet Room',
    tagline: 'Mahogany, walnut and gilded pine from the great age of cabinetmaking.',
    bg: 'bg-[linear-gradient(180deg,#3B2A20_0%,#2a1d15_60%,#1a110c_100%)]',
    accent: 'text-gold-light',
    tint: 'from-walnut/85',
    glass: 'glass-dark',
    tone: 'dark',
    frame: 'panel',
    numeral: 'III',
  },
  'pottery-ceramics': {
    title: 'The Kiln Gallery',
    tagline: 'Black-figure amphorae, Iznik blues and celadon glazes from three continents.',
    bg: 'bg-[radial-gradient(ellipse_at_70%_10%,#8C3240_0%,#6B1F2A_35%,#2a0b10_100%)]',
    accent: 'text-gold-light',
    tint: 'from-burgundy-dark/85',
    glass: 'glass-dark',
    tone: 'dark',
    frame: 'niche',
    numeral: 'IV',
  },
  'manuscripts-prints': {
    title: 'The Scriptorium',
    tagline: 'Illuminated leaves, early star charts and woodblock prints, read by lamplight.',
    bg: 'bg-[radial-gradient(ellipse_at_30%_0%,#FAF6EE_0%,#F1E9D9_45%,#E6DAC2_100%)]',
    accent: 'text-burgundy',
    tint: 'from-parchment-deep/85',
    glass: 'glass',
    tone: 'light',
    frame: 'folio',
    numeral: 'V',
  },
  'decorative-collectibles': {
    title: 'The Wunderkammer',
    tagline: 'A cabinet of curiosities — astrolabes, snuff bottles, clocks and silver.',
    bg: 'bg-[radial-gradient(ellipse_at_20%_20%,#6B1F2A_0%,#3E1018_45%,#14271E_100%)]',
    accent: 'text-gold-light',
    tint: 'from-burgundy/85',
    glass: 'glass-dark',
    tone: 'dark',
    frame: 'cabinet',
    numeral: 'VI',
  },
};

export const chamberFor = (slug: string | undefined) => (slug && CHAMBERS[slug]) || FALLBACK;

/** Stable pseudo-random 0..1 from a string — used for composition offsets, never for data. */
export function hash01(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}
