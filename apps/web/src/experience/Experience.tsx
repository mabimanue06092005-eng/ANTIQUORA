import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, GalleryHorizontalEnd, Heart, LayoutGrid, Landmark, ShoppingBag } from 'lucide-react';
import { api } from '@/lib/api';
import type { Category, ProductCard } from '@/lib/types';
import { useShop } from '@/context/ShopContext';
import { chamberFor } from '@/lib/chambers';
import { formatINR } from '@/lib/format';
import { cn } from '@/lib/utils';
import { MuseumScene, type OrbitApi } from './Scene';
import { initialState, type OrbitProduct, type SceneState, type Station } from './state';

gsap.registerPlugin(ScrollTrigger);

/* Timeline layout, in "units" — one unit is UNIT_VH of scroll. */
const UNIT_VH = 80;
const T = {
  hold: 0.8, // Scene 1: stillness, the relic alone
  zoom: 1.9, // Scene 2: camera approaches
  gather: 1.0, // Scene 3a: objects arrive in orbit
  perItem: 0.75, // Scene 3b: one step of the orbit per product
  transition: 1.7, // Scene 4: through the object
  chamber: 5.2, // Scene 5: the moonlit chamber
  tail: 0.4,
};
const ORDER = ['ancient-coins', 'sculptures-statues', 'pottery-ceramics', 'decorative-collectibles', 'manuscripts-prints', 'vintage-furniture'];

function pickOrbit(products: ProductCard[], max: number): OrbitProduct[] {
  const by = new Map<string, ProductCard[]>();
  for (const p of products) {
    if (!p.image) continue;
    by.set(p.category.slug, [...(by.get(p.category.slug) ?? []), p]);
  }
  const out: ProductCard[] = [];
  // Round-robin across chambers so the orbit shows coins, sculpture, pottery, collectibles, manuscripts…
  for (let round = 0; out.length < max && round < 6; round++) {
    for (const slug of ORDER) {
      const p = by.get(slug)?.[round];
      if (p && out.length < max) out.push(p);
    }
  }
  return out.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    pricePaise: p.pricePaise,
    compareAtPaise: p.compareAtPaise,
    shortDescription: p.shortDescription,
    stock: p.stock,
    category: p.category,
    period: p.period,
    image: p.image!.url,
  }));
}

function buildStations(categories: Category[]): Station[] {
  const ancient: Station = {
    key: 'ancient',
    title: 'Ancient Civilizations',
    subtitle: 'Before the Common Era',
    href: '/gallery?q=BCE',
    image: '/images/products/attic-neck-amphora-1.jpg',
  };
  const order = ['sculptures-statues', 'ancient-coins', 'pottery-ceramics', 'manuscripts-prints', 'decorative-collectibles', 'vintage-furniture'];
  const cats = order.map((s) => categories.find((c) => c.slug === s)).filter((c): c is Category => !!c);
  return [
    ancient,
    ...cats.map((c) => ({
      key: c.slug,
      title: c.slug === 'decorative-collectibles' ? 'Rare Collectibles' : c.slug === 'ancient-coins' ? 'Coins & Currency' : c.name,
      subtitle: chamberFor(c.slug).title,
      href: `/chambers/${c.slug}`,
      image: c.imageUrl ?? '/images/placeholder-artifact.svg',
      count: c.productCount,
    })),
  ];
}

function Lines({ children, className }: { children: string[]; className?: string }) {
  return (
    <>
      {children.map((line) => (
        <span key={line} className="block overflow-hidden pb-[0.08em]">
          <span data-line className={cn('block', className)}>{line}</span>
        </span>
      ))}
    </>
  );
}

