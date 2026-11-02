import { useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, DoorOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { useSeo } from '@/lib/seo';
import type { Category, ProductCard as PC, ProductDetail } from '@/lib/types';
import { useFromState } from '@/lib/navState';
import { formatINR } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Img, Skeleton } from '@/components/ui';
import { Magnetic, ScrambleText, useFinePointer } from '@/components/fx';
import { ChamberNavigator } from '@/components/museum/ChamberNavigator';
import { Newsletter, TimeTravel, Trust } from './HomeSections';

const EASE = [0.22, 1, 0.36, 1] as const;
const PLATES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/* ═════════════ Ornaments ═════════════ */

function Flourish({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 24" className={cn('h-6 w-60', className)} aria-hidden>
      <path d="M0 12 H96 M144 12 H240" stroke="currentColor" strokeWidth="0.75" />
      <path d="M120 3 L129 12 L120 21 L111 12 Z" fill="none" stroke="currentColor" strokeWidth="0.75" />
      <circle cx="120" cy="12" r="2" fill="currentColor" />
      <path d="M96 12 C104 4,108 4,111 12 M144 12 C136 4,132 4,129 12" fill="none" stroke="currentColor" strokeWidth="0.75" />
    </svg>
  );
}

function Corner({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn('absolute h-10 w-10', className)} aria-hidden>
      <path d="M2 46 V10 Q2 2 10 2 H46" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M8 46 V14 Q8 8 14 8 H46" fill="none" stroke="currentColor" strokeWidth="0.5" />
      <circle cx="10" cy="10" r="1.6" fill="currentColor" />
    </svg>
  );
}

/* ═════════════ 1. Opening scene ═════════════ */

