import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, BookOpenCheck, ChevronLeft, ChevronRight, Lock, Package, Pause, Play, RotateCcw, Truck } from 'lucide-react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import type { ProductCard as PC } from '@/lib/types';
import { Img, Reveal } from '@/components/ui';
import { NewsletterForm } from '@/components/NewsletterForm';
import { BeamBorder, HudFrame, SpotlightCard } from '@/components/fx';
import { useShop } from '@/context/ShopContext';
import { formatINR } from '@/lib/format';
import { eraYear, formatEra } from '@/lib/era';

const EASE = [0.22, 1, 0.36, 1] as const;

/* ───────────────────────── Travel through time ───────────────────────── */

export function TimeTravel() {
  const { data } = useAsync(() => api.get<PC[]>('/api/products?pageSize=48&sort=newest&inStock=true'), []);
  const reduce = useReducedMotion();
  const objects = useMemo(
    () =>
      (data ?? [])
        .map((p) => ({ p, year: eraYear(p.period) }))
        .filter((o): o is { p: PC; year: number } => o.year !== null)
        .sort((a, b) => a.year - b.year)
        // One object per distinct year keeps the dial readable.
        .filter((o, i, arr) => i === 0 || o.year !== arr[i - 1].year),
    [data],
  );
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing || objects.length === 0) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % objects.length), 2600);
    return () => clearInterval(t);
  }, [playing, objects.length]);

  if (objects.length < 3) return null;
  const { p, year } = objects[Math.min(index, objects.length - 1)];
  const step = (d: number) => {
    setPlaying(false);
    setIndex((i) => (i + d + objects.length) % objects.length);
  };
  const pct = (index / (objects.length - 1)) * 100;

  return (
    <section className="relative overflow-hidden bg-walnut-dark py-20 text-ivory md:py-28" aria-labelledby="time-heading">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_30%_40%,rgba(210,183,131,0.14),transparent_70%)]" aria-hidden />
      <div className="container-site relative">
        <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px w-10 bg-gold-light" aria-hidden />
              <p className="font-mono text-[11px] uppercase tracking-caps text-gold-light">Interactive timeline</p>
            </div>
            <h2 id="time-heading" className="text-4xl text-ivory md:text-5xl">Travel Through Time</h2>
            <p className="mt-3 max-w-lg text-ivory/70">Slide across twenty-five centuries of craft. Every stop is an object you can own today.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => step(-1)} className="flex h-11 w-11 items-center justify-center border border-ivory/25 text-ivory transition-colors hover:border-gold-light hover:text-gold-light" aria-label="Earlier object">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => setPlaying((v) => !v)} className="flex h-11 items-center gap-2 border border-ivory/25 px-4 text-[12px] uppercase tracking-[0.14em] text-ivory transition-colors hover:border-gold-light hover:text-gold-light" aria-pressed={playing}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {playing ? 'Pause' : 'Play'}
            </button>
            <button onClick={() => step(1)} className="flex h-11 w-11 items-center justify-center border border-ivory/25 text-ivory transition-colors hover:border-gold-light hover:text-gold-light" aria-label="Later object">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-16">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[420px]">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={p.id}
                initial={reduce ? false : { opacity: 0, scale: 1.04, filter: 'blur(6px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={reduce ? undefined : { opacity: 0, scale: 0.97, filter: 'blur(4px)' }}
                transition={{ duration: 0.6, ease: EASE }}
                className="absolute inset-0 overflow-hidden bg-walnut shadow-frame"
              >
                <Img src={p.image?.url} alt={p.image?.alt ?? p.name} className="h-full w-full object-cover" />
                <HudFrame label={`Obj · ${p.sku}`} />
              </motion.div>
            </AnimatePresence>
          </div>

          <div aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={p.id} initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -10 }} transition={{ duration: 0.4, ease: EASE }}>
                <p className="font-serif text-6xl leading-none text-gold-light md:text-8xl">{formatEra(year)}</p>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ivory/55">Approximate date · {p.period}</p>
                <h3 className="mt-6 text-3xl text-ivory md:text-4xl">{p.name}</h3>
                <p className="mt-2 text-sm text-ivory/65">{p.category.name}{p.origin ? ` · ${p.origin}` : ''}</p>
                <p className="mt-4 max-w-md leading-relaxed text-ivory/75">{p.shortDescription}</p>
                <div className="mt-6 flex flex-wrap items-center gap-5">
                  <span className="font-serif text-3xl text-ivory">{formatINR(p.pricePaise)}</span>
                  <Link to={`/artifact/${p.slug}`} className="btn-gold">
                    View artifact <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* The dial */}
        <div className="mt-14">
          <div className="relative h-14 outline-offset-8 focus-within:outline focus-within:outline-1 focus-within:outline-gold-light">
            <div className="absolute inset-x-0 top-1/2 h-px bg-ivory/20" aria-hidden />
            <motion.div className="absolute left-0 top-1/2 h-px bg-gradient-to-r from-gold-dark to-gold-light" style={{ width: `${pct}%` }} transition={{ duration: 0.4 }} aria-hidden />
            <ol className="absolute inset-0" aria-hidden>
              {objects.map((o, i) => (
                <li key={o.p.id} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${(i / (objects.length - 1)) * 100}%` }}>
                  <button
                    tabIndex={-1}
                    onClick={() => {
                      setPlaying(false);
                      setIndex(i);
                    }}
                    className={`block h-3 w-3 rounded-full border transition-all duration-300 ${i === index ? 'scale-150 border-gold-light bg-gold-light shadow-[0_0_14px_rgba(210,183,131,0.9)]' : i < index ? 'border-gold bg-gold/60' : 'border-ivory/40 bg-walnut-dark hover:border-gold-light'}`}
                    title={`${formatEra(o.year)} — ${o.p.name}`}
                  />
                </li>
              ))}
            </ol>
            <label htmlFor="era-dial" className="sr-only">Travel through time — choose an era</label>
            <input
              id="era-dial"
              type="range"
              min={0}
              max={objects.length - 1}
              step={1}
              value={index}
              onChange={(e) => {
                setPlaying(false);
                setIndex(Number(e.target.value));
              }}
              aria-valuetext={`${formatEra(year)}: ${p.name}`}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-ivory/50" aria-hidden>
            <span>{formatEra(objects[0].year)}</span>
            <span>{formatEra(objects[Math.floor(objects.length / 2)].year)}</span>
            <span>{formatEra(objects[objects.length - 1].year)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Trust ───────────────────────── */

export function Trust() {
  const { store } = useShop();
  const threshold = store ? formatINR(store.shipping.freeShippingThresholdPaise) : '₹25,000';
  const items = [
    { icon: Lock, title: 'Secure checkout', text: 'Encrypted sessions and server-verified totals. Card details never touch our servers.' },
    { icon: BookOpenCheck, title: 'Carefully described', text: 'Candid condition notes, with illustrative information clearly labelled as such.' },
    { icon: Package, title: 'Secure packaging', text: 'Archival tissue, custom crating for furniture and fragile ceramics.' },
    { icon: Truck, title: 'Transparent shipping', text: `Flat-rate insured shipping across India; complimentary standard delivery above ${threshold}.` },
    { icon: RotateCcw, title: 'Considered returns', text: '7-day returns on eligible items in original condition. See our policy for details.' },
  ];
  return (
    <section className="container-site py-20 md:py-24" aria-labelledby="trust-heading">
      <h2 id="trust-heading" className="sr-only">Our service promises</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {items.map(({ icon: I, title, text }, i) => (
          <li key={title}>
            <Reveal delay={i * 0.05} className="h-full">
              <SpotlightCard className="h-full border border-line bg-ivory p-7 transition-colors">
                <span className="relative flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 text-gold-dark transition-colors duration-500 group-hover/spot:border-gold group-hover/spot:bg-gold/10">
                  <I className="h-5 w-5" strokeWidth={1.4} aria-hidden />
                  <span className="absolute inset-0 rounded-full border border-gold/50 opacity-0 group-hover/spot:opacity-100 motion-safe:group-hover/spot:animate-ping" aria-hidden />
                </span>
                <h3 className="mt-5 font-serif text-xl">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{text}</p>
              </SpotlightCard>
            </Reveal>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-center text-xs text-ink-muted">
        ANTIQUORA does not claim third-party authentication or certified provenance for demo listings. <Link to="/shipping-returns" className="underline hover:text-walnut">Shipping & returns policy</Link>
      </p>
    </section>
  );
}

/* ───────────────────────── Newsletter ───────────────────────── */

export function Newsletter() {
  return (
    <section className="bg-parchment/60 py-16 md:py-20" aria-labelledby="nl-heading">
      <div className="container-site">
        <BeamBorder>
          <div className="grid items-center gap-10 bg-ivory/95 p-8 backdrop-blur md:grid-cols-2 md:p-14">
            <div>
              <p className="eyebrow mb-3">The ANTIQUORA letter</p>
              <h2 id="nl-heading" className="text-4xl md:text-5xl">First sight of new arrivals.</h2>
              <p className="mt-3 max-w-md text-ink-muted">Subscribers hear about newly catalogued objects before they are published, along with short essays on collecting.</p>
            </div>
            <NewsletterForm source="homepage" />
          </div>
        </BeamBorder>
      </div>
    </section>
  );
}

