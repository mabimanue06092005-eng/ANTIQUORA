import { useLocation } from 'react-router-dom';
import { CHAMBERS } from './chambers';

/** Where the visitor came from, carried in router state so the product page can link back. */
export interface FromState {
  from: string;
  label: string;
}

export function labelForPath(pathname: string): string {
  if (pathname.startsWith('/gallery')) return 'the gallery';
  if (pathname.startsWith('/chambers/')) {
    const slug = pathname.split('/')[2];
    return CHAMBERS[slug]?.title ?? 'the chamber';
  }
  if (pathname.startsWith('/shop')) return 'your results';
  if (pathname.startsWith('/wishlist') || pathname.startsWith('/account/wishlist')) return 'your wishlist';
  if (pathname.startsWith('/artifact/')) return 'the previous artifact';
  if (pathname === '/') return 'the museum entrance';
  return 'the previous page';
}

/** Router state to attach to every link that opens a product. */
export function useFromState(): FromState {
  const loc = useLocation();
  return { from: loc.pathname + loc.search, label: labelForPath(loc.pathname) };
}

/** Filter parameters shared by the immersive gallery and the compact results view. */
export const FILTER_KEYS = ['q', 'category', 'minPrice', 'maxPrice', 'sort', 'inStock', 'featured', 'onSale'] as const;

export function filtersOnly(search: string) {
  const src = new URLSearchParams(search);
  const out = new URLSearchParams();
  for (const k of FILTER_KEYS) {
    const v = src.get(k);
    if (v) out.set(k, v);
  }
  const s = out.toString();
  return s ? `?${s}` : '';
}

const LAST_KEY = 'aq_last_filters';
export function rememberFilters(search: string) {
  try {
    sessionStorage.setItem(LAST_KEY, filtersOnly(search));
  } catch {
    /* storage unavailable */
  }
}
export function lastFilters() {
  try {
    return sessionStorage.getItem(LAST_KEY) ?? '';
  } catch {
    return '';
  }
}
