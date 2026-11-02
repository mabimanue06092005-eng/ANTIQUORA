import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Category } from '@/lib/types';
import { chamberFor } from '@/lib/chambers';
import { hdFromProductImage, EASE_OUT } from './media';
import { ExhibitImage } from './Vitrine';

gsap.registerPlugin(ScrollTrigger);

/**
 * Hall III — the collections. Each field of collecting is a lit, arched niche; the lamps
 * come on one after another as the hall scrolls into view.
 */
export function Collections({ categories, reduce, sectionRef }: { categories: Category[]; reduce: boolean; sectionRef: (el: HTMLElement | null) => void }) {
  const root = useRef<HTMLElement | null>(null);
  const niches = [
    { key: 'ancient', title: 'Ancient Civilizations', note: 'Objects made before the Common Era', href: '/gallery?q=BCE', image: '/images/hd/attic-neck-amphora.jpg', fallback: '/images/products/attic-neck-amphora-1.jpg', count: undefined as number | undefined },
    ...categories.map((c) => ({
      key: c.slug,
      title: c.slug === 'decorative-collectibles' ? 'Rare Collectibles' : c.slug === 'ancient-coins' ? 'Coins & Currency' : c.name,
      note: chamberFor(c.slug).title,
      href: `/chambers/${c.slug}`,
      image: hdFromProductImage(c.imageUrl),
      fallback: c.imageUrl ?? undefined,
      count: c.productCount,
    })),
  ];

  useLayoutEffect(() => {
    const el = root.current;
    if (!el || reduce) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-niche-light]',
        { opacity: 0 },
        { opacity: 1, duration: 1.1, ease: 'power2.out', stagger: 0.12, scrollTrigger: { trigger: el, start: 'top 70%' } },
      );
      gsap.fromTo('[data-niche]', { y: 24, opacity: 0.4 }, { y: 0, opacity: 1, duration: 1.2, ease: EASE_OUT, stagger: 0.08, scrollTrigger: { trigger: el, start: 'top 75%' } });
    }, el);
    return () => ctx.revert();
  }, [reduce, categories.length]);

  return (
    <section
      ref={(el) => {
        root.current = el;
        sectionRef(el);
      }}
      aria-labelledby="collections-title"
      className="museum-wall relative overflow-hidden py-24 md:py-32"
    >
      <div className="container-site relative">
        <div className="max-w-xl">
          <p className="text-[13px] tracking-[0.08em] text-[#c8b089]">Hall III</p>
          <h2 id="collections-title" className="mt-2 font-serif text-4xl font-normal leading-[1.02] text-[#f3ece0] md:text-[3.4rem]">The Collections</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[#cfc4b3]">Seven fields of collecting, each with its own room. Every object in them is a real listing.</p>
        </div>
        <ul className="-mx-4 mt-12 flex snap-x gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-7 md:gap-3 md:overflow-visible md:px-0">
          {niches.map((nch) => (
            <li key={nch.key} data-niche className="w-[58vw] shrink-0 snap-start sm:w-[34vw] md:w-auto">
              <Link to={nch.href} className="group block focus-visible:outline-none">
                <div className="relative aspect-[3/5] overflow-hidden rounded-t-[999px] bg-[#0c0a08] shadow-[inset_0_0_0_1px_rgba(140,110,75,0.35)] group-focus-visible:ring-2 group-focus-visible:ring-[#d9c39b]">
                  <div className="absolute inset-[6%] top-[5%] overflow-hidden rounded-t-[999px] bg-[#77726b]">
                    <ExhibitImage src={nch.image} fallback={nch.fallback} alt="" className="transition-transform [transition-duration:1200ms] ease-out group-hover:scale-[1.04]" />
                    {/* niche lamp: light falls from the crown of the arch */}
                    <span className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ background: 'radial-gradient(110% 70% at 50% 0%, transparent 30%, rgba(20,15,10,0.55) 100%)' }} aria-hidden />
                  </div>
                  <span data-niche-light aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_8%,rgba(255,226,180,0.22),transparent_70%)] transition-opacity group-hover:opacity-100" />
                </div>
                <div className="h-3 bg-[linear-gradient(180deg,#4a4540,#24211e)]" aria-hidden />
                <p className="mt-4 font-serif text-xl leading-tight text-[#f3ece0] group-hover:text-[#e6cf9f]">{nch.title}</p>
                <p className="mt-1 text-[12px] text-[#a99d8b]">{nch.note}{nch.count != null ? ` · ${nch.count} objects` : ''}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
