import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { GalleryHorizontalEnd, LayoutGrid, RotateCcw, Search, X } from 'lucide-react';
import { api, qs } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import type { Category, ProductCard } from '@/lib/types';
import { lastFilters, labelForPath } from '@/lib/navState';
import { PriceRange } from '@/components/PriceRange';
import { Img, Spinner, formatINR } from '@/components/ui';
import { cn } from '@/lib/utils';

const PRICE_MAX = 700000;
const SORTS = [
  ['featured', 'Featured'],
  ['newest', 'Newest'],
  ['popular', 'Most popular'],
  ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'],
] as const;

interface Draft {
  q: string;
  categories: string[];
  price: [number, number];
  inStock: boolean;
  sort: string;
}

function draftFrom(search: string): Draft {
  const p = new URLSearchParams(search);
  return {
    q: p.get('q') ?? '',
    categories: (p.get('category') ?? '').split(',').filter(Boolean),
    price: [Number(p.get('minPrice')) || 0, Number(p.get('maxPrice')) || PRICE_MAX],
    inStock: p.get('inStock') === 'true',
    sort: p.get('sort') ?? 'featured',
  };
}

function toQuery(d: Draft, extra: Record<string, string | number> = {}) {
  return qs({
    q: d.q.trim() || undefined,
    category: d.categories.join(',') || undefined,
    minPrice: d.price[0] > 0 ? d.price[0] : undefined,
    maxPrice: d.price[1] < PRICE_MAX ? d.price[1] : undefined,
    inStock: d.inStock || undefined,
    sort: d.sort === 'featured' ? undefined : d.sort,
    ...extra,
  });
}

const Ctx = createContext<{ open: () => void; close: () => void; isOpen: boolean }>({ open: () => undefined, close: () => undefined, isOpen: false });
export const useSearchPanel = () => useContext(Ctx);

