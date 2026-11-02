import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, ChevronLeft, ChevronRight, Heart, ScanSearch, ShoppingBag, X } from 'lucide-react';
import type { Category, ProductCard } from '@/lib/types';
import { useShop } from '@/context/ShopContext';
import { formatINR } from '@/lib/format';
import { cn } from '@/lib/utils';
import { hdFor, EASE_OUT, headerOffset } from './media';
import { ExhibitImage, Vitrine } from './Vitrine';

gsap.registerPlugin(ScrollTrigger);

const CURATED = 'curated';
const STEP_VH = 55; // scroll distance per object in the pinned library
const FROM = { from: '/', label: 'the Live Library' };

/**
 * The Live Library — a walnut-panelled reading room. One featured object stands in the lit
 * case at the front; the rest of the shelf waits on a shallow ellipse behind it, receding in
 * true perspective. Scroll (or the controls) brings each object forward.
 */
export function LiveLibrary({ products, categories, reduce, compact, sectionRef }: { products: ProductCard[]; categories: Category[]; reduce: boolean; compact: boolean; sectionRef: (el: HTMLElement | null) => void }) {
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, isWishlisted } = useShop();
  const [category, setCategory] = useState(CURATED);
  const [active, setActive] = useState(0);
  const [inspect, setInspect] = useState(false);
  const pinned = !reduce && !compact;

  // Curator's selection: the API's featured ordering, one or two per field so the shelf varies.
  const list = useMemo(() => {
    if (category !== CURATED) return products.filter((p) => p.category.slug === category);
    const seen = new Map<string, number>();
    return products.filter((p) => {
      const n = seen.get(p.category.slug) ?? 0;
      seen.set(p.category.slug, n + 1);
      return n < 2;
    }).slice(0, 10);
  }, [products, category]);
  const n = list.length;
  const p = list[Math.min(active, n - 1)];

  const section = useRef<HTMLElement | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLDivElement | null)[]>([]);
  const pos = useRef({ v: 0 });
  const stRef = useRef<ScrollTrigger | null>(null);
  const lastActive = useRef(0);

  /** Lay the shelf out for a fractional position. Writes styles directly — no React render per frame. */
  const paint = useCallback(() => {
    const w = stage.current?.clientWidth ?? 1200;
    const Rx = Math.min(w * 0.36, 520);
    const Rz = compact ? 260 : 520;
    items.current.forEach((el, i) => {
      if (!el) return;
      const o = i - pos.current.v;
      const d = Math.abs(o);
      const a = Math.max(-1.45, Math.min(1.45, o * 0.5)); // restrained arc, never past the sides
      const x = Math.sin(a) * Rx;
      const z = (Math.cos(a) - 1) * Rz - Math.min(d, 1) * 120;
      const y = -(1 - Math.cos(a)) * 70 - Math.min(d, 1) * 22;
      el.style.transform = `translate3d(-50%, 0, 0) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${(-a * 22).toFixed(2)}deg)`;
      el.style.filter = d < 0.05 ? 'none' : `blur(${Math.min(5, d * 1.8).toFixed(2)}px) brightness(${(1 - Math.min(0.55, d * 0.22)).toFixed(2)})`;
      el.style.opacity = String(d > 3.6 ? 0 : 1 - Math.max(0, d - 2.6));
      el.style.zIndex = String(100 - Math.round(d * 10));
      el.style.pointerEvents = d > 3 ? 'none' : 'auto';
    });
    // When pinned, scroll position is the source of truth for the selection; otherwise the selection drives the shelf.
    if (!pinned) return;
    const idx = Math.max(0, Math.min(n - 1, Math.round(pos.current.v)));
    if (idx !== lastActive.current) {
      lastActive.current = idx;
      setActive(idx);
    }
  }, [n, compact, pinned]);

  // Pinned, scroll-driven shelf (desktop / tablet with motion allowed).
  useLayoutEffect(() => {
    const el = section.current;
    if (!el || !pinned || n === 0) return;
    pos.current.v = 0;
    lastActive.current = 0;
    setActive(0);
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: el,
          start: () => `top ${headerOffset()}px`,
          end: 'bottom bottom',
          scrub: 0.7,
          // Settle on each object: a moment of stillness for every artifact.
          snap: n > 1 ? { snapTo: 1 / (n - 1), inertia: false, delay: 0.12, duration: { min: 0.25, max: 0.7 }, ease: 'power1.inOut' } : undefined,
          onUpdate: paint,
          onRefresh: paint,
        },
      });
      tl.to(pos.current, { v: Math.max(0, n - 1), duration: 1, onUpdate: paint });
      stRef.current = tl.scrollTrigger ?? null;
    }, el);
    paint();
    return () => {
      ctx.revert();
      stRef.current = null;
    };
  }, [pinned, n, paint, category]);

  // Non-pinned modes (phones, reduced motion): selection moves the shelf directly.
  useEffect(() => {
    if (pinned) return;
    lastActive.current = active;
    if (reduce) {
      pos.current.v = active;
      paint();
      return;
    }
    const t = gsap.to(pos.current, { v: active, duration: 0.8, ease: 'power2.inOut', onUpdate: paint });
    return () => {
      t.kill();
    };
  }, [active, pinned, reduce, paint]);

  useEffect(() => paint(), [paint]);
  useEffect(() => {
    const onResize = () => paint();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [paint]);

  // Lighting transition whenever a new object comes forward.
  useEffect(() => {
    setInspect(false);
    if (reduce || !stage.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('[data-spot]', { opacity: 0.35 }, { opacity: 1, duration: 0.9, ease: 'power2.out' });
      gsap.fromTo('[data-plate] [data-anim]', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, ease: EASE_OUT });
    }, section.current ?? undefined);
    return () => ctx.revert();
  }, [p?.id, reduce]);

  /** Move to an object: scroll in pinned mode (the scrollbar stays the single source of truth). */
  const goTo = useCallback(
    (i: number) => {
      const target = Math.max(0, Math.min(n - 1, i));
      const st = stRef.current;
      if (pinned && st) {
        // Jump the scroll position; the scrubbed timeline glides the shelf there. (A native smooth
        // scroll would race ScrollTrigger's snap and could be pulled back.)
        st.getTween(true)?.kill();
        const y = st.start + (n > 1 ? target / (n - 1) : 0) * (st.end - st.start);
        window.scrollTo({ top: Math.round(y) + 1, behavior: 'instant' });
      } else setActive(target);
    },
    [n, pinned],
  );

  const chooseCategory = (slug: string) => {
    setCategory(slug);
    setActive(0);
    pos.current.v = 0;
    // Return to the start of the library so the new shelf begins with its first object.
    const top = section.current ? section.current.getBoundingClientRect().top + window.scrollY : 0;
    if (pinned) requestAnimationFrame(() => window.scrollTo({ top: top - headerOffset() + 1, behavior: 'instant' }));
  };

  // Keyboard: ← → while the library is on screen.
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    let visible = false;
    const io = new IntersectionObserver(([e]) => (visible = e.intersectionRatio > 0.5), { threshold: [0, 0.5, 1] });
    io.observe(el.querySelector('[data-stage-wrap]') ?? el);
    const onKey = (e: KeyboardEvent) => {
      if (!visible || (e.target as HTMLElement)?.closest?.('input, textarea, select, [role="dialog"]')) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goTo(lastActive.current + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goTo(lastActive.current - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      io.disconnect();
      window.removeEventListener('keydown', onKey);
    };
  }, [goTo]);

  // Hover inspection: the featured case turns a few degrees toward the pointer, the glare follows.
  // Swipe on phones / when the shelf is not scroll-driven. A short horizontal flick moves one object.
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const onSwipeStart = (e: React.PointerEvent) => {
    if (pinned || e.pointerType === 'mouse') return;
    swipe.current = { x: e.clientX, y: e.clientY };
    swiped.current = false;
  };
  const onSwipeEnd = (e: React.PointerEvent) => {
    const s0 = swipe.current;
    swipe.current = null;
    if (!s0) return;
    const dx = e.clientX - s0.x;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - s0.y)) {
      swiped.current = true;
      goTo(lastActive.current + (dx < 0 ? 1 : -1));
    }
  };

  const tilt = useRef<HTMLDivElement>(null);
  const onInspectMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== 'mouse' || !tilt.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(tilt.current, { rotationY: px * 10, rotationX: -py * 7, duration: 0.8, ease: 'power3.out' });
    tilt.current.style.setProperty('--gx', `${(px + 0.5) * 100}%`);
    tilt.current.style.setProperty('--gy', `${(py + 0.5) * 100}%`);
  };
  const onInspectLeave = () => tilt.current && gsap.to(tilt.current, { rotationY: 0, rotationX: 0, duration: 1, ease: 'power3.out' });

  const openActive = () => {
    if (!p) return;
    const el = items.current[active]?.querySelector('[data-case]');
    let gone = false;
    const go = () => {
      if (gone) return;
      gone = true;
      navigate(`/artifact/${p.slug}`, { state: FROM });
    };
    if (reduce || !el) return go();
    gsap.to(el, { scale: 1.12, opacity: 0, duration: 0.45, ease: 'power2.in', onComplete: go });
    window.setTimeout(go, 700); // never let a stalled frame loop hold up navigation
  };

  const total = categories.reduce((s, c) => s + c.productCount, 0);
  const tabs = [{ slug: CURATED, name: 'Curator’s selection', count: Math.min(10, total) }, ...categories.map((c) => ({ slug: c.slug, name: c.name, count: c.productCount }))];

  return (
    <section
      ref={(el) => {
        section.current = el;
        sectionRef(el);
      }}
      aria-labelledby="library-title"
      className="relative"
      style={pinned ? { height: `${100 + Math.max(0, n - 1) * STEP_VH}vh` } : undefined}
    >
      <div data-stage-wrap className={cn('overflow-hidden bg-[#120d0a]', pinned ? 'sticky top-[var(--hdr,0px)] h-[calc(100svh-var(--hdr,0px))] min-h-[620px]' : 'relative')}>
        {/* The room: walnut panelling, two wall sconces, a polished floor */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#0f0b08_0%,#1a120c_60%,#140e0a_100%)]" />
          <div className="absolute inset-x-0 top-0 h-[72%] opacity-70 [background-image:repeating-linear-gradient(90deg,rgba(0,0,0,0.45)_0_2px,transparent_2px_12.5%),repeating-linear-gradient(90deg,rgba(120,80,48,0.07)_0_6%,rgba(80,52,30,0.05)_6%_12.5%)]" />
          <div className="absolute inset-x-0 top-[50%] h-px bg-[rgba(160,120,80,0.14)]" />
          <div className="absolute left-[12%] top-[26%] h-40 w-40 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(230,180,120,0.16),transparent_70%)]" />
          <div className="absolute left-[88%] top-[26%] h-40 w-40 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(230,180,120,0.14),transparent_70%)]" />
          <div className="museum-floor absolute inset-x-0 bottom-0 h-[28%]" />
          <div data-spot className="absolute left-1/2 top-0 h-full w-[46vw] max-w-[640px] -translate-x-1/2 bg-[radial-gradient(42%_60%_at_50%_58%,rgba(235,195,140,0.20),transparent_72%)]" />
        </div>

        <div className="container-site relative z-10 flex flex-col pt-10 md:pt-12">
          {/* Editorial heading + category navigation */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <p className="text-[13px] tracking-[0.08em] text-[#c8b089]">Hall II</p>
              <h2 id="library-title" className="mt-2 font-serif text-4xl font-normal leading-[1.02] text-[#f3ece0] md:text-[3.4rem]">The Live Library</h2>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#cfc4b3]">
                {pinned ? 'Scroll to bring each object forward.' : 'Swipe or use the arrows to bring each object forward.'} Choose a field to change the shelves.
              </p>
            </div>
            <nav aria-label="Library collections" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:max-w-[60%] lg:px-0 [&::-webkit-scrollbar]:hidden">
              <ul className="flex w-max gap-1 border-b border-[#b39a6b]/25">
                {tabs.map((t) => (
                  <li key={t.slug}>
                    <button
                      onClick={() => chooseCategory(t.slug)}
                      aria-pressed={category === t.slug}
                      className={cn('relative min-h-[44px] whitespace-nowrap px-3 text-[13px] transition-colors', category === t.slug ? 'text-[#f3ece0]' : 'text-[#a99d8b] hover:text-[#e6dccb]')}
                    >
                      {t.name} <span className="text-[11px] text-[#8c7f6c]">{t.count}</span>
                      {category === t.slug && <span className="absolute inset-x-3 -bottom-px h-px bg-[#d9c39b]" aria-hidden />}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        {/* The shelf: featured case at the front, the rest on a shallow ellipse behind */}
        <div
          ref={stage}
          className={cn('relative z-10 mx-auto w-full [perspective:1700px] [perspective-origin:50%_35%]', pinned ? 'h-[calc(100svh-var(--hdr,0px)-13rem)] min-h-[360px]' : 'h-[58vh] min-h-[360px] md:h-[520px]')}
          aria-roledescription="carousel"
          aria-label="Objects in the Live Library"
          onPointerDown={onSwipeStart}
          onPointerUp={onSwipeEnd}
          onPointerCancel={() => (swipe.current = null)}
          onClickCapture={(e) => {
            // A swipe ends with a click on whatever case was under the finger; swallow it.
            if (swiped.current) {
              e.preventDefault();
              e.stopPropagation();
              swiped.current = false;
            }
          }}
          style={{ touchAction: pinned ? undefined : 'pan-y' }}
        >
          <div className="absolute inset-0 [transform-style:preserve-3d]">
            {list.map((item, i) => {
              const isActive = i === active;
              return (
                <div
                  key={`${category}-${item.id}`}
                  ref={(el) => (items.current[i] = el)}
                  className="absolute bottom-[10%] left-1/2 w-[44vw] max-w-[300px] will-change-transform sm:w-[30vw] md:w-[20vw] md:max-w-[330px]"
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${n}: ${item.name}`}
                >
                  {isActive ? (
                    <div onPointerMove={onInspectMove} onPointerLeave={onInspectLeave} className="[perspective:900px]">
                      <div ref={tilt} className="relative [transform-style:preserve-3d]" style={{ transform: inspect ? 'scale(1.18)' : undefined, transition: 'transform 0.7s cubic-bezier(.22,1,.36,1)' }}>
                        <button onClick={openActive} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9c39b]" aria-label={`View ${item.name}`}>
                          <Vitrine
                            src={inspect && item.hoverImage ? item.hoverImage.url : hdFor(item.slug)}
                            fallback={item.image?.url}
                            alt={inspect && item.hoverImage ? item.hoverImage.alt : item.image?.alt ?? item.name}
                            aspect="4/5"
                            plinth={item.category.slug === 'vintage-furniture' ? 'wood' : 'stone'}
                          >
                            {/* Specular glare that follows the pointer during inspection */}
                            <span aria-hidden className="pointer-events-none absolute inset-0 opacity-60 mix-blend-soft-light" style={{ background: 'radial-gradient(circle at var(--gx,50%) var(--gy,30%), rgba(255,244,225,0.55), transparent 45%)' }} />
                          </Vitrine>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => goTo(i)} className="block w-full text-left" aria-label={`Bring ${item.name} forward`} tabIndex={Math.abs(i - active) === 1 ? 0 : -1}>
                      <Vitrine src={hdFor(item.slug)} fallback={item.image?.url} alt={item.image?.alt ?? item.name} aspect="4/5" plinth={item.category.slug === 'vintage-furniture' ? 'wood' : 'stone'} reflection={false} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Museum label for the featured object — catalogue data only */}
        {p && (
          <div data-plate className={cn('z-20', pinned ? 'absolute bottom-6 right-20 w-[340px] lg:right-24' : 'container-site relative -mt-4 pb-10')}>
            <div className="bg-[#efe7d8] p-5 text-walnut shadow-[0_24px_40px_-24px_rgba(0,0,0,0.9)]" aria-live="polite">
              <div data-anim className="flex items-center justify-between text-[12px] text-ink-muted">
                <span>{p.category.name}</span>
                <span className="tabular-nums">{String(active + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>
              </div>
              <h3 data-anim className="mt-2 font-serif text-[1.65rem] font-medium leading-tight text-walnut">{p.name}</h3>
              {(p.period || p.origin) && <p data-anim className="mt-1 text-[13px] text-ink-soft">{[p.origin, p.period].filter(Boolean).join(' · ')}</p>}
              <p data-anim className="mt-3 line-clamp-2 text-[14px] leading-relaxed text-ink-soft">{p.shortDescription}</p>
              <div data-anim className="mt-4 flex items-baseline justify-between border-t border-walnut/15 pt-3">
                <span className="font-serif text-2xl text-walnut">{formatINR(p.pricePaise)}</span>
                <span className={cn('text-[12px]', p.stock <= 0 ? 'text-danger' : 'text-ink-muted')}>{p.stock <= 0 ? 'Sold' : p.stock === 1 ? 'One available' : `${p.stock} available`}</span>
              </div>
              <div data-anim className="mt-4 flex flex-wrap gap-2">
                <button onClick={openActive} className="inline-flex h-11 flex-1 items-center justify-center gap-2 bg-walnut px-4 text-[13px] text-[#f3ece0] transition-colors hover:bg-walnut-light">
                  View artifact <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
                <button onClick={() => addToCart(p)} disabled={p.stock <= 0} className="inline-flex h-11 items-center gap-2 border border-walnut/30 px-3 text-[13px] text-walnut transition-colors hover:border-walnut disabled:opacity-40" aria-label={`Add ${p.name} to bag`}>
                  <ShoppingBag className="h-4 w-4" aria-hidden /> Add
                </button>
                <button onClick={() => toggleWishlist(p)} aria-pressed={isWishlisted(p.id)} aria-label={isWishlisted(p.id) ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`} className="inline-flex h-11 w-11 items-center justify-center border border-walnut/30 text-walnut hover:border-walnut">
                  <Heart className={cn('h-4 w-4', isWishlisted(p.id) && 'fill-walnut')} />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-1">
                  <button onClick={() => goTo(active - 1)} disabled={active === 0} className="flex h-10 w-10 items-center justify-center text-walnut hover:bg-walnut/10 disabled:opacity-30" aria-label="Previous object">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button onClick={() => goTo(active + 1)} disabled={active >= n - 1} className="flex h-10 w-10 items-center justify-center text-walnut hover:bg-walnut/10 disabled:opacity-30" aria-label="Next object">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
                <button onClick={() => setInspect((v) => !v)} aria-pressed={inspect} className="inline-flex h-10 items-center gap-1.5 px-2 text-[13px] text-ink-soft hover:text-walnut">
                  {inspect ? <X className="h-4 w-4" aria-hidden /> : <ScanSearch className="h-4 w-4" aria-hidden />}
                  {inspect ? 'Close inspection' : p.hoverImage ? 'Inspect · second view' : 'Inspect closer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {n === 0 && <p className="relative z-10 py-24 text-center font-serif text-2xl text-[#e6dccb]">This shelf is being rehung — choose another field.</p>}
        <Link to="/shop" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:bg-walnut focus:px-3 focus:py-2 focus:text-ivory">
          Browse every object as a list
        </Link>
      </div>
    </section>
  );
}

export { ExhibitImage };
