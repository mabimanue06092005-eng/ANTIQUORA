import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Info, Maximize2, ShieldCheck, ShoppingBag, Truck, X } from 'lucide-react';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useSeo } from '../lib/seo';
import type { ProductCard as PC, ProductDetail } from '../lib/types';
import { useShop } from '../context/ShopContext';
import { WishlistButton } from '../components/product/ProductCard';
import { ErrorState, Img, PageLoader, QuantityStepper } from '../components/ui';
import { formatINR } from '../lib/format';
import NotFound from './NotFound';
import { HudFrame, useFinePointer } from '@/components/fx';
import { chamberFor } from '@/lib/chambers';
import { useFromState, type FromState } from '@/lib/navState';
import { cn } from '@/lib/utils';

function Gallery({ product }: { product: ProductDetail }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [loupeOn, setLoupeOn] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const loupeRef = useRef<HTMLDivElement>(null);
  const fine = useFinePointer();
  const images = product.images.length ? product.images : [{ id: 'ph', url: '', alt: product.name }];
  const img = images[active];

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false);
      if (e.key === 'ArrowRight') setActive((a) => (a + 1) % images.length);
      if (e.key === 'ArrowLeft') setActive((a) => (a - 1 + images.length) % images.length);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightbox, images.length]);

  // Museum loupe: a circular 2.6× magnifier that maps the cursor onto the object-cover image.
  const ZOOM = 2.6;
  const R = 95;
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    const loupe = loupeRef.current;
    const image = stage?.querySelector('img');
    if (!fine || !stage || !loupe || !image?.naturalWidth) return;
    const r = stage.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const scale = Math.max(r.width / image.naturalWidth, r.height / image.naturalHeight);
    const dw = image.naturalWidth * scale;
    const dh = image.naturalHeight * scale;
    const ox = (r.width - dw) / 2;
    const oy = (r.height - dh) / 2;
    loupe.style.transform = `translate(${x - R}px, ${y - R}px)`;
    loupe.style.backgroundImage = `url("${image.currentSrc || image.src}")`;
    loupe.style.backgroundSize = `${dw * ZOOM}px ${dh * ZOOM}px`;
    loupe.style.backgroundPosition = `${-((x - ox) * ZOOM - R)}px ${-((y - oy) * ZOOM - R)}px`;
  };

  return (
    <div className="flex min-w-0 flex-col-reverse gap-4 md:flex-row md:items-start">
      {images.length > 1 && (
        <ul className="flex gap-3 md:flex-col" aria-label="Product images">
          {images.map((im, i) => (
            <li key={im.id}>
              <button onClick={() => setActive(i)} aria-label={`Show image ${i + 1} of ${images.length}`} aria-current={i === active} className={`block h-20 w-16 overflow-hidden border-2 bg-walnut transition-all md:h-24 md:w-20 ${i === active ? 'border-gold-light' : 'border-transparent opacity-55 hover:opacity-100'}`}>
                <Img src={im.url} alt="" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div
        ref={stageRef}
        className={`group relative aspect-[4/5] min-w-0 flex-1 overflow-hidden bg-walnut shadow-[0_50px_100px_-40px_rgba(0,0,0,0.9)] ring-1 ring-gold/30 ${fine ? 'cursor-none' : 'cursor-zoom-in'}`}
        onPointerMove={onMove}
        onPointerEnter={() => setLoupeOn(true)}
        onPointerLeave={() => setLoupeOn(false)}
        onClick={() => setLightbox(true)}
      >
        <AnimatePresence mode="wait">
          <motion.div key={img.url} initial={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0">
            <Img
              src={img.url}
              alt={img.alt}
              loading="eager"
              className="h-full w-full object-cover"
            />
          </motion.div>
        </AnimatePresence>
        <HudFrame key={img.url} label={product.sku} />
        {fine && (
          <div
            ref={loupeRef}
            aria-hidden
            className={`pointer-events-none absolute left-0 top-0 z-20 h-[190px] w-[190px] rounded-full border-2 border-gold-light bg-parchment bg-no-repeat shadow-[0_0_0_6px_rgba(36,25,18,0.25),0_20px_40px_-10px_rgba(0,0,0,0.5)] transition-opacity duration-200 ${loupeOn ? 'opacity-100' : 'opacity-0'}`}
          >
            <span className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-gold-light/80" />
            <span className="absolute left-1/2 top-1/2 h-px w-3 -translate-x-1/2 -translate-y-1/2 bg-gold-light/80" />
          </div>
        )}
        {fine && (
          <span className="pointer-events-none absolute bottom-4 left-4 z-10 bg-walnut-dark/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold-light backdrop-blur transition-opacity group-hover:opacity-0" aria-hidden>
            Hover to inspect · click to enlarge
          </span>
        )}
        <button onClick={(e) => { e.stopPropagation(); setLightbox(true); }} className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center bg-ivory/90 text-walnut shadow-sm hover:text-gold-dark" aria-label="Enlarge image">
          <Maximize2 className="h-4 w-4" />
        </button>
        {images.length > 1 && (
          <div className="absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between md:hidden">
            <button onClick={(e) => { e.stopPropagation(); setActive((a) => (a - 1 + images.length) % images.length); }} className="flex h-10 w-10 items-center justify-center bg-ivory/80" aria-label="Previous image"><ChevronLeft className="h-5 w-5" /></button>
            <button onClick={(e) => { e.stopPropagation(); setActive((a) => (a + 1) % images.length); }} className="flex h-10 w-10 items-center justify-center bg-ivory/80" aria-label="Next image"><ChevronRight className="h-5 w-5" /></button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div role="dialog" aria-modal="true" aria-label="Enlarged image" className="fixed inset-0 z-[95] flex items-center justify-center bg-walnut-dark/95 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLightbox(false)}>
            <button className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center text-ivory hover:text-gold-light" aria-label="Close enlarged image" autoFocus>
              <X className="h-7 w-7" />
            </button>
            {images.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); setActive((a) => (a - 1 + images.length) % images.length); }} className="absolute left-2 flex h-12 w-12 items-center justify-center text-ivory hover:text-gold-light md:left-6" aria-label="Previous image"><ChevronLeft className="h-8 w-8" /></button>
                <button onClick={(e) => { e.stopPropagation(); setActive((a) => (a + 1) % images.length); }} className="absolute right-2 flex h-12 w-12 items-center justify-center text-ivory hover:text-gold-light md:right-6" aria-label="Next image"><ChevronRight className="h-8 w-8" /></button>
              </>
            )}
            <img src={img.url || '/images/placeholder-artifact.svg'} alt={img.alt} className="max-h-[88vh] max-w-full object-contain shadow-frame" onClick={(e) => e.stopPropagation()} />
            <p className="absolute bottom-4 text-xs uppercase tracking-wider text-ivory/60">{active + 1} / {images.length}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const DOSSIER = ['Description', 'Details', 'Condition', 'Provenance', 'Shipping & returns'] as const;

function Dossier({ p }: { p: ProductDetail }) {
  const { store } = useShop();
  const [tab, setTab] = useState<(typeof DOSSIER)[number]>('Description');
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = e.key === 'ArrowRight' ? (i + 1) % DOSSIER.length : e.key === 'ArrowLeft' ? (i - 1 + DOSSIER.length) % DOSSIER.length : -1;
    if (n < 0) return;
    e.preventDefault();
    setTab(DOSSIER[n]);
    refs.current[n]?.focus();
  };
  const details: [string, string | null][] = [
    ['Period', p.period],
    ['Origin', p.origin],
    ['Materials', p.materials],
    ['Dimensions', p.dimensions],
    ['SKU', p.sku],
  ];
  return (
    <section aria-label="Object dossier" className="archival-lines relative bg-parchment py-16 md:py-20">
      <div className="container-site grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-burgundy">The dossier</p>
          <h2 className="mt-2 font-serif text-4xl leading-tight text-walnut">Everything we know — and what we don’t.</h2>
        </div>
        <div>
          <div role="tablist" aria-label="Dossier sections" className="-mx-4 flex gap-1 overflow-x-auto border-b border-walnut/15 px-4">
            {DOSSIER.map((t, i) => (
              <button
                key={t}
                ref={(el) => (refs.current[i] = el)}
                role="tab"
                id={`tab-${i}`}
                aria-selected={tab === t}
                aria-controls={`panel-${i}`}
                tabIndex={tab === t ? 0 : -1}
                onClick={() => setTab(t)}
                onKeyDown={(e) => onKey(e, i)}
                className={cn('relative min-h-[48px] shrink-0 px-4 text-[12px] uppercase tracking-[0.14em] transition-colors', tab === t ? 'text-walnut' : 'text-ink-muted hover:text-walnut')}
              >
                {t}
                {tab === t && <motion.span layoutId="dossier-tab" className="absolute inset-x-2 -bottom-px h-0.5 bg-burgundy" />}
              </button>
            ))}
          </div>
          {DOSSIER.map((t, i) =>
            tab === t ? (
              <div key={t} role="tabpanel" id={`panel-${i}`} aria-labelledby={`tab-${i}`} tabIndex={0} className="glass mt-6 p-6 text-[15px] leading-relaxed text-ink-soft md:p-8">
                {t === 'Description' && p.description.split('\n').filter(Boolean).map((para, k) => <p key={k} className="mb-3 last:mb-0">{para}</p>)}
                {t === 'Details' && (
                  <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                    {details.filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="border-b border-walnut/10 pb-3">
                        <dt className="text-[11px] uppercase tracking-[0.16em] text-ink-muted">{k}</dt>
                        <dd className="mt-1 font-serif text-lg text-walnut">{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {t === 'Condition' && (
                  <>
                    <p>{p.condition ?? 'Condition report available on request.'}</p>
                    {p.provenanceType === 'ILLUSTRATIVE' && <p className="mt-3 text-sm text-ink-muted">This condition note is illustrative demo content.</p>}
                  </>
                )}
                {t === 'Provenance' &&
                  (p.provenanceType === 'DOCUMENTED' ? (
                    <p>{p.provenance ?? 'Provenance documentation is held by the seller and available on request.'}</p>
                  ) : (
                    <>
                      <p className="mb-3 inline-flex border border-dashed border-gold-dark/60 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-gold-dark">No documented provenance · illustrative note</p>
                      <p>{p.provenance ?? 'No provenance information is recorded for this listing.'}</p>
                      <p className="mt-3 text-sm text-ink-muted">ANTIQUORA does not issue certificates of authenticity, appraisals or export permissions for demo listings. Antiquities may be subject to export and import restrictions; buyers are responsible for compliance with applicable law.</p>
                    </>
                  ))}
                {t === 'Shipping & returns' && (
                  <>
                    <p>
                      Standard insured shipping {store ? formatINR(store.shipping.standardPaise) : '₹499'} ({store?.shipping.standardDays ?? '5–8 business days'}), complimentary above {store ? formatINR(store.shipping.freeShippingThresholdPaise) : '₹25,000'}. Express {store ? formatINR(store.shipping.expressPaise) : '₹1,299'} ({store?.shipping.expressDays ?? '2–4 business days'}). Packed in archival materials; furniture is crated.
                    </p>
                    <p className="mt-3">Eligible items may be returned within 7 days of delivery in their original condition. <Link to="/shipping-returns" className="underline hover:text-walnut">Read the full policy</Link>.</p>
                  </>
                )}
              </div>
            ) : null,
          )}
          <aside className="mt-6 border border-walnut/15 bg-ivory/60 p-5 text-sm" aria-label="About this listing's information">
            <p className="flex items-center gap-2 font-medium text-walnut"><Info className="h-4 w-4 text-gold-dark" aria-hidden /> What is verified, and what is illustrative</p>
            <ul className="mt-3 space-y-2 text-ink-soft">
              <li><strong className="font-medium text-walnut">Reference record:</strong> period, origin and materials describe the photographed reference object as catalogued by its holding museum.</li>
              <li><strong className="font-medium text-walnut">Illustrative:</strong> price, availability, dimensions marked “approx.”, provenance and condition notes are demo marketplace data.</li>
            </ul>
            {p.imageCredit && <p className="mt-3 break-words text-xs text-ink-muted">{p.imageCredit.replace(/(https?:\/\/\S+)/, '')} <a href={p.imageCredit.match(/https?:\/\/\S+/)?.[0]} target="_blank" rel="noopener noreferrer" className="underline hover:text-walnut">View museum record</a></p>}
          </aside>
        </div>
      </div>
    </section>
  );
}

/** A horizontal strip of arch-framed artifacts (related / recently viewed). */
function ArtifactStrip({ title, eyebrow, items, dark = false }: { title: string; eyebrow: string; items: PC[]; dark?: boolean }) {
  const from = useFromState();
  if (!items.length) return null;
  return (
    <section aria-label={title} className={cn('py-16', dark ? 'bg-walnut-dark text-ivory' : 'bg-ivory')}>
      <div className="container-site">
        <p className={cn('font-mono text-[11px] uppercase tracking-[0.24em]', dark ? 'text-gold-light' : 'text-burgundy')}>{eyebrow}</p>
        <h2 className={cn('mt-2 font-serif text-3xl md:text-4xl', dark ? 'text-ivory' : 'text-walnut')}>{title}</h2>
        <ul className="-mx-4 mt-8 flex snap-x gap-6 overflow-x-auto px-4 pb-4">
          {items.map((r) => (
            <li key={r.id} className="w-[56vw] shrink-0 snap-start sm:w-[30vw] lg:w-[220px]">
              <Link to={`/artifact/${r.slug}`} state={from} className="group block">
                <div className="aspect-[3/4] overflow-hidden rounded-t-[999px] border border-gold/40 bg-walnut">
                  <Img src={r.image?.url} alt={r.image?.alt ?? r.name} className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                </div>
                <p className={cn('mt-3 font-mono text-[10px] uppercase tracking-[0.18em]', dark ? 'text-gold-light' : 'text-ink-muted')}>{r.category.name}</p>
                <p className={cn('font-serif text-lg leading-tight group-hover:text-gold-dark', dark ? 'text-ivory' : 'text-walnut')}>{r.name}</p>
                <p className={cn('text-sm', dark ? 'text-ivory/75' : 'text-ink-soft')}>{formatINR(r.pricePaise)}{r.stock <= 0 ? ' · sold out' : ''}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function RecentlyViewed({ exclude }: { exclude: string }) {
  const { recentlyViewed } = useShop();
  const ids = recentlyViewed.filter((id) => id !== exclude).slice(0, 8);
  const key = ids.join(',');
  const { data } = useAsync(() => (key ? api.get<PC[]>(`/api/products/by-ids?ids=${key}`) : Promise.resolve([])), [key]);
  return <ArtifactStrip eyebrow="Your journey" title="Recently Viewed" items={data ?? []} />;
}

function StockLine({ p }: { p: ProductDetail }) {
  const tone = p.stock <= 0 ? 'bg-red-300' : p.stock <= 2 ? 'bg-gold-light' : 'bg-emerald-300';
  const text = p.stock <= 0 ? 'Sold out' : p.stock === 1 ? 'One of a kind — 1 available' : p.stock <= 2 ? `Only ${p.stock} available` : `In stock · ${p.stock} available`;
  return (
    <p className="flex items-center gap-2 text-sm text-ivory/85">
      <span className={cn('h-2 w-2 rounded-full', tone)} aria-hidden /> {text}
    </p>
  );
}

export default function Product() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart, trackViewed, store } = useShop();
  const { data, error, loading, reload } = useAsync(() => api.get<{ product: ProductDetail; related: PC[] }>(`/api/products/${slug}`), [slug]);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState<'add' | 'buy' | null>(null);
  const p = data?.product;
  const cameFrom = (location.state as FromState | null) ?? null;

  useEffect(() => {
    setQty(1);
  }, [slug]);
  useEffect(() => {
    if (p) trackViewed(p.id);
  }, [p, trackViewed]);

  const jsonLd = useMemo(
    () =>
      p && {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.name,
        sku: p.sku,
        description: p.shortDescription,
        image: p.images.map((i) => new URL(i.url, window.location.origin).href),
        category: p.category.name,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'INR',
          price: (p.pricePaise / 100).toFixed(2),
          availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
          url: window.location.href,
        },
      },
    [p],
  );
  useSeo({ title: p?.name ?? 'Artifact', description: p?.shortDescription, image: p?.images[0]?.url, type: 'product', jsonLd });

  if (loading) return <PageLoader />;
  if (error?.status === 404) return <NotFound message="This artifact could not be found or is no longer listed." />;
  if (error || !p) return <div className="container-site py-20"><ErrorState message={error?.message ?? 'Could not load this artifact.'} onRetry={reload} /></div>;

  const soldOut = p.stock <= 0;
  const max = Math.min(p.stock, 10);
  const chamber = chamberFor(p.category.slug);
  const back = cameFrom ?? { from: `/chambers/${p.category.slug}`, label: chamber.title };
  const add = async (buyNow: boolean) => {
    setBusy(buyNow ? 'buy' : 'add');
    const ok = await addToCart(p, qty, { openDrawer: !buyNow });
    setBusy(null);
    if (ok && buyNow) navigate('/checkout');
  };

  return (
    <>
      <article className="relative isolate overflow-hidden bg-walnut-dark text-ivory">
        {/* Ambient light taken from the artifact itself */}
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <img src={p.images[0]?.url} alt="" className="h-full w-full scale-125 object-cover opacity-30 blur-3xl saturate-150" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_30%,rgba(15,61,46,0.55),rgba(20,16,12,0.92)_70%)]" />
          <p className="text-outline-gold absolute -bottom-10 right-0 select-none font-serif text-[22vw] leading-none">{chamber.numeral}</p>
        </div>

        <div className="container-site pt-6 md:pt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link to={back.from} className="glass-dark inline-flex h-11 items-center gap-2 px-4 text-[12px] uppercase tracking-[0.14em] hover:border-gold-light">
              <ArrowLeft className="h-4 w-4" /> Back to {back.label}
            </Link>
            <nav aria-label="Breadcrumb" className="text-xs text-ivory/60">
              <Link to="/" className="hover:text-ivory">Museum</Link> <span aria-hidden>›</span>{' '}
              <Link to={`/chambers/${p.category.slug}`} className="hover:text-ivory">{chamber.title}</Link> <span aria-hidden>›</span>{' '}
              <span aria-current="page" className="text-ivory/85">{p.name}</span>
            </nav>
          </div>
        </div>

        <div className="container-site grid gap-8 pb-14 pt-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start lg:gap-14 lg:pb-20">
          <Gallery product={p} />

          {/* Layered glass information panel */}
          <div className="glass-dark relative min-w-0 p-6 md:p-8 lg:sticky lg:top-28">
            <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gold-light to-transparent" aria-hidden />
            <Link to={`/chambers/${p.category.slug}`} className="font-mono text-[11px] uppercase tracking-[0.22em] text-gold-light hover:text-ivory">
              Chamber {chamber.numeral} · {p.category.name}
            </Link>
            <h1 className="mt-3 font-serif text-4xl leading-[1.02] text-ivory md:text-5xl">{p.name}</h1>
            <p className="mt-3 text-sm text-ivory/70">
              SKU <span className="tabular-nums text-ivory/90">{p.sku}</span>
              {p.period && <> · {p.period}</>}
              {p.origin && <> · {p.origin}</>}
            </p>

            <div className="mt-6 flex flex-wrap items-baseline gap-3">
              <span className="font-serif text-4xl text-gold-light">{formatINR(p.pricePaise)}</span>
              {p.compareAtPaise && <><span className="sr-only">reduced from</span><s className="text-lg text-ivory/50">{formatINR(p.compareAtPaise)}</s></>}
              {p.discountPercent > 0 && <span className="bg-burgundy px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-ivory">Save {p.discountPercent}%</span>}
            </div>
            <p className="mt-1 text-xs text-ivory/60">Price in INR, inclusive of applicable taxes.</p>
            <div className="mt-3"><StockLine p={p} /></div>

            <p className="mt-5 text-[16px] leading-relaxed text-ivory/85">{p.shortDescription}</p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              {!soldOut && (
                <div className="[&>div]:border-ivory/25 [&>div]:bg-ivory/10 [&_button]:text-ivory [&_span]:text-ivory">
                  <QuantityStepper value={qty} max={max} onChange={setQty} />
                </div>
              )}
              <button onClick={() => add(false)} disabled={soldOut || !!busy} className="btn-gold min-w-[170px] flex-1">
                <ShoppingBag className="h-4 w-4" /> {soldOut ? 'Sold out' : busy === 'add' ? 'Adding…' : 'Add to bag'}
              </button>
              <WishlistButton product={p} className="h-11 w-11 border border-ivory/30 !bg-transparent !text-ivory hover:!text-gold-light" />
            </div>
            {!soldOut && (
              <button onClick={() => add(true)} disabled={!!busy} className="btn-outline-light mt-3 w-full">
                {busy === 'buy' ? 'One moment…' : 'Buy now'}
              </button>
            )}
            {soldOut && <p className="mt-3 text-sm text-ivory/70">This object has found a home. Save it to your wishlist to hear about similar pieces.</p>}

            {/* Specimen card */}
            <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden border border-gold/25 bg-gold/20 text-sm">
              {([
                ['Materials', p.materials],
                ['Dimensions', p.dimensions],
                ['Condition', p.condition?.replace(/^Illustrative condition report:\s*/i, '')],
                ['Provenance', p.provenanceType === 'DOCUMENTED' ? 'Documented — see dossier' : 'Not documented (illustrative note)'],
              ] as [string, string | null | undefined][]).map(([k, v]) => (
                <div key={k} className="bg-walnut-dark/70 p-3">
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-gold-light">{k}</dt>
                  <dd className="mt-1 line-clamp-3 text-ivory/85">{v ?? '—'}</dd>
                </div>
              ))}
            </dl>

            <ul className="mt-6 grid gap-2 text-sm text-ivory/80 sm:grid-cols-2">
              <li className="flex items-start gap-2"><Truck className="mt-0.5 h-4 w-4 shrink-0 text-gold-light" aria-hidden /> Insured delivery · {store?.shipping.standardDays ?? '5–8 business days'}</li>
              <li className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-light" aria-hidden /> Totals verified server-side</li>
            </ul>
          </div>
        </div>
      </article>

      <Dossier p={p} />
      <ArtifactStrip eyebrow={`More from ${chamber.title}`} title="Related Artifacts" items={data.related} dark />
      <RecentlyViewed exclude={p.id} />
    </>
  );
}