export function SearchPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  // Ctrl/⌘ + K, or "/" outside a text field, opens search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest?.('input, textarea, select, [contenteditable="true"]');
      if ((e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <Ctx.Provider value={{ open, close, isOpen }}>
      {children}
      <AnimatePresence>{isOpen && <SearchPanel onClose={close} />}</AnimatePresence>
    </Ctx.Provider>
  );
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const onResultsPage = location.pathname.startsWith('/gallery') || location.pathname.startsWith('/shop');
  const [draft, setDraft] = useState<Draft>(() => draftFrom(onResultsPage ? location.search : lastFilters()));
  const { data: categories } = useAsync(() => api.get<Category[]>('/api/categories'), []);
  const [results, setResults] = useState<{ items: ProductCard[]; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const query = useMemo(() => toQuery(draft), [draft]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 60);
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select');
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [onClose]);

  // Live preview from the catalogue API (debounced).
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.page<ProductCard[]>(`/api/products${toQuery(draft, { pageSize: 6 })}`);
        setResults({ items: res.data, total: res.meta?.total ?? res.data.length });
      } catch {
        setResults({ items: [], total: 0 });
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [draft]);

  const go = (path: '/gallery' | '/shop') => {
    onClose();
    navigate(`${path}${query}`);
  };
  const toggleCat = (slug: string) =>
    setDraft((d) => ({ ...d, categories: d.categories.includes(slug) ? d.categories.filter((c) => c !== slug) : [...d.categories, slug] }));

  return (
    <motion.div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto p-3 sm:p-6 md:pt-[8vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="fixed inset-0 bg-walnut-dark/55 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search the collection"
        initial={{ y: -24, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -12, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="glass relative w-full max-w-4xl"
      >
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" aria-hidden />
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            go('/gallery');
          }}
          className="flex items-center gap-3 border-b border-walnut/15 px-5 py-4 sm:px-7"
        >
          <Search className="h-6 w-6 shrink-0 text-gold-dark" aria-hidden />
          <label htmlFor="site-search" className="sr-only">Search artifacts by name, description or SKU</label>
          <input
            ref={inputRef}
            id="site-search"
            value={draft.q}
            onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
            placeholder="Search the museum — coins, marble, Iznik, SKU…"
            className="min-w-0 flex-1 bg-transparent font-serif text-2xl text-walnut placeholder:text-ink-muted/70 focus:outline-none md:text-3xl"
            autoComplete="off"
          />
          {loading && <Spinner />}
          <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center text-walnut hover:text-gold-dark" aria-label="Close search">
            <X className="h-6 w-6" />
          </button>
        </form>

        <div className="grid gap-6 px-5 py-5 sm:px-7 md:grid-cols-[1fr_1.15fr]">
          {/* Refinements */}
          <div className="space-y-5">
            <fieldset>
              <legend className="field-label">Chambers</legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {categories?.map((c) => {
                  const on = draft.categories.includes(c.slug);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCat(c.slug)}
                      aria-pressed={on}
                      className={cn('min-h-[36px] border px-3 text-xs transition-colors', on ? 'border-walnut bg-walnut text-ivory' : 'border-walnut/20 bg-white/40 text-ink-soft hover:border-gold')}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <fieldset>
              <legend className="field-label">Price</legend>
              <PriceRange min={0} max={PRICE_MAX} step={5000} value={draft.price} onCommit={(price) => setDraft((d) => ({ ...d, price }))} />
            </fieldset>
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
                <input type="checkbox" className="h-4 w-4 accent-forest" checked={draft.inStock} onChange={(e) => setDraft((d) => ({ ...d, inStock: e.target.checked }))} />
                Available now
              </label>
              <div className="min-w-[180px] flex-1">
                <label htmlFor="panel-sort" className="field-label">Sort</label>
                <select id="panel-sort" value={draft.sort} onChange={(e) => setDraft((d) => ({ ...d, sort: e.target.value }))} className="field-input h-11 bg-white/60 py-0 text-sm">
                  {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <button type="button" onClick={() => setDraft(draftFrom(''))} className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-ink-muted hover:text-walnut">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          </div>

          {/* Live preview */}
          <div>
            <p className="eyebrow mb-3" role="status" aria-live="polite">
              {results ? `${results.total} ${results.total === 1 ? 'artifact' : 'artifacts'} match` : 'Searching…'}
            </p>
            {results && results.items.length === 0 ? (
              <p className="text-sm text-ink-muted">{draft.categories.length || draft.inStock || draft.price[0] > 0 || draft.price[1] < PRICE_MAX ? 'Nothing matches with these filters. Try removing a chamber, widening the price, or press Reset.' : 'Nothing matches yet — try a broader word such as “coin”, “print” or “bronze”.'}</p>
            ) : (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {results?.items.map((p) => (
                  <li key={p.id}>
                    <Link to={`/artifact/${p.slug}`} state={{ from: location.pathname + location.search, label: labelForPath(location.pathname) }} onClick={onClose} className="group block bg-white/40 p-1.5 transition-colors hover:bg-white/80">
                      <div className="aspect-square overflow-hidden bg-parchment">
                        <Img src={p.image?.url} alt={p.image?.alt ?? p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      </div>
                      <p className="mt-1.5 line-clamp-1 font-serif text-[15px] leading-tight text-walnut">{p.name}</p>
                      <p className="text-xs text-ink-soft">{formatINR(p.pricePaise)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-walnut/15 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
          <button type="button" onClick={() => go('/shop')} className="btn-outline bg-white/40">
            <LayoutGrid className="h-4 w-4" /> Compact results
          </button>
          <button type="button" onClick={() => go('/gallery')} className="btn-primary">
            <GalleryHorizontalEnd className="h-4 w-4" /> Explore in the gallery{results ? ` (${results.total})` : ''}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Floating glass trigger, present on every storefront page. */
export function FloatingSearchButton() {
  const { open, isOpen } = useSearchPanel();
  const { pathname } = useLocation();
  // The gallery has its own Search & refine control; checkout should stay uncluttered.
  if (isOpen || pathname.startsWith('/checkout') || pathname.startsWith('/gallery')) return null;
  return (
    <button
      onClick={open}
      aria-label="Search the collection"
      aria-keyshortcuts="Control+K Meta+K"
      className="glass group fixed bottom-4 right-4 z-[70] flex h-12 min-w-12 items-center justify-center gap-2.5 rounded-full px-3.5 text-sm text-walnut transition-all duration-300 hover:-translate-y-0.5 hover:border-gold focus-visible:px-4 sm:bottom-6 sm:right-6"
    >
      <Search className="h-4 w-4 text-gold-dark" aria-hidden />
      <span className="hidden max-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 group-hover:max-w-[200px] group-focus-visible:max-w-[200px] sm:inline">Search the museum <kbd className="ml-1 border border-walnut/20 bg-white/50 px-1.5 py-0.5 font-mono text-[10px] text-ink-soft">Ctrl K</kbd></span>
    </button>
  );
}

/** Switch between immersive and compact views while keeping the same filters. */
export function ViewToggle({ current, dark = false }: { current: 'gallery' | 'shop'; dark?: boolean }) {
  const { search } = useLocation();
  const keep = new URLSearchParams(search);
  keep.delete('a');
  keep.delete('page');
  keep.delete('view');
  const q = keep.toString() ? `?${keep}` : '';
  const item = (key: 'gallery' | 'shop', label: string, Icon: typeof LayoutGrid) => (
    <Link
      to={`/${key}${q}`}
      aria-current={current === key ? 'page' : undefined}
      className={cn(
        'flex h-10 items-center gap-2 px-3.5 text-[12px] uppercase tracking-[0.12em] transition-colors',
        current === key ? (dark ? 'bg-gold text-walnut-dark' : 'bg-walnut text-ivory') : dark ? 'text-ivory/80 hover:text-gold-light' : 'text-ink-soft hover:text-walnut',
      )}
    >
      <Icon className="h-4 w-4" aria-hidden /> {label}
    </Link>
  );
  return (
    <nav aria-label="View mode" className={cn('flex p-1', dark ? 'glass-dark' : 'glass')}>
      {item('gallery', 'Immersive', GalleryHorizontalEnd)}
      {item('shop', 'Compact', LayoutGrid)}
    </nav>
  );
}