function OpeningScene() {
  const reduce = useReducedMotion();
  const fine = useFinePointer();
  const navigate = useNavigate();
  const [entering, setEntering] = useState<{ x: number; y: number } | null>(null);
  const px = useSpring(useMotionValue(0), { stiffness: 50, damping: 18 });
  const py = useSpring(useMotionValue(0), { stiffness: 50, damping: 18 });
  const sculptX = useTransform(px, (v) => v * -18);
  const sculptY = useTransform(py, (v) => v * -12);
  const textX = useTransform(px, (v) => v * 30);
  const lightX = useTransform(px, (v) => `${50 + v * 14}%`);
  const parallax = fine && !reduce;

  const enter = (e: React.MouseEvent) => {
    if (reduce) return navigate('/gallery');
    setEntering({ x: e.clientX || window.innerWidth / 2, y: e.clientY || window.innerHeight / 2 });
  };

  return (
    <section
      aria-labelledby="museum-title"
      className="relative isolate min-h-[calc(100svh-104px)] overflow-hidden bg-[radial-gradient(ellipse_90%_80%_at_60%_40%,#1A5A44_0%,#0F3D2E_30%,#14100c_75%)] text-ivory"
      onPointerMove={(e) => {
        if (!parallax) return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width - 0.5);
        py.set((e.clientY - r.top) / r.height - 0.5);
      }}
    >
      {/* Layer 0 — giant inscription behind the exhibit */}
      <motion.p style={parallax ? { x: textX } : undefined} className="text-outline-gold pointer-events-none absolute inset-x-0 top-[8%] select-none text-center font-serif text-[26vw] leading-none tracking-[0.06em]" aria-hidden>
        MVSEVM
      </motion.p>
      {/* Layer 1 — gallery spotlight from above */}
      <motion.div style={parallax ? { left: lightX } : { left: '50%' }} className="pointer-events-none absolute top-0 h-full w-[70vw] -translate-x-1/2 bg-[conic-gradient(from_180deg_at_50%_0%,transparent_160deg,rgba(255,232,190,0.16)_180deg,transparent_200deg)]" aria-hidden />

      {/* Layer 2 — the exhibit, dissolved into darkness */}
      <motion.div
        style={parallax ? { x: sculptX, y: sculptY } : undefined}
        initial={reduce ? false : { opacity: 0, scale: 1.08 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, ease: EASE }}
        className="pointer-events-none absolute bottom-0 right-[-18%] top-[4%] w-[min(100vw,820px)] opacity-60 sm:right-[-4%] sm:opacity-100 lg:right-[4%]"
      >
        <img
          src="/images/products/marble-herakles-head-1.jpg"
          alt="Marble head of Herakles, Roman, 1st–2nd century CE, emerging from shadow under a single spotlight"
          className="h-full w-full object-contain brightness-[0.92] contrast-[1.15] sepia-[0.18] [mask-image:radial-gradient(ellipse_48%_52%_at_50%_46%,black_58%,transparent_78%)]"
          {...{ fetchpriority: 'high' }}
        />
      </motion.div>

      {/* Layer 3 — drifting dust in the light */}
      <div className="pointer-events-none absolute inset-0 motion-reduce:hidden" aria-hidden>
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} className="absolute h-1 w-1 animate-float rounded-full bg-gold-light/50 blur-[1px]" style={{ left: `${45 + ((i * 37) % 40)}%`, top: `${10 + ((i * 53) % 75)}%`, animationDelay: `${i * 0.6}s`, animationDuration: `${6 + (i % 5)}s` }} />
        ))}
      </div>

      {/* Layer 4 — the welcome */}
      <div className="container-site relative z-10 flex min-h-[calc(100svh-104px)] flex-col justify-center py-16">
        <div className="max-w-xl">
          <ScrambleText text="Private collection · Open to visitors" className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold-light" />
          <motion.h1 id="museum-title" initial={reduce ? false : { opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, delay: 0.2, ease: EASE }} className="mt-5 font-serif text-[56px] font-normal leading-[0.92] text-ivory sm:text-7xl lg:text-[104px]">
            The <em className="bg-gradient-to-r from-gold-light via-[#F3E2B8] to-gold bg-[length:200%_auto] bg-clip-text italic text-transparent motion-safe:animate-[shimmer-text_6s_linear_infinite]">Living</em>
            <br />
            Museum
          </motion.h1>
          <Flourish className="mt-6 text-gold-light/80" />
          <motion.p initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.6 }} className="mt-4 max-w-md text-[17px] leading-relaxed text-ivory/85">
            Own a Piece of History. Wander a private museum of rare artifacts — every object on display can join your collection.
          </motion.p>
          <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.8, ease: EASE }} className="mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <Magnetic>
              <button onClick={enter} className="glass-dark group relative flex h-16 items-center gap-4 overflow-hidden pl-7 pr-3 text-[13px] uppercase tracking-[0.22em] text-ivory hover:border-gold-light">
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gold-light/25 to-transparent transition-transform duration-1000 group-hover:translate-x-full" aria-hidden />
                Enter the Collection
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold text-walnut-dark transition-transform duration-500 group-hover:rotate-[-45deg]">
                  <ArrowRight className="h-5 w-5" />
                </span>
              </button>
            </Magnetic>
            <Link to="/chambers" className="link-underline inline-flex items-center gap-2 text-[13px] uppercase tracking-[0.18em] text-gold-light">
              <DoorOpen className="h-4 w-4" /> Visit the chambers
            </Link>
          </motion.div>
        </div>

        <Link to="/artifact/marble-herakles-head" className="glass-dark absolute bottom-6 right-4 hidden max-w-xs px-4 py-3 text-left transition-colors hover:border-gold-light sm:block md:right-10">
          <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-gold-light">Exhibit Nº 01 · on display</span>
          <span className="mt-1 block font-serif text-lg italic text-ivory">Marble Head of Herakles</span>
          <span className="text-xs text-ivory/75">Roman · 1st–2nd century CE · view the object</span>
        </Link>
      </div>

      {/* Curtain transition into the gallery */}
      {entering && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-[radial-gradient(ellipse_at_center,#1A5A44_0%,#0F3D2E_45%,#14100c_100%)]"
          initial={{ clipPath: `circle(0px at ${entering.x}px ${entering.y}px)` }}
          animate={{ clipPath: `circle(150vmax at ${entering.x}px ${entering.y}px)` }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
          onAnimationComplete={() => navigate('/gallery')}
          aria-hidden
        >
          <motion.p initial={{ opacity: 0, letterSpacing: '0.1em' }} animate={{ opacity: 1, letterSpacing: '0.4em' }} transition={{ duration: 0.8 }} className="font-mono text-xs uppercase text-gold-light">
            Entering the gallery
          </motion.p>
        </motion.div>
      )}
    </section>
  );
}

/* ═════════════ 2. The Arrangement — featured artifacts as placed objects ═════════════ */

