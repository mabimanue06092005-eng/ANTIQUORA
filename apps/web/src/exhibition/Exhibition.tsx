import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, GalleryHorizontalEnd, Image as ImageIcon, LayoutGrid, Landmark, Orbit } from 'lucide-react';
import { api } from '@/lib/api';
import type { Category, ProductCard } from '@/lib/types';
import { cn } from '@/lib/utils';
import { HeroHall } from './HeroHall';
import { LiveLibrary } from './LiveLibrary';
import { Collections } from './Collections';

const FOCAL = 'marble-herakles-head';

/**
 * The photographic homepage: an entrance hall with one object in a lit case, the Live Library,
 * and the collections. Every object shown is a real listing photographed on a studio backdrop;
 * the room around it is built in CSS so nothing about the objects themselves is simulated.
 * With `hero={false}` (the homepage, below the orbital infinity scene) the entrance hall and
 * the chapter rail are left out.
 */
export default function Exhibition({ reduce, compact, hero = true }: { reduce: boolean; compact: boolean; hero?: boolean }) {
  const [products, setProducts] = useState<ProductCard[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const halls = useRef<Record<string, HTMLElement | null>>({});
  const [current, setCurrent] = useState(hero ? 'hall' : 'library');
  const [hdr, setHdr] = useState(0);

  // Pinned halls sit below the sticky site header, so they need its live height.
  useLayoutEffect(() => {
    const h = document.querySelector('header');
    if (!h) return;
    const ro = new ResizeObserver(() => setHdr(h.offsetHeight));
    ro.observe(h);
    setHdr(h.offsetHeight);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let alive = true;
    setError(null);
    Promise.all([api.get<ProductCard[]>('/api/products?pageSize=48&sort=featured'), api.get<Category[]>('/api/categories')])
      .then(([p, c]) => {
        if (!alive) return;
        setProducts(p);
        setCategories(c);
      })
      .catch((e) => alive && setError(e?.message ?? 'Could not load the collection.'));
    return () => {
      alive = false;
    };
  }, [attempt]);

  // Pinned sections change the page height once the data arrives.
  useEffect(() => {
    if (products) requestAnimationFrame(() => ScrollTrigger.refresh());
  }, [products]);

  // Which hall is on screen, for the chapter rail.
  useEffect(() => {
    if (!products) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setCurrent((e.target as HTMLElement).dataset.hall ?? 'hall')),
      { rootMargin: '-45% 0px -45% 0px' },
    );
    Object.values(halls.current).forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [products]);

  const hallRef = (key: string) => (el: HTMLElement | null) => {
    halls.current[key] = el;
    if (el) el.dataset.hall = key;
  };
  const goTo = (key: string) => {
    const el = halls.current[key];
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - hdr + 1, behavior: reduce ? 'auto' : 'smooth' });
  };

  if (error) {
    return (
      <div className="museum-wall flex min-h-[80svh] flex-col items-center justify-center px-6 text-center" role="alert">
        <p className="font-serif text-3xl text-[#f3ece0]">The galleries are closed for a moment.</p>
        <p className="mt-2 max-w-md text-sm text-[#cfc4b3]">{error}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={() => setAttempt((a) => a + 1)} className="btn-gold">Try again</button>
          <Link to="/museum" className="btn-outline-light">Open the still museum</Link>
        </div>
      </div>
    );
  }

  if (!products) {
    return (
      <div className="museum-wall flex h-[100svh] items-center justify-center" role="status">
        <div className="flex flex-col items-center gap-4">
          <span className="h-px w-24 animate-pulse bg-[#d9c39b]/60" aria-hidden />
          <p className="font-serif text-lg italic text-[#cfc4b3]">Lighting the galleries…</p>
        </div>
      </div>
    );
  }

  const focal = products.find((p) => p.slug === FOCAL) ?? products[0];
  // Supporting cases: objects from other fields, so the hall reads as a varied collection.
  const others = products.filter((p) => p.category.slug !== focal?.category.slug);
  const left = others.find((p) => p.category.slug === 'pottery-ceramics') ?? others[0];
  const right = others.find((p) => p.category.slug === 'decorative-collectibles' && p.id !== left?.id) ?? others[1];

  const chapters = [
    ...(hero ? [{ key: 'hall', label: 'Entrance hall' }] : []),
    { key: 'library', label: 'The Live Library' },
    { key: 'collections', label: 'The Collections' },
    { key: 'about', label: 'About ANTIQUORA' },
    { key: 'more', label: 'Other ways in' },
  ];

  return (
    <div className="relative bg-[#0d0c0b]" style={{ ['--hdr' as string]: `${hdr}px` }}>
      <a href="#after-exhibition" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-20 focus:z-50 focus:bg-walnut focus:px-4 focus:py-2 focus:text-ivory">
        Skip the exhibition
      </a>

      {hero && focal && (
        <div ref={hallRef('hall')}>
          <HeroHall focal={focal} left={left} right={right} reduce={reduce} compact={compact} onEnter={() => goTo('library')} />
        </div>
      )}
      <LiveLibrary products={products} categories={categories} reduce={reduce} compact={compact} sectionRef={hallRef('library')} />
      <Collections categories={categories} reduce={reduce} sectionRef={hallRef('collections')} />

      {/* ── About ── */}
      <section ref={hallRef('about')} aria-labelledby="about-heading" className="relative border-t border-[#b39a6b]/20 bg-[#0f0d0b] py-20 md:py-28">
        <div className="container-site grid gap-10 md:grid-cols-[1.1fr_1fr] md:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#d9c39b]">About ANTIQUORA</p>
            <h2 id="about-heading" className="mt-3 font-serif text-4xl font-normal leading-tight text-[#f3ece0] md:text-6xl">Old things deserve new attention.</h2>
          </div>
          <div className="space-y-4 text-[#cfc4b3]">
            <p>ANTIQUORA brings collectible objects from many fields together, so new collectors can find their way in and experienced ones can find the piece they have been waiting for.</p>
            <p>Every listing separates what is documented from what is illustrative. We never invent certificates, appraisals or findspots; if something is uncertain, we say so.</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/our-story" className="btn-gold">Our story <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/contact" className="btn-outline-light">Contact us</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Other ways in ── */}
      <section ref={hallRef('more')} id="after-exhibition" aria-labelledby="simple-heading" className="relative border-t border-[#b39a6b]/20 bg-[#100e0c] py-20">
        <div className="container-site">
          <h2 id="simple-heading" className="font-serif text-4xl font-normal text-[#f3ece0] md:text-5xl">Prefer a simpler way to browse?</h2>
          <p className="mt-3 max-w-xl text-[#cfc4b3]">Every object in the exhibition is a real listing. Browse them the conventional way, with search, filters and prices side by side.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { to: '/shop', icon: LayoutGrid, title: 'Catalogue list', text: 'Filters, sorting and every price at a glance.' },
              { to: '/gallery', icon: GalleryHorizontalEnd, title: 'The gallery', text: 'A horizontal walk through every object.' },
              { to: '/chambers', icon: Landmark, title: 'The chambers', text: 'Six themed rooms, one per collecting field.' },
              { to: '/museum', icon: ArrowRight, title: 'Museum entrance', text: 'The editorial homepage, without motion.' },
              hero
                ? { to: '/', icon: Orbit, title: 'The orbital museum', text: 'The 3D infinity relic with the orbiting collection.' }
                : { to: '/exhibition', icon: ImageIcon, title: 'The photographic hall', text: 'The exhibition entrance hall, lit display cases and no WebGL.' },
            ].map(({ to, icon: I, title, text }) => (
              <Link key={to} to={to} className="group border border-[#b39a6b]/20 p-5 transition-colors hover:border-[#d9c39b]/60">
                <I className="h-5 w-5 text-[#d9c39b]" aria-hidden />
                <p className="mt-3 font-serif text-2xl text-[#f3ece0]">{title}</p>
                <p className="mt-1 text-sm text-[#a99d8b]">{text}</p>
              </Link>
            ))}
          </div>
          <p className="mt-6 max-w-3xl text-xs leading-relaxed text-[#8c7f6c]">
            Photographs are public-domain reference images from The Metropolitan Museum of Art’s Open Access programme. The display cases, room and lighting are
            drawn for this site; prices, stock and listing details are illustrative.{!hero && ' The infinity relic is a procedural digital sculpture and is not for sale.'}
          </p>
        </div>
      </section>

      {/* Chapter rail */}
      {hero && (
      <nav aria-label="Exhibition halls" className="pointer-events-none fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 lg:block">
        <ol className="pointer-events-auto space-y-3">
          {chapters.map((c) => (
            <li key={c.key}>
              <button
                onClick={() => goTo(c.key)}
                aria-current={current === c.key ? 'step' : undefined}
                className={cn('group flex items-center justify-end gap-2 text-[11px] transition-colors', current === c.key ? 'text-[#e6cf9f]' : 'text-[#f3ece0]/40 hover:text-[#e6cf9f]')}
              >
                <span className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">{c.label}</span>
                <span className={cn('h-px bg-current transition-all', current === c.key ? 'w-8' : 'w-5')} aria-hidden />
              </button>
            </li>
          ))}
        </ol>
      </nav>
      )}
    </div>
  );
}
