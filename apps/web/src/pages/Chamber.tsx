import { useRef } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, GalleryHorizontalEnd } from 'lucide-react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { useSeo } from '@/lib/seo';
import type { Category, ProductCard as PC } from '@/lib/types';
import { chamberFor, hash01, type ChamberTheme, type FrameShape } from '@/lib/chambers';
import { labelForPath } from '@/lib/navState';
import { ErrorState, Spinner, formatINR } from '@/components/ui';
import { cn } from '@/lib/utils';
import { ChamberNavigator } from '@/components/museum/ChamberNavigator';

/** Frame geometry per chamber — the "furniture" each room displays its objects in. */
const FRAME: Record<FrameShape, { box: string; img: string; deco?: string }> = {
  medallion: { box: 'aspect-square rounded-full p-2 bg-gradient-to-br from-gold-light via-gold-dark to-gold shadow-[0_0_60px_-10px_rgba(210,183,131,0.45)]', img: 'rounded-full' },
  plinth: { box: 'aspect-[3/4] rounded-t-[999px] p-0 shadow-[0_50px_80px_-30px_rgba(0,0,0,0.9)]', img: 'rounded-t-[999px]', deco: 'plinth' },
  panel: { box: 'aspect-[4/5] p-3 bg-gradient-to-b from-[#6b4a32] to-[#3a271b] shadow-[inset_0_0_0_1px_rgba(210,183,131,0.5),0_40px_70px_-30px_rgba(0,0,0,0.9)]', img: 'shadow-[inset_0_0_0_1px_rgba(0,0,0,0.4)]' },
  niche: { box: 'aspect-[3/4] rounded-t-[999px] p-2.5 bg-gradient-to-b from-burgundy-light to-burgundy-dark shadow-[inset_0_0_0_1px_rgba(210,183,131,0.45),0_40px_70px_-30px_rgba(0,0,0,0.9)]', img: 'rounded-t-[999px]' },
  folio: { box: 'aspect-[4/5] p-4 bg-[#fffaf0] shadow-[0_1px_0_rgba(0,0,0,0.05),0_30px_60px_-28px_rgba(59,42,32,0.55)] rotate-[var(--tilt)]', img: '' },
  cabinet: { box: 'aspect-square p-2 bg-gradient-to-br from-gold-light/90 to-gold-dark shadow-[0_30px_60px_-24px_rgba(0,0,0,0.8)]', img: '' },
};

function Exhibit({ p, theme, index, fromState }: { p: PC; theme: ChamberTheme; index: number; fromState: { from: string; label: string } }) {
  const h = hash01(p.id);
  const f = FRAME[theme.frame];
  const dark = theme.tone === 'dark';
  // Varied sizes and heights compose the wall like a hang, not a grid.
  const width = Math.round(220 + h * 120);
  const offset = Math.round((hash01(p.slug) - 0.5) * 90);
  return (
    <li className="shrink-0 snap-center" style={{ width, transform: `translateY(${offset}px)` }}>
      <Link to={`/artifact/${p.slug}`} state={fromState} draggable={false} className="group block focus-visible:outline-none" aria-label={`${p.name}, ${formatINR(p.pricePaise)}`}>
        <div className={cn('relative overflow-hidden transition-transform duration-500 group-hover:-translate-y-2 group-focus-visible:-translate-y-2 group-focus-visible:ring-2 group-focus-visible:ring-gold-light', f.box)} style={{ ['--tilt' as string]: `${(h - 0.5) * 4}deg` }}>
          <img
            src={p.image?.url ?? '/images/placeholder-artifact.svg'}
            alt={p.image?.alt ?? p.name}
            loading={index < 4 ? 'eager' : 'lazy'}
            draggable={false}
            onError={(e) => ((e.target as HTMLImageElement).src = '/images/placeholder-artifact.svg')}
            className={cn('h-full w-full object-cover transition-transform duration-700 group-hover:scale-105', f.img)}
          />
          {p.stockStatus === 'out_of_stock' && <span className="absolute left-1/2 top-4 -translate-x-1/2 bg-walnut-dark/85 px-2 py-0.5 text-[10px] uppercase tracking-wider text-ivory">Sold out</span>}
        </div>
        {f.deco === 'plinth' && <div className="mx-auto h-5 w-[86%] bg-gradient-to-b from-[#d9cfc0] to-[#8f8473] shadow-[0_20px_30px_-10px_rgba(0,0,0,0.8)]" aria-hidden />}
        <div className={cn('mx-auto mt-4 max-w-[94%] px-4 py-3 text-center transition-colors', theme.glass, dark ? 'group-hover:border-gold-light' : 'group-hover:border-gold')}>
          <p className={cn('font-mono text-[10px] uppercase tracking-[0.2em]', dark ? 'text-gold-light' : 'text-burgundy')}>Nº {String(index + 1).padStart(2, '0')} · {p.period ?? p.category.name}</p>
          <p className={cn('mt-1 font-serif text-lg leading-tight', dark ? 'text-ivory' : 'text-walnut')}>{p.name}</p>
          <p className={cn('mt-1 text-sm', dark ? 'text-ivory/80' : 'text-ink-soft')}>
            {formatINR(p.pricePaise)}
            {p.stockStatus === 'low_stock' && <span className={dark ? 'text-gold-light' : 'text-burgundy'}> · {p.stock === 1 ? 'one of a kind' : `${p.stock} left`}</span>}
          </p>
        </div>
      </Link>
    </li>
  );
}

