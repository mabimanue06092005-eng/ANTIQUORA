import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Heart, ShoppingBag, SlidersHorizontal } from 'lucide-react';
import { api, qs } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { useSeo } from '@/lib/seo';
import type { Category, ProductCard as PC } from '@/lib/types';
import { hash01 } from '@/lib/chambers';
import { labelForPath, rememberFilters } from '@/lib/navState';
import { useShop } from '@/context/ShopContext';
import { useSearchPanel, ViewToggle } from '@/components/museum/SearchPanel';
import { ErrorState, Spinner, formatINR } from '@/components/ui';
import { StockNote } from '@/components/product/ProductCard';
import { cn } from '@/lib/utils';

const RENDER_RADIUS = 4; // artifacts rendered either side of the selection

export default function Gallery() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { open: openSearch } = useSearchPanel();
  const { addToCart, toggleWishlist, isWishlisted } = useShop();

  const filterQuery = useMemo(() => {
    const p = new URLSearchParams(params);
    p.delete('a');
    return p.toString();
  }, [params]);
  useEffect(() => rememberFilters(`?${filterQuery}`), [filterQuery]);

  const apiQuery = qs({
    q: params.get('q'),
    category: params.get('category'),
    minPrice: params.get('minPrice'),
    maxPrice: params.get('maxPrice'),
    sort: params.get('sort') ?? 'featured',
    inStock: params.get('inStock'),
    featured: params.get('featured'),
    onSale: params.get('onSale'),
    pageSize: 48,
  });
  const { data, error, loading, reload } = useAsync(() => api.page<PC[]>(`/api/products${apiQuery}`), [apiQuery]);
  const { data: categories } = useAsync(() => api.get<Category[]>('/api/categories'), []);
  const items = data?.data ?? [];
  const count = items.length;
  const loop = count >= 4;

  const activeCats = (params.get('category') ?? '').split(',').filter(Boolean);
  useSeo({ title: 'The Gallery', description: 'Walk through the ANTIQUORA collection in an immersive horizontal gallery of rare artifacts.' });

  /* ── Selection & motion ─────────────────────────────── */
  const initial = Math.max(0, items.findIndex((p) => p.slug === params.get('a')));
  const [sel, setSel] = useState(0);
  const posRef = useRef(0);
  const targetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<number, HTMLElement>());
  const pitchRef = useRef(360);
  const dragRef = useRef<{ id: number; x: number; pos: number; moved: number; v: number; t: number } | null>(null);
  const suppressClick = useRef(false);

  const wrap = useCallback((i: number) => (count ? ((Math.round(i) % count) + count) % count : 0), [count]);
  const clamp = useCallback((p: number) => (loop ? p : Math.max(0, Math.min(count - 1, p))), [loop, count]);

  // Reset when the result set changes; centre on ?a= if present.
  useEffect(() => {
    posRef.current = initial;
    targetRef.current = initial;
    setSel(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const paint = useCallback(() => {
    const pitch = pitchRef.current;
    cardRefs.current.forEach((el, index) => {
      let offset = index - posRef.current;
      if (loop) {
        offset = ((offset % count) + count) % count;
        if (offset > count / 2) offset -= count;
      }
      const d = Math.abs(offset);
      const h = hash01(String(index * 7919 + count));
      // Neighbours take varied scales and heights; the selection is always full size and centred.
      const restScale = 0.56 + h * 0.2;
      const scale = 1 - (1 - restScale) * Math.min(1, d);
      const y = (h - 0.5) * 120 * Math.min(1, d);
      const x = offset * pitch * (d <= 1 ? 1 : 0.92 + 0.08 / d);
      el.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0) scale(${scale})`;
      el.style.opacity = String(Math.max(0, 1 - Math.max(0, d - 2.2) * 0.6));
      el.style.zIndex = String(100 - Math.round(d * 10));
      el.style.setProperty('--dim', String(Math.min(0.62, d * 0.42)));
      el.style.pointerEvents = d > 3 ? 'none' : 'auto';
    });
  }, [count, loop]);

  const settle = useCallback(
    (target: number) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      targetRef.current = target;
      setSel(wrap(target));
      if (reduce) {
        posRef.current = target;
        paint();
        return;
      }
      const step = () => {
        const rem = target - posRef.current;
        if (Math.abs(rem) < 0.0005) {
          posRef.current = target;
          paint();
          rafRef.current = null;
          return;
        }
        posRef.current += rem * 0.14;
        paint();
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [paint, reduce, wrap],
  );

  const nudge = useCallback((by: number) => settle(clamp(Math.round(targetRef.current) + by)), [clamp, settle]);
  const goTo = useCallback(
    (index: number) => settle(clamp(loop ? index + Math.round((targetRef.current - index) / count) * count : index)),
    [clamp, count, loop, settle],
  );

  // Keep ?a=<slug> in the URL so Back returns to the same artifact.
  useEffect(() => {
    const slug = items[sel]?.slug;
    if (!slug || params.get('a') === slug) return;
    const t = setTimeout(() => {
      const next = new URLSearchParams(params);
      next.set('a', slug);
      setParams(next, { replace: true, preventScrollReset: true });
    }, 300);
    return () => clearTimeout(t);
  }, [sel, items, params, setParams]);

  // Measure card width (drives spacing) and repaint on resize.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const w = stage.clientWidth;
      pitchRef.current = Math.max(170, Math.min(400, w * 0.27));
      stage.style.setProperty('--card', `${Math.max(200, Math.min(400, w * 0.3))}px`);
      paint();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [paint, count]);
  useLayoutEffect(paint, [sel, paint]);
  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  // Horizontal trackpad / shift-wheel navigation. Vertical wheel is left to the page so scrolling never gets trapped.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let acc = 0;
    let last = 0;
    const onWheel = (e: WheelEvent) => {
      const dx = e.shiftKey && Math.abs(e.deltaX) < Math.abs(e.deltaY) ? e.deltaY : e.deltaX;
      if (Math.abs(dx) <= Math.abs(e.shiftKey ? 0 : e.deltaY)) return;
      e.preventDefault();
      acc += dx;
      const now = performance.now();
      if (Math.abs(acc) > 60 && now - last > 220) {
        nudge(acc > 0 ? 1 : -1);
        acc = 0;
        last = now;
      }
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [nudge]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    dragRef.current = { id: e.pointerId, x: e.clientX, pos: posRef.current, moved: 0, v: 0, t: performance.now() };
    suppressClick.current = false;
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    d.moved = Math.max(d.moved, Math.abs(dx));
    if (d.moved > 6 && !stageRef.current?.hasPointerCapture(e.pointerId)) stageRef.current?.setPointerCapture(e.pointerId);
    const now = performance.now();
    const prev = posRef.current;
    posRef.current = clamp(d.pos - dx / pitchRef.current);
    d.v = ((posRef.current - prev) / Math.max(now - d.t, 1)) * 1000;
    d.t = now;
    const idx = wrap(posRef.current);
    if (idx !== sel) setSel(idx);
    paint();
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    dragRef.current = null;
    if (d.moved > 6) {
      suppressClick.current = true;
      settle(clamp(Math.round(posRef.current + Math.max(-2, Math.min(2, d.v * 0.2)))));
    }
  };

  const fromState = { from: `${location.pathname}?${new URLSearchParams({ ...Object.fromEntries(params), ...(items[sel] ? { a: items[sel].slug } : {}) })}`, label: labelForPath('/gallery') };
  const visible = useMemo(() => {
    const set = new Set<number>();
    for (let d = -RENDER_RADIUS; d <= RENDER_RADIUS; d++) {
      const i = loop ? wrap(sel + d) : sel + d;
      if (i >= 0 && i < count) set.add(i);
    }
    return set;
  }, [sel, count, loop, wrap]);

  const p = items[sel];
  const setCategory = (slug: string | null) => {
    const next = new URLSearchParams(params);
    next.delete('a');
    if (slug) next.set('category', slug);
    else next.delete('category');
    setParams(next);
  };

  return (
    <div className="relative overflow-hidden bg-[radial-gradient(ellipse_80%_70%_at_50%_30%,#1A5A44_0%,#0F3D2E_35%,#14100c_100%)] text-ivory">
      {/* Archival ornament: faint ruled grid + giant numeral */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(210,183,131,1)_1px,transparent_1px),linear-gradient(90deg,rgba(210,183,131,1)_1px,transparent_1px)] [background-size:80px_80px]" aria-hidden />
      <AnimatePresence mode="wait">
        {p && (
          <motion.p
            key={sel}
            initial={reduce ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="text-outline-gold pointer-events-none absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 select-none font-serif text-[34vw] leading-none md:text-[22vw]"
            aria-hidden
          >
            {String(sel + 1).padStart(2, '0')}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Top bar: title, chamber chips, view toggle */}
      <div className="container-site relative z-20 flex flex-wrap items-center justify-between gap-4 pt-6 md:pt-8">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold-light">The Living Museum · Gallery</p>
          <h1 className="mt-1 font-serif text-3xl text-ivory md:text-4xl">
            {params.get('q') ? <>“{params.get('q')}”</> : activeCats.length === 1 ? categories?.find((c) => c.slug === activeCats[0])?.name ?? 'The Gallery' : 'The Gallery'}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={openSearch} className="glass-dark flex h-12 items-center gap-2 px-4 text-[12px] uppercase tracking-[0.12em] text-ivory hover:border-gold-light">
            <SlidersHorizontal className="h-4 w-4 text-gold-light" /> Search & refine
          </button>
          <ViewToggle current="gallery" dark />
        </div>
      </div>
      <div className="container-site relative z-20 mt-4">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filter by chamber">
          <button onClick={() => setCategory(null)} aria-pressed={!activeCats.length} className={cn('glass-dark min-h-[36px] shrink-0 px-3.5 text-xs', !activeCats.length && '!border-gold-light !bg-gold/25')}>
            All chambers
          </button>
          {categories?.map((c) => (
            <button key={c.id} onClick={() => setCategory(c.slug)} aria-pressed={activeCats.includes(c.slug)} className={cn('glass-dark min-h-[36px] shrink-0 px-3.5 text-xs', activeCats.includes(c.slug) && '!border-gold-light !bg-gold/25')}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Stage */}
      <section aria-roledescription="carousel" aria-label="Artifact gallery" className="relative z-10">
        {loading && !data ? (
          <div className="flex h-[62vh] items-center justify-center"><Spinner className="h-8 w-8 text-gold-light" /></div>
        ) : error ? (
          <div className="container-site py-24"><ErrorState message={error.message} onRetry={reload} /></div>
        ) : count === 0 ? (
          <div className="container-site flex h-[52vh] flex-col items-center justify-center text-center">
            <p className="font-serif text-4xl text-ivory">No artifacts in this wing — yet</p>
            <p className="mt-3 text-ivory/70">Try another chamber or a broader search.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setParams({})} className="btn-gold">Show everything</button>
              <button onClick={openSearch} className="btn-outline-light">Search again</button>
            </div>
          </div>
        ) : (
          <>
            <div
              ref={stageRef}
              tabIndex={0}
              role="group"
              aria-label={`Artifact ${sel + 1} of ${count}${p ? `: ${p.name}` : ''}. Use left and right arrow keys to browse, Enter to open.`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onClickCapture={(e) => {
                if (suppressClick.current) {
                  e.preventDefault();
                  e.stopPropagation();
                  suppressClick.current = false;
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') { e.preventDefault(); nudge(1); }
                else if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(-1); }
                else if (e.key === 'Home') { e.preventDefault(); goTo(0); }
                else if (e.key === 'End') { e.preventDefault(); goTo(count - 1); }
                else if (e.key === 'Enter' && p) navigate(`/artifact/${p.slug}`, { state: fromState });
              }}
              className="relative h-[50vh] min-h-[340px] cursor-grab sm:h-[min(64vh,600px)] sm:min-h-[380px] select-none outline-none [touch-action:pan-y] active:cursor-grabbing focus-visible:ring-1 focus-visible:ring-gold-light/60"
            >
              {items.map((item, i) =>
                visible.has(i) ? (
                  <Link
                    key={item.id}
                    ref={(el) => {
                      if (el) cardRefs.current.set(i, el);
                      else cardRefs.current.delete(i);
                    }}
                    to={`/artifact/${item.slug}`}
                    state={fromState}
                    draggable={false}
                    tabIndex={i === sel ? 0 : -1}
                    aria-label={`${item.name}, ${item.category.name}, ${formatINR(item.pricePaise)}`}
                    className="group absolute left-1/2 top-1/2 block w-[var(--card)] will-change-transform"
                  >
                    <figure className={cn('relative overflow-hidden bg-walnut shadow-[0_40px_80px_-30px_rgba(0,0,0,0.85)] transition-shadow duration-500', i === sel && 'ring-1 ring-gold-light/70 shadow-[0_0_0_1px_rgba(210,183,131,0.4),0_50px_100px_-30px_rgba(0,0,0,0.9),0_0_80px_-20px_rgba(210,183,131,0.45)]')}>
                      <img
                        src={item.image?.url ?? '/images/placeholder-artifact.svg'}
                        alt={item.image?.alt ?? item.name}
                        draggable={false}
                        loading={Math.abs(i - sel) <= 1 ? 'eager' : 'lazy'}
                        decoding="async"
                        onError={(e) => ((e.target as HTMLImageElement).src = '/images/placeholder-artifact.svg')}
                        className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                      <span className="pointer-events-none absolute inset-0 bg-walnut-dark transition-opacity duration-300" style={{ opacity: 'var(--dim, 0)' }} aria-hidden />
                      <span className="pointer-events-none absolute left-3 top-3 bg-walnut-dark/70 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.18em] text-gold-light backdrop-blur-sm">
                        Nº {String(i + 1).padStart(2, '0')}
                      </span>
                    </figure>
                  </Link>
                ) : null,
              )}
            </div>

            {/* Glass information panel for the selected artifact */}
            <div className="container-site relative z-20 -mt-6 grid items-end gap-4 pb-6 md:-mt-10 md:grid-cols-[1fr_auto]">
              <div aria-live="polite">
                <AnimatePresence mode="wait" initial={false}>
                  {p && (
                    <motion.div
                      key={p.id}
                      initial={reduce ? false : { opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? undefined : { opacity: 0, y: -8 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="glass-dark relative max-w-2xl p-5 md:p-6"
                    >
                      <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-gold-light to-transparent" aria-hidden />
                      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold-light">
                        {p.category.name}{p.period ? ` · ${p.period}` : ''}
                      </p>
                      <h2 className="mt-2 font-serif text-3xl leading-tight text-ivory md:text-4xl">{p.name}</h2>
                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
                        <span className="font-serif text-2xl text-gold-light">{formatINR(p.pricePaise)}</span>
                        {p.compareAtPaise && <s className="text-sm text-ivory/50">{formatINR(p.compareAtPaise)}</s>}
                        <span className="[&_span]:!text-ivory/80"><StockNote product={p} /></span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link to={`/artifact/${p.slug}`} state={fromState} className="btn-gold">
                          View artifact <ArrowRight className="h-4 w-4" />
                        </Link>
                        <button onClick={() => addToCart(p)} disabled={p.stock <= 0} className="btn-outline-light">
                          <ShoppingBag className="h-4 w-4" /> {p.stock <= 0 ? 'Sold out' : 'Add to bag'}
                        </button>
                        <button onClick={() => toggleWishlist(p)} aria-pressed={isWishlisted(p.id)} aria-label={isWishlisted(p.id) ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`} className="flex h-11 w-11 items-center justify-center border border-ivory/40 text-ivory hover:border-gold-light hover:text-gold-light">
                          <Heart className={cn('h-4 w-4', isWishlisted(p.id) && 'fill-gold-light text-gold-light')} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-3 md:flex-col md:items-end">
                <p className="font-mono text-xs tracking-[0.2em] text-ivory/70" aria-hidden>
                  <span className="font-serif text-3xl text-gold-light">{String(sel + 1).padStart(2, '0')}</span> / {String(count).padStart(2, '0')}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => nudge(-1)} disabled={!loop && sel === 0} className="glass-dark flex h-12 w-12 items-center justify-center hover:border-gold-light disabled:opacity-40" aria-label="Previous artifact">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button onClick={() => nudge(1)} disabled={!loop && sel === count - 1} className="glass-dark flex h-12 w-12 items-center justify-center hover:border-gold-light disabled:opacity-40" aria-label="Next artifact">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
                <p className="hidden text-[11px] uppercase tracking-[0.18em] text-ivory/50 md:block" aria-hidden>Drag · Swipe · ← →</p>
              </div>
            </div>

            {/* Scrubber: every artifact in this view, as accessible navigation */}
            <nav aria-label="Jump to artifact" className="container-site relative z-20 pb-10">
              <ol className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-2">
                {items.map((item, i) => (
                  <li key={item.id} className="shrink-0">
                    <button
                      onClick={() => goTo(i)}
                      aria-current={i === sel}
                      aria-label={`Show ${item.name}`}
                      className={cn('block h-14 w-11 overflow-hidden border transition-all duration-300', i === sel ? 'w-16 border-gold-light' : 'border-ivory/15 opacity-50 hover:opacity-100')}
                    >
                      <img src={item.image?.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
          </>
        )}
      </section>

      {/* Plain index — a fast, accessible route to every artifact in this view */}
      {count > 0 && (
        <section aria-labelledby="index-heading" className="relative z-10 border-t border-gold/20 bg-walnut-dark/60 py-12 backdrop-blur">
          <div className="container-site">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <h2 id="index-heading" className="font-serif text-2xl text-ivory">Index of this view <span className="text-base text-ivory/60">· {count} artifacts</span></h2>
              <Link to={`/shop${filterQuery ? `?${filterQuery}` : ''}`} className="text-xs uppercase tracking-[0.16em] text-gold-light hover:text-ivory">Open as compact list →</Link>
            </div>
            <ol className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item, i) => (
                <li key={item.id} className="border-b border-ivory/10">
                  <Link to={`/artifact/${item.slug}`} state={fromState} className="group flex items-baseline gap-3 py-3">
                    <span className="w-10 font-mono text-[11px] text-gold-light/70">Nº {String(i + 1).padStart(2, '0')}</span>
                    <span className="flex-1 font-serif text-lg leading-tight text-ivory/90 group-hover:text-gold-light">{item.name}</span>
                    <span className="text-sm tabular-nums text-ivory/60">{formatINR(item.pricePaise)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </div>
  );
}