type Slot = { left: string; top: string; w: string; shape: 'circle' | 'arch' | 'rect'; tag: 'left' | 'right' };
// Plotted on the 1152 × 680 stage so no object and no label overlap another.
const SLOTS: Slot[] = [
  { left: '2%', top: '8%', w: '17%', shape: 'arch', tag: 'right' },
  { left: '44%', top: '0%', w: '12%', shape: 'circle', tag: 'right' },
  { left: '28%', top: '40%', w: '18%', shape: 'rect', tag: 'left' },
  { left: '84%', top: '24%', w: '13%', shape: 'circle', tag: 'left' },
  { left: '72%', top: '54%', w: '15%', shape: 'arch', tag: 'left' },
  { left: '4%', top: '80%', w: '11%', shape: 'circle', tag: 'right' },
];
const SHAPE = { circle: 'aspect-square rounded-full', arch: 'aspect-[3/4] rounded-t-[999px]', rect: 'aspect-[4/5]' };

function Arrangement({ items }: { items: PC[] | undefined }) {
  const from = useFromState();
  return (
    <section aria-labelledby="arrangement-heading" className="relative overflow-hidden bg-[linear-gradient(180deg,#14100c_0%,#241912_40%,#3B2A20_100%)] py-20 text-ivory md:py-28">
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle,rgba(210,183,131,1)_1px,transparent_1px)] [background-size:22px_22px]" aria-hidden />
      <div className="container-site relative">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-gold-light">Hall I · Tonight’s arrangement</p>
          <h2 id="arrangement-heading" className="mt-3 font-serif text-4xl text-ivory md:text-6xl">Objects in Conversation</h2>
          <Flourish className="mx-auto mt-4 text-gold-light/70" />
          <p className="mt-3 text-ivory/80">Our featured pieces, placed as a curator would hang them. Select any object to step closer.</p>
        </div>

        {!items ? (
          <Skeleton className="mt-14 h-[520px] !bg-ivory/5" />
        ) : (
          <>
            {/* Desktop: free composition */}
            <ul className="relative mx-auto mt-14 hidden h-[680px] max-w-6xl lg:block">
              <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" aria-hidden />
              {items.slice(0, SLOTS.length).map((p, i) => {
                const s = SLOTS[i];
                return (
                  <li key={p.id} className="absolute" style={{ left: s.left, top: s.top, width: s.w }}>
                    <Link to={`/artifact/${p.slug}`} state={from} className="group relative block focus-visible:outline-none" aria-label={`${p.name}, ${formatINR(p.pricePaise)}`}>
                      <div className="motion-safe:animate-float" style={{ animationDelay: `${i * 0.9}s`, animationDuration: `${7 + (i % 3)}s` } as CSSProperties}>
                        <div className={cn('overflow-hidden border border-gold/40 bg-walnut shadow-[0_40px_70px_-25px_rgba(0,0,0,0.9)] transition-all duration-700 group-hover:-translate-y-2 group-hover:border-gold-light group-hover:shadow-[0_0_60px_-10px_rgba(210,183,131,0.5)] group-focus-visible:ring-2 group-focus-visible:ring-gold-light', SHAPE[s.shape])}>
                          <Img src={p.image?.url} alt={p.image?.alt ?? p.name} className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                        </div>
                      </div>
                      {/* Glass tag on a leader line */}
                      <span className={cn('glass-dark absolute top-1/2 w-52 -translate-y-1/2 px-3 py-2.5 transition-all duration-500', s.tag === 'right' ? 'left-[calc(100%+28px)] group-hover:translate-x-1' : 'right-[calc(100%+28px)] text-right group-hover:-translate-x-1')}>
                        <span className={cn('absolute top-1/2 h-px w-6 bg-gold-light/70', s.tag === 'right' ? '-left-7' : '-right-7')} aria-hidden />
                        <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-gold-light">Nº {String(i + 1).padStart(2, '0')} · {p.category.name}</span>
                        <span className="mt-0.5 block font-serif text-base leading-tight text-ivory">{p.name}</span>
                        <span className="text-xs text-ivory/80">{formatINR(p.pricePaise)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {/* Mobile & tablet: staggered pairs */}
            <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:hidden">
              {items.slice(0, SLOTS.length).map((p, i) => (
                <li key={p.id} className={i % 2 ? 'mt-12' : ''}>
                  <Link to={`/artifact/${p.slug}`} state={from} className="group block">
                    <div className={cn('overflow-hidden border border-gold/40 bg-walnut', SHAPE[SLOTS[i].shape])}>
                      <Img src={p.image?.url} alt={p.image?.alt ?? p.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="glass-dark mt-3 px-3 py-2">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold-light">Nº {String(i + 1).padStart(2, '0')}</p>
                      <p className="font-serif text-base leading-tight text-ivory">{p.name}</p>
                      <p className="text-xs text-ivory/80">{formatINR(p.pricePaise)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="mt-10 text-center">
          <Link to="/gallery?featured=true" className="btn-outline-light">Walk the featured wing <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </section>
  );
}

/* ═════════════ 3. Curator's Living Canvas ═════════════ */

type Labelled = { name: string; pricePaise: number; period: string | null; category: { name: string } };

function PlateLabel({ p, n }: { p: Labelled; n: number }) {
  return (
    <>
      <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-burgundy">Plate {PLATES[n]} · {p.category.name}</span>
      <span className="mt-1 block font-serif text-xl leading-tight text-walnut">{p.name}</span>
      <span className="mt-0.5 block text-sm text-ink-soft">{p.period} · <span className="text-walnut">{formatINR(p.pricePaise)}</span></span>
    </>
  );
}

function LivingCanvas({ picks, featured }: { picks: ProductDetail[]; featured: PC[] }) {
  const from = useFromState();
  const [hero, second, third] = picks;
  const smalls = featured.filter((f) => !picks.some((p) => p.id === f.id)).slice(0, 3);
  if (!hero) return null;

  return (
    <section aria-labelledby="canvas-heading" className="archival-lines relative overflow-hidden bg-parchment py-20 md:py-28">
      <div className="pointer-events-none absolute -left-20 top-10 select-none font-serif text-[30vw] italic leading-none text-burgundy/[0.05]" aria-hidden>&amp;</div>
      <div className="container-site relative">
        <header className="mb-14 grid gap-6 md:grid-cols-[auto_1fr] md:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-burgundy">Folio III · Curated this season</p>
            <h2 id="canvas-heading" className="mt-2 font-serif text-5xl leading-[0.95] text-walnut md:text-7xl">
              The Curator’s <em className="text-burgundy">Living</em> Canvas
            </h2>
          </div>
          <p className="max-w-md text-ink-soft md:justify-self-end md:text-right">A composition of study pieces and their companions — arranged for looking, labelled for collecting.</p>
        </header>

        <div className="grid grid-cols-12 gap-4 md:gap-6">
          {/* Oversized plate */}
          <Link to={`/artifact/${hero.slug}`} state={from} className="group relative col-span-12 md:col-span-7 md:col-start-1 md:row-span-2 md:row-start-1">
            <div className="relative aspect-[4/5] overflow-hidden bg-walnut shadow-lift">
              <Img src={hero.images[0]?.url} alt={hero.images[0]?.alt ?? hero.name} className="h-full w-full object-cover transition-transform [transition-duration:1600ms] group-hover:scale-105" />
              <Corner className="left-3 top-3 text-gold-light" />
              <Corner className="right-3 top-3 rotate-90 text-gold-light" />
            </div>
            <div className="glass absolute bottom-4 left-4 right-4 p-5 md:-right-10 md:bottom-10 md:left-auto md:w-[min(420px,80%)]">
              <PlateLabel p={hero} n={0} />
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-soft">{hero.shortDescription}</p>
              <span className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-burgundy">Study this object <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span>
            </div>
          </Link>

          {/* Curator's note */}
          <div className="col-span-12 md:col-span-5 md:col-start-8 md:row-start-1 md:pl-6">
            <p className="font-serif text-lg leading-relaxed text-ink-soft first-letter:float-left first-letter:mr-2 first-letter:font-serif first-letter:text-7xl first-letter:leading-[0.8] first-letter:text-burgundy">
              {hero.description.split('\n')[0]}
            </p>
            <Flourish className="mt-6 text-gold-dark" />
            <p className="mt-2 font-serif italic text-ink-muted">— Curator’s note, plate I</p>
          </div>

          {second && (
            <Link to={`/artifact/${second.slug}`} state={from} className="group col-span-7 md:col-span-3 md:col-start-9 md:row-start-2 md:self-start">
              <div className="aspect-[3/4] overflow-hidden rounded-t-[999px] border border-gold/50 bg-walnut p-1.5 shadow-card">
                <Img src={second.images[0]?.url} alt={second.images[0]?.alt ?? second.name} className="h-full w-full rounded-t-[999px] object-cover transition-transform duration-1000 group-hover:scale-105" />
              </div>
              <div className="glass mt-3 p-3"><PlateLabel p={second} n={1} /></div>
            </Link>
          )}
          {smalls[0] && (
            <Link to={`/artifact/${smalls[0].slug}`} state={from} className="group col-span-5 self-end md:col-span-2 md:col-start-7 md:row-start-3 md:mt-16 md:self-start">
              <div className="aspect-square overflow-hidden rounded-full border border-gold/50 bg-walnut shadow-card">
                <Img src={smalls[0].image?.url} alt={smalls[0].image?.alt ?? smalls[0].name} className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110" />
              </div>
              <div className="mt-2 text-center"><PlateLabel p={smalls[0]} n={3} /></div>
            </Link>
          )}

          {third && (
            <Link to={`/artifact/${third.slug}`} state={from} className="group relative col-span-12 mt-6 md:col-span-5 md:col-start-1 md:row-start-3 md:mt-10">
              <div className="aspect-[5/4] overflow-hidden bg-walnut shadow-lift">
                <Img src={third.images[0]?.url} alt={third.images[0]?.alt ?? third.name} className="h-full w-full object-cover transition-transform [transition-duration:1600ms] group-hover:scale-105" />
              </div>
              <div className="glass absolute -bottom-6 left-6 right-6 p-4 md:right-16"><PlateLabel p={third} n={2} /></div>
            </Link>
          )}
          <ul className="col-span-12 mt-12 grid gap-6 sm:grid-cols-2 md:col-span-4 md:col-start-9 md:row-start-3 md:mt-16 md:grid-cols-1 md:self-start">
            {smalls.slice(1).map((p, i) => (
              <li key={p.id}>
                <Link to={`/artifact/${p.slug}`} state={from} className="group flex items-center gap-4">
                  <div className="aspect-square w-24 shrink-0 overflow-hidden rounded-full border border-gold/50 bg-walnut shadow-card md:w-28">
                    <Img src={p.image?.url} alt={p.image?.alt ?? p.name} className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                  </div>
                  <div><PlateLabel p={p} n={4 + i} /></div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function CuratedHalls() {
  const { data } = useAsync(() => api.get<{ featured: PC[]; curatorPicks: ProductDetail[] }>('/api/products/curated'), []);
  return (
    <>
      <Arrangement items={data?.featured} />
      {data && <LivingCanvas picks={data.curatorPicks} featured={data.featured} />}
    </>
  );
}

/* ═════════════ 4. Chambers entrance ═════════════ */

function ChambersEntrance() {
  const { data } = useAsync(() => api.get<Category[]>('/api/categories'), []);
  return (
    <section aria-labelledby="chambers-heading" className="relative overflow-hidden bg-[radial-gradient(ellipse_at_50%_0%,#6B1F2A_0%,#3E1018_40%,#14100c_100%)] py-20 text-ivory md:py-28">
      <div className="container-site relative">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-gold-light">Six rooms · six disciplines</p>
            <h2 id="chambers-heading" className="mt-3 font-serif text-4xl text-ivory md:text-6xl">The Collector’s Chambers</h2>
            <p className="mt-3 max-w-lg text-ivory/80">Each chamber has its own light, its own furniture and its own stories. Choose a doorway.</p>
          </div>
          <Link to="/gallery" className="btn-outline-light self-start md:self-auto">Or walk the whole gallery <ArrowRight className="h-4 w-4" /></Link>
        </div>
        {data ? <ChamberNavigator categories={data} /> : <Skeleton className="h-72 !bg-ivory/5" />}
      </div>
    </section>
  );
}

export default function MuseumHome() {
  useSeo({ description: 'Enter ANTIQUORA, a living digital museum of rare artifacts — coins, sculpture, furniture, ceramics and manuscripts you can collect.' });
  return (
    <>
      <OpeningScene />
      <CuratedHalls />
      <ChambersEntrance />
      <TimeTravel />
      <Trust />
      <Newsletter />
    </>
  );
}