function Wall({ products, theme, fromState }: { products: PC[]; theme: ChamberTheme; fromState: { from: string; label: string } }) {
  const ref = useRef<HTMLUListElement>(null);
  const drag = useRef<{ x: number; left: number; moved: number } | null>(null);
  const reduce = useReducedMotion();
  const scrollByCards = (dir: number) => ref.current?.scrollBy({ left: dir * Math.min(ref.current.clientWidth * 0.7, 640), behavior: reduce ? 'auto' : 'smooth' });
  const dark = theme.tone === 'dark';
  return (
    <div className="relative">
      <ul
        ref={ref}
        tabIndex={0}
        aria-label="Exhibits in this chamber — scroll horizontally"
        className="flex snap-x snap-mandatory items-center gap-10 overflow-x-auto px-[8vw] pb-16 pt-24 outline-none [scrollbar-width:thin] focus-visible:ring-1 focus-visible:ring-gold-light/60 md:gap-16"
        // Mouse drag-to-pan (touch uses native scrolling). A real drag suppresses the click.
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse' || e.button !== 0) return;
          drag.current = { x: e.clientX, left: ref.current!.scrollLeft, moved: 0 };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dx = e.clientX - d.x;
          d.moved = Math.max(d.moved, Math.abs(dx));
          if (d.moved > 6) {
            ref.current!.style.scrollSnapType = 'none';
            ref.current!.scrollLeft = d.left - dx;
          }
        }}
        onPointerUp={() => {
          if (ref.current) ref.current.style.scrollSnapType = '';
          setTimeout(() => (drag.current = null), 0);
        }}
        onPointerLeave={() => {
          if (ref.current) ref.current.style.scrollSnapType = '';
          drag.current = null;
        }}
        onClickCapture={(e) => {
          if (drag.current && drag.current.moved > 6) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {products.map((p, i) => <Exhibit key={p.id} p={p} theme={theme} index={i} fromState={fromState} />)}
      </ul>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[8vw] bg-gradient-to-r from-black/30 to-transparent" aria-hidden />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[8vw] bg-gradient-to-l from-black/30 to-transparent" aria-hidden />
      <div className="container-site flex justify-end gap-2">
        <button onClick={() => scrollByCards(-1)} className={cn('flex h-12 w-12 items-center justify-center', theme.glass, dark ? 'text-ivory' : 'text-walnut')} aria-label="Scroll exhibits left"><ChevronLeft className="h-5 w-5" /></button>
        <button onClick={() => scrollByCards(1)} className={cn('flex h-12 w-12 items-center justify-center', theme.glass, dark ? 'text-ivory' : 'text-walnut')} aria-label="Scroll exhibits right"><ChevronRight className="h-5 w-5" /></button>
      </div>
    </div>
  );
}