/** `outro` renders the closing "simpler way to browse" panel; the homepage replaces it with its own halls. */
export default function Experience({ compact, reduce, outro = true }: { compact: boolean; reduce: boolean; outro?: boolean }) {
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, isWishlisted } = useShop();
  const [products, setProducts] = useState<OrbitProduct[] | null>(null);
  const [stations, setStations] = useState<Station[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [station, setStation] = useState(0);
  const [phase, setPhase] = useState<'relic' | 'orbit' | 'chamber'>('relic');
  const [visible, setVisible] = useState(true);
  const state = useMemo<SceneState>(() => initialState(), []);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const labels = useRef<Record<string, number>>({});

  // Real catalogue data — the orbit and the chamber are built from the API.
  useEffect(() => {
    let alive = true;
    Promise.all([api.get<ProductCard[]>('/api/products?pageSize=48&sort=featured&inStock=true'), api.get<Category[]>('/api/categories')])
      .then(([p, c]) => {
        if (!alive) return;
        setProducts(pickOrbit(p, compact ? 6 : 8));
        setStations(buildStations(c));
      })
      .catch((e) => alive && setError(e?.message ?? 'Could not load the collection.'));
    return () => {
      alive = false;
    };
  }, [compact]);

  const n = products?.length ?? 0;
  const total = T.hold + T.zoom + T.gather + T.perItem * Math.max(0, n - 1) + T.transition + T.chamber + T.tail;

  // ── The coordinated timeline ───────────────────────────────────────────────
  useLayoutEffect(() => {
    if (!products || !stations || !trackRef.current || !stageRef.current) return;
    const q = (sel: string) => stageRef.current!.querySelectorAll(sel);
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: trackRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: reduce ? true : 0.9, // slight inertia, never out of sync with the scrollbar
          invalidateOnRefresh: true,
          // Moments of stillness: in the orbit, scrolling settles on the nearest artifact.
          // Only snaps inside the orbit; elsewhere it returns the *current* position (no movement).
          // Velocity prediction is off so a fast or programmatic jump never overshoots.
          snap: {
            snapTo: (_v: number, self?: ScrollTrigger) => {
              const cur = self?.progress ?? _v;
              const d = tl.duration();
              const L = labels.current;
              const time = cur * d;
              if (n < 2 || time < L.orbit - T.perItem * 0.5 || time > L.transition) return cur;
              const i = Math.max(0, Math.min(n - 1, Math.round((time - L.orbit) / T.perItem)));
              return (L.orbit + i * T.perItem) / d;
            },
            inertia: false,
            duration: { min: 0.2, max: 0.6 },
            delay: 0.15,
            ease: 'power1.inOut',
          },
          onUpdate: (self) => {
            const t = self.progress * tl.duration();
            setPhase(t < labels.current.gather ? 'relic' : t < labels.current.transition + T.transition * 0.6 ? 'orbit' : 'chamber');
          },
        },
      });
      tlRef.current = tl;
      let t = 0;
      const L = labels.current;

      // Scene 1 — the Orbital Relic, held still for a moment.
      L.relic = t;
      tl.to({}, { duration: T.hold }, t);
      t += T.hold;

      // Scene 2 — the camera approaches; rings widen; dust rushes past.
      L.zoom = t;
      tl.to(state, { camZ: 3.35, camY: 0.12, lookY: 0.2, ringSpread: 1.35, dustRush: 1, fragmentSpread: 1.9, duration: T.zoom, ease: 'power2.inOut' }, t);
      tl.to(q('[data-beat="intro"] [data-line]'), { yPercent: -110, stagger: 0.05, duration: 0.5, ease: 'power2.in' }, t + 0.05);
      tl.to(q('[data-beat="intro"]'), { autoAlpha: 0, duration: 0.3 }, t + 0.45);
      tl.fromTo(q('[data-beat="approach"]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, t + 0.7);
      tl.fromTo(q('[data-beat="approach"] [data-line]'), { yPercent: 110 }, { yPercent: 0, stagger: 0.08, duration: 0.55, ease: 'power3.out' }, t + 0.7);
      tl.to(q('[data-beat="approach"] [data-line]'), { yPercent: -110, stagger: 0.05, duration: 0.4, ease: 'power2.in' }, t + T.zoom - 0.45);
      tl.to(q('[data-beat="approach"]'), { autoAlpha: 0, duration: 0.2 }, t + T.zoom - 0.1);
      t += T.zoom;

      // Scene 3a — pull back; the relic becomes the orbit's centre; objects arrive.
      L.gather = t;
      tl.to(state, { camZ: compact ? 8.6 : 7.8, camY: 1.15, lookY: -0.05, relicScale: 0.42, relicY: -0.15, ringFlat: 1, ringSpread: compact ? 1.05 : 1.45, dustRush: 0.12, orbit: 1, duration: T.gather, ease: 'power2.inOut' }, t);
      tl.fromTo(q('[data-beat="orbit"]'), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' }, t + T.gather * 0.55);
      t += T.gather;

      // Scene 3b — rotate the orbit; one step per product.
      L.orbit = t;
      if (n > 1) tl.to(state, { angle: n - 1, duration: T.perItem * (n - 1), ease: 'none' }, t);
      t += T.perItem * Math.max(0, n - 1);

      // Scene 4 — the active object grows into the camera; moonlight floods in; the chamber appears.
      L.transition = t;
      tl.to(q('[data-beat="orbit"]'), { autoAlpha: 0, y: 20, duration: 0.3 }, t);
      tl.to(state, { focus: 1, ringOpacity: 0, dustRush: 0.8, duration: T.transition * 0.62, ease: 'power2.in' }, t);
      tl.fromTo(q('[data-veil]'), { autoAlpha: 0, '--r': '0%' }, { autoAlpha: 1, '--r': '150%', duration: T.transition * 0.3, ease: 'power2.in' }, t + T.transition * 0.36);
      tl.fromTo(q('[data-beat="through"]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, t + T.transition * 0.4);
      tl.set(state, { temple: 1, travel: 0, dustRush: 0.15 }, t + T.transition * 0.68);
      tl.to(q('[data-veil]'), { autoAlpha: 0, duration: T.transition * 0.3, ease: 'power2.out' }, t + T.transition * 0.7);
      tl.to(q('[data-beat="through"]'), { autoAlpha: 0, duration: 0.2 }, t + T.transition * 0.66);
      t += T.transition;

      // Scene 5 — travel through the chamber; collections are introduced one by one.
      L.chamber = t;
      tl.fromTo(q('[data-beat="chamber"]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 }, t);
      tl.fromTo(q('[data-beat="chamber"] [data-line]'), { yPercent: 110 }, { yPercent: 0, stagger: 0.08, duration: 0.5, ease: 'power3.out' }, t);
      tl.to(state, { travel: 1, dustRush: 0.05, duration: T.chamber, ease: 'power1.inOut' }, t);
      tl.fromTo(q('[data-beat="station"]'), { autoAlpha: 0, x: 30 }, { autoAlpha: 1, x: 0, duration: 0.4 }, t + 0.4);
      tl.to(q('[data-beat="chamber"] [data-line]'), { yPercent: -110, duration: 0.4 }, t + 1.2);
      t += T.chamber;
      tl.to({}, { duration: T.tail }, t);
    }, stageRef);
    // Images and fonts change layout height; recompute trigger positions once things settle.
    const r = setTimeout(() => ScrollTrigger.refresh(), 400);
    return () => {
      clearTimeout(r);
      ctx.revert();
      tlRef.current = null;
    };
  }, [products, stations, state, n, compact, reduce]);

  // Pause WebGL rendering when the stage is off-screen (after the experience).
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [products]);

  /** Scroll so the timeline reaches a given time (keeps the scrollbar the single source of truth). */
  const scrollToTime = useCallback(
    (time: number) => {
      const tl = tlRef.current;
      const st = tl?.scrollTrigger;
      if (!tl || !st) return;
      const y = st.start + (time / tl.duration()) * (st.end - st.start);
      window.scrollTo({ top: Math.round(y) + 2, behavior: reduce ? 'auto' : 'smooth' });
    },
    [reduce],
  );
  const selectItem = useCallback((i: number) => scrollToTime(labels.current.orbit + i * T.perItem), [scrollToTime]);
  const orbitApi = useMemo<OrbitApi>(
    () => ({
      select: (i) => selectItem(i),
      open: (i) => products && navigate(`/artifact/${products[i].slug}`, { state: { from: '/', label: 'the orbital museum' } }),
    }),
    [selectItem, products, navigate],
  );

  // Keyboard: ← / → step through the orbit while it is on screen.
  useEffect(() => {
    if (phase !== 'orbit') return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('input, textarea, select, [role="dialog"]')) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        selectItem(Math.min(n - 1, active + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        selectItem(Math.max(0, active - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, active, n, selectItem]);

  const chapters = [
    { key: 'relic', label: 'The Relic', time: () => 0 },
    { key: 'zoom', label: 'Approach', time: () => labels.current.zoom + T.zoom * 0.6 },
    { key: 'orbit', label: 'The Orbit', time: () => labels.current.orbit },
    { key: 'transition', label: 'Passage', time: () => labels.current.transition + T.transition * 0.9 },
    { key: 'chamber', label: 'The Chamber', time: () => labels.current.chamber + 1.0 }, // after the collections panel has faded in
  ];

  if (error) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-walnut-dark px-6 text-center text-ivory">
        <p className="font-serif text-3xl">The museum is momentarily closed.</p>
        <p className="mt-2 text-ivory/70">{error}</p>
        <Link to="/gallery" className="btn-gold mt-6">Browse the collection instead</Link>
      </div>
    );
  }

  const p = products?.[active];
  const s = stations?.[station];
  const ready = !!products && !!stations;

  return (
    <div className="bg-[#050403] text-ivory">
      <a href="#after-experience" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-28 focus:z-[200] focus:bg-walnut focus:px-4 focus:py-2">
        Skip the 3D experience
      </a>
      <div ref={trackRef} className="relative" style={{ height: `${total * UNIT_VH + 100}vh` }}>
        <div ref={stageRef} className="sticky top-0 h-[100svh] overflow-hidden">
          {/* ── WebGL stage ── */}
          <div className="absolute inset-0" aria-hidden>
            {ready && (
              <Canvas
                dpr={compact ? [1, 1.4] : [1, 1.75]}
                frameloop={visible ? 'always' : 'never'}
                gl={{ antialias: !compact, powerPreference: 'high-performance', alpha: false }}
                camera={{ fov: compact ? 56 : 40, near: 0.1, far: 120, position: [0, 0.35, 9.5] }}
                onCreated={({ gl }) => {
                  gl.toneMappingExposure = 1.05;
                  gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault());
                }}
              >
                <Suspense fallback={null}>
                  <MuseumScene
                    state={state}
                    products={products}
                    stations={stations}
                    api={orbitApi}
                    onActive={setActive}
                    onStation={setStation}
                    onOpenStation={(i) => navigate(stations[i].href)}
                    reduce={reduce}
                    compact={compact}
                  />
                </Suspense>
              </Canvas>
            )}
          </div>
          {!ready && (
            <div className="absolute inset-0 flex flex-col items-center justify-center" role="status">
              <span className="h-12 w-12 animate-spin rounded-full border border-gold/30 border-t-gold-light" aria-hidden />
              <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.3em] text-gold-light">Lighting the relic…</p>
            </div>
          )}

          {/* Soft vignette so typography stays readable over the scene */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(5,4,3,0.75)_100%)]" aria-hidden />

          {/* ── Beat 1: intro ── */}
          <section data-beat="intro" aria-labelledby="relic-title" className="pointer-events-none absolute inset-x-0 bottom-[11vh] text-center md:bottom-[13vh]">
            <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-gold-light"><Lines>{['ANTIQUORA · The Living Museum']}</Lines></p>
            <h1 id="relic-title" className="mt-3 font-serif text-[13vw] font-normal leading-[0.9] text-ivory md:text-[7.5vw]">
              <Lines>{['The Orbital Relic']}</Lines>
            </h1>
            <p className="mx-auto mt-4 max-w-md px-6 text-[15px] text-ivory/75"><Lines>{['Timeless objects, endlessly in orbit. Scroll to step closer.']}</Lines></p>
            <ChevronDown className="mx-auto mt-5 h-5 w-5 animate-bounce text-gold-light motion-reduce:animate-none" aria-hidden />
          </section>

          {/* ── Beat 2: approach ── */}
          <section data-beat="approach" className="pointer-events-none invisible absolute bottom-[10vh] left-0 max-w-2xl bg-[radial-gradient(ellipse_at_left,rgba(5,4,3,0.85),transparent_70%)] py-10 pl-6 pr-16 text-left opacity-0 md:left-[5vw] md:pl-10">
            <h2 className="font-serif text-4xl leading-tight text-ivory md:text-7xl">
              <Lines>{['Every object', 'is a door.']}</Lines>
            </h2>
            <p className="mt-5 max-w-lg text-ivory/85 md:text-lg">
              <Lines>{['Bronze, clay, silver and parchment —', 'each holding the light of another century.']}</Lines>
            </p>
          </section>

          {/* ── Beat 3: the orbit, with a glass product panel ── */}
          <section data-beat="orbit" aria-label="Artifacts in orbit" className="pointer-events-none invisible absolute inset-x-0 bottom-0 top-[84px] opacity-0">
            <div className="container-site pt-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold-light">Hall of orbit · {n} artifacts</p>
              <h2 className="mt-1 font-serif text-3xl text-ivory md:text-5xl">The Collection in Orbit</h2>
            </div>
            {p && (
              <div className="pointer-events-auto absolute inset-x-3 bottom-3 md:inset-x-auto md:bottom-8 md:right-8 md:w-[420px]">
                <div className="glass-dark relative p-5 md:p-6" aria-live="polite">
                  <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-gold-light to-transparent" aria-hidden />
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-light">
                    Nº {String(active + 1).padStart(2, '0')} / {String(n).padStart(2, '0')} · {p.category.name}
                  </p>
                  <h3 className="mt-1.5 font-serif text-2xl leading-tight text-ivory md:text-3xl">{p.name}</h3>
                  <p className="mt-1 text-xs text-ivory/60">{p.period}</p>
                  <p className="mt-2 hidden text-sm leading-relaxed text-ivory/80 sm:block">{p.shortDescription}</p>
                  <p className="mt-3 flex items-baseline gap-3">
                    <span className="font-serif text-2xl text-gold-light">{formatINR(p.pricePaise)}</span>
                    {p.compareAtPaise && <s className="text-sm text-ivory/50">{formatINR(p.compareAtPaise)}</s>}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link to={`/artifact/${p.slug}`} state={{ from: '/', label: 'the orbital museum' }} className="btn-gold h-11 min-h-0 px-4">
                      View artifact <ArrowRight className="h-4 w-4" />
                    </Link>
                    <button onClick={() => addToCart(p)} disabled={p.stock <= 0} className="btn-outline-light h-11 min-h-0 px-4">
                      <ShoppingBag className="h-4 w-4" /> Add to bag
                    </button>
                    <button
                      onClick={() => toggleWishlist(p)}
                      aria-pressed={isWishlisted(p.id)}
                      aria-label={isWishlisted(p.id) ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`}
                      className="flex h-11 w-11 items-center justify-center border border-ivory/35 hover:border-gold-light"
                    >
                      <Heart className={cn('h-4 w-4', isWishlisted(p.id) && 'fill-gold-light text-gold-light')} />
                    </button>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-ivory/15 pt-3">
                    <button onClick={() => selectItem(Math.max(0, active - 1))} disabled={active === 0} className="flex h-10 w-10 items-center justify-center border border-ivory/25 hover:border-gold-light disabled:opacity-35" aria-label="Previous artifact">
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <ol className="flex flex-1 flex-wrap justify-center gap-1.5" aria-label="Choose an artifact">
                      {products!.map((x, i) => (
                        <li key={x.id}>
                          <button onClick={() => selectItem(i)} aria-label={`Show ${x.name}`} aria-current={i === active} className={cn('block h-2 rounded-full transition-all', i === active ? 'w-6 bg-gold-light' : 'w-2 bg-ivory/35 hover:bg-ivory/70')} />
                        </li>
                      ))}
                    </ol>
                    <button onClick={() => selectItem(Math.min(n - 1, active + 1))} disabled={active === n - 1} className="flex h-10 w-10 items-center justify-center border border-ivory/25 hover:border-gold-light disabled:opacity-35" aria-label="Next artifact">
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="mt-2 hidden text-center text-[10px] uppercase tracking-[0.18em] text-ivory/45 md:block" aria-hidden>Scroll · click an object · ← →</p>
                </div>
              </div>
            )}
          </section>

          {/* ── Beat 4: moonlight veil ── */}
          <div data-veil className="pointer-events-none invisible absolute inset-0 opacity-0 [background:radial-gradient(circle_at_50%_50%,#eef3ff_0%,#a9c1ea_calc(var(--r,0%)*0.25),#1a2742_var(--r,0%),#0b1220_calc(var(--r,0%)+20%))]" aria-hidden />
          <p data-beat="through" className="pointer-events-none invisible absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-serif text-3xl italic text-walnut-dark opacity-0 md:text-5xl">
            Through the object, into the archive.
          </p>

          {/* ── Beat 5: the chamber ── */}
          <section data-beat="chamber" aria-labelledby="chamber-title" className="pointer-events-none invisible absolute inset-x-0 top-[96px] text-center opacity-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[#bcd2ff]"><Lines>{['Beneath the moon']}</Lines></p>
            <h2 id="chamber-title" className="mt-2 font-serif text-5xl text-ivory md:text-7xl"><Lines>{['The Moonlit Archive']}</Lines></h2>
          </section>
          {s && (
            <section data-beat="station" aria-label="Collections in the chamber" className="invisible absolute inset-x-3 bottom-3 opacity-0 md:inset-x-auto md:bottom-8 md:left-8 md:w-[400px]">
              <div className="glass-dark p-5" aria-live="polite">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#bcd2ff]">Collection {station + 1} of {stations!.length}{s.count != null ? ` · ${s.count} objects` : ''}</p>
                <h3 className="mt-1 font-serif text-3xl text-ivory">{s.title}</h3>
                <p className="text-sm text-ivory/70">{s.subtitle}</p>
                <Link to={s.href} className="btn-gold mt-4 h-11 min-h-0 px-4">
                  Enter this collection <ArrowRight className="h-4 w-4" />
                </Link>
                <nav aria-label="All collections" className="mt-4 border-t border-ivory/15 pt-3">
                  <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    {stations!.map((x, i) => (
                      <li key={x.key}>
                        <Link to={x.href} className={cn('hover:text-gold-light', i === station ? 'text-gold-light' : 'text-ivory/60')}>{x.title}</Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            </section>
          )}

          {/* ── Chapter rail ── */}
          {ready && (
            <nav aria-label="Experience chapters" className="absolute right-3 top-1/2 hidden -translate-y-1/2 md:block">
              <ol className="space-y-3">
                {chapters.map((c) => (
                  <li key={c.key}>
                    <button onClick={() => scrollToTime(c.time())} className="group flex items-center justify-end gap-2 text-[10px] uppercase tracking-[0.18em] text-ivory/45 hover:text-gold-light">
                      <span className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">{c.label}</span>
                      <span className="h-px w-5 bg-current" aria-hidden />
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
          )}
        </div>
      </div>

      {/* ── The conventional way in ── */}
      {outro && (
      <section id="after-experience" aria-labelledby="simple-heading" className="relative border-t border-gold/20 bg-[radial-gradient(ellipse_at_50%_0%,#1A5A44_0%,#0F3D2E_35%,#0a0806_100%)] py-20">
        <div className="container-site">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold-light">Leave the cinema · keep collecting</p>
          <h2 id="simple-heading" className="mt-3 font-serif text-4xl text-ivory md:text-5xl">Prefer a simpler way to browse?</h2>
          <p className="mt-3 max-w-xl text-ivory/75">Every artifact in the experience is a real listing. Browse them the conventional way, with search, filters and prices side by side.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { to: '/shop', icon: LayoutGrid, title: 'Catalogue list', text: 'Filters, sorting and every price at a glance.' },
              { to: '/gallery', icon: GalleryHorizontalEnd, title: 'The gallery', text: 'A horizontal walk through every object.' },
              { to: '/chambers', icon: Landmark, title: 'The chambers', text: 'Six themed rooms, one per collecting field.' },
              { to: '/museum', icon: ArrowRight, title: 'Museum entrance', text: 'The editorial homepage, without WebGL.' },
            ].map(({ to, icon: I, title, text }) => (
              <Link key={to} to={to} className="glass-dark group p-5 transition-colors hover:border-gold-light">
                <I className="h-5 w-5 text-gold-light" aria-hidden />
                <p className="mt-3 font-serif text-2xl text-ivory">{title}</p>
                <p className="mt-1 text-sm text-ivory/70">{text}</p>
              </Link>
            ))}
          </div>
          <p className="mt-6 text-xs text-ivory/50">The central relic is a procedural digital sculpture created for this experience and is not for sale. Orbiting objects show each listing’s real photograph.</p>
        </div>
      </section>
      )}
    </div>
  );
}