export default function Chamber() {
  const { slug } = useParams();
  const location = useLocation();
  const reduce = useReducedMotion();
  const { data: categories } = useAsync(() => api.get<Category[]>('/api/categories'), []);
  const { data: products, error, loading, reload } = useAsync(
    () => (slug ? api.get<PC[]>(`/api/products?category=${encodeURIComponent(slug)}&pageSize=48&sort=featured`) : Promise.resolve([])),
    [slug],
  );
  const theme = chamberFor(slug);
  const category = categories?.find((c) => c.slug === slug);
  useSeo({ title: theme.title, description: `${theme.title} — ${theme.tagline}` });

  if (!slug) return categories?.[0] ? <Navigate to={`/chambers/${categories[0].slug}`} replace /> : <div className="flex min-h-[60vh] items-center justify-center"><Spinner /></div>;
  if (categories && !category) return <Navigate to="/gallery" replace />;

  const dark = theme.tone === 'dark';
  const idx = categories?.findIndex((c) => c.slug === slug) ?? -1;
  const prev = categories && idx >= 0 ? categories[(idx - 1 + categories.length) % categories.length] : null;
  const next = categories && idx >= 0 ? categories[(idx + 1) % categories.length] : null;
  const fromState = { from: location.pathname, label: labelForPath(location.pathname) };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={slug}
        initial={reduce ? false : { opacity: 0, y: 24, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={reduce ? undefined : { opacity: 0, y: -12 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className={cn('relative overflow-hidden', theme.bg, dark ? 'text-ivory' : 'text-walnut')}
      >
        {/* Room atmosphere: ceiling light, archival lines, oversized numeral */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_55%_at_50%_0%,rgba(255,236,200,0.16),transparent)]" />
          <div className="archival-lines absolute inset-0 opacity-60" />
          <p className={cn('absolute -right-6 top-6 select-none font-serif text-[38vw] leading-none md:text-[24vw]', dark ? 'text-outline-gold' : 'text-walnut/[0.05]')}>{theme.numeral}</p>
        </div>

        <header className="container-site relative pt-10 md:pt-14">
          <nav aria-label="Breadcrumb" className={cn('mb-6 text-xs', dark ? 'text-ivory/60' : 'text-ink-muted')}>
            <Link to="/" className="hover:underline">Museum</Link> <span aria-hidden>›</span> <Link to="/gallery" className="hover:underline">Chambers</Link> <span aria-hidden>›</span> <span aria-current="page">{theme.title}</span>
          </nav>
          <div className="grid items-end gap-8 md:grid-cols-[1.4fr_1fr]">
            <div>
              <p className={cn('font-mono text-[11px] uppercase tracking-[0.24em]', theme.accent)}>Chamber {theme.numeral} · {category?.name}</p>
              <h1 className={cn('mt-3 font-serif text-5xl leading-[0.95] md:text-7xl', dark ? 'text-ivory' : 'text-walnut')}>{theme.title}</h1>
              <p className={cn('mt-4 max-w-xl text-lg', dark ? 'text-ivory/80' : 'text-ink-soft')}>{theme.tagline}</p>
            </div>
            <div className={cn('p-5 md:justify-self-end', theme.glass)}>
              <p className={cn('text-sm', dark ? 'text-ivory/80' : 'text-ink-soft')}>{category?.description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className={cn('font-serif text-3xl', theme.accent)}>{category?.productCount ?? '—'}</span>
                <span className={cn('text-xs uppercase tracking-[0.16em]', dark ? 'text-ivory/70' : 'text-ink-muted')}>objects on display</span>
                <Link to={`/gallery?category=${slug}`} className={cn('ml-auto inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em]', theme.accent)}>
                  <GalleryHorizontalEnd className="h-4 w-4" /> View in gallery
                </Link>
              </div>
            </div>
          </div>
        </header>

        <section aria-label={`${theme.title} exhibits`} className="relative">
          {loading ? (
            <div className="flex h-[50vh] items-center justify-center"><Spinner className="h-8 w-8" /></div>
          ) : error ? (
            <div className="container-site py-20"><ErrorState message={error.message} onRetry={reload} /></div>
          ) : products && products.length > 0 ? (
            <Wall products={products} theme={theme} fromState={fromState} />
          ) : (
            <p className="container-site py-24 text-center font-serif text-2xl">This chamber is being rehung — check back soon.</p>
          )}
        </section>

        <section aria-label="Move between chambers" className="relative mt-10 border-t border-gold/20 bg-walnut-dark/80 py-10 text-ivory backdrop-blur">
          <div className="container-site">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-serif text-2xl text-ivory">The Collection Navigator</h2>
              <div className="flex gap-2">
                {prev && <Link to={`/chambers/${prev.slug}`} className="glass-dark inline-flex h-11 items-center gap-2 px-4 text-xs uppercase tracking-[0.12em] hover:border-gold-light"><ChevronLeft className="h-4 w-4" /> {chamberFor(prev.slug).title}</Link>}
                {next && <Link to={`/chambers/${next.slug}`} className="glass-dark inline-flex h-11 items-center gap-2 px-4 text-xs uppercase tracking-[0.12em] hover:border-gold-light">{chamberFor(next.slug).title} <ArrowRight className="h-4 w-4" /></Link>}
              </div>
            </div>
            {categories && <ChamberNavigator categories={categories} current={slug} />}
          </div>
        </section>
      </motion.div>
    </AnimatePresence>
  );
}
