import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown } from 'lucide-react';
import type { ProductCard } from '@/lib/types';
import { hdFor, EASE_OUT, headerOffset } from './media';
import { Vitrine } from './Vitrine';

gsap.registerPlugin(ScrollTrigger);

/**
 * The first room. One dominant object (the focal case), two supporting cases set back in the
 * room and softened by depth of field, an out-of-focus brass stanchion in the foreground, and
 * warm overhead lighting. Motion: lights come up on arrival, the room drifts a few pixels with
 * the pointer, and scrolling dollies the camera into the focal case before handing over to the
 * Live Library.
 */
export function HeroHall({ focal, left, right, reduce, compact, onEnter }: { focal: ProductCard; left?: ProductCard; right?: ProductCard; reduce: boolean; compact: boolean; onEnter: () => void }) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    let done = 0;
    const ctx = gsap.context(() => {
      // Arrival: the room is dark, then the lamps warm up and the objects settle into place.
      if (!reduce) {
        const intro = gsap.timeline({ defaults: { ease: EASE_OUT } });
        intro
          .fromTo('[data-dim]', { opacity: 1 }, { opacity: 0, duration: 1.8, ease: 'power2.out' })
          .fromTo('[data-beam]', { opacity: 0 }, { opacity: 1, duration: 2.2, stagger: 0.25 }, 0.2)
          .fromTo('[data-focal]', { scale: 1.04, y: 18 }, { scale: 1, y: 0, duration: 2.2 }, 0.1)
          .fromTo('[data-support]', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1.8, stagger: 0.2 }, 0.5)
          .fromTo('[data-line]', { yPercent: 105 }, { yPercent: 0, duration: 1.2, stagger: 0.09 }, 0.6)
          .fromTo('[data-fade]', { opacity: 0 }, { opacity: 1, duration: 1.2, stagger: 0.12 }, 1.1);
        // The headline must never stay hidden: finish the arrival even if frames are being dropped.
        done = window.setTimeout(() => intro.progress(1), 3800);
        intro.eventCallback('onComplete', () => window.clearTimeout(done));
      } else {
        gsap.set('[data-dim]', { opacity: 0 });
      }

      // Scroll: a slow dolly toward the focal case; the room recedes, then dims into the library.
      if (!reduce && !compact) {
        gsap
          .timeline({
            defaults: { ease: 'none' },
            scrollTrigger: { trigger: el, start: () => `top ${headerOffset()}px`, end: 'bottom bottom', scrub: 0.8, invalidateOnRefresh: true },
          })
          .to('[data-cam]', { scale: 1.38, yPercent: -4, ease: 'power1.inOut', duration: 1 }, 0)
          .to('[data-support="l"]', { xPercent: -30, filter: 'blur(5px) brightness(0.55)', duration: 1 }, 0)
          .to('[data-support="r"]', { xPercent: 30, filter: 'blur(5px) brightness(0.55)', duration: 1 }, 0)
          .to('[data-fg]', { xPercent: -40, opacity: 0, duration: 0.6 }, 0)
          .to('[data-copy]', { y: -60, opacity: 0, duration: 0.45 }, 0.05)
          .to('[data-label]', { opacity: 0, duration: 0.3 }, 0.1)
          // fromTo + immediateRender:false so this never fights the arrival fade on the same layer.
          .fromTo('[data-dim]', { opacity: 0 }, { opacity: 0.88, duration: 0.35, immediateRender: false }, 0.65);
      }

      // Pointer drift — a few pixels, more for nearer layers, never continuous motion.
      if (!reduce && !compact) {
        const layers = gsap.utils.toArray<HTMLElement>('[data-depth]');
        const movers = layers.map((l) => ({
          d: Number(l.dataset.depth),
          x: gsap.quickTo(l, 'x', { duration: 1.6, ease: 'power3.out' }),
          y: gsap.quickTo(l, 'y', { duration: 1.6, ease: 'power3.out' }),
        }));
        const onMove = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          movers.forEach((m) => {
            m.x(-px * m.d * 22);
            m.y(-py * m.d * 12);
          });
        };
        el.addEventListener('pointermove', onMove);
        return () => el.removeEventListener('pointermove', onMove);
      }
    }, el);
    return () => {
      window.clearTimeout(done);
      ctx.revert();
    };
  }, [reduce, compact]);

  const period = [focal.origin, focal.period].filter(Boolean).join(' · ');

  return (
    <section ref={root} aria-labelledby="hall-title" className={compact || reduce ? 'relative' : 'relative h-[200vh]'}>
      <div className="museum-wall sticky top-[var(--hdr,0px)] h-[calc(100svh-var(--hdr,0px))] min-h-[560px] overflow-hidden max-md:h-[920px]">
        {/* Camera: everything that the dolly moves */}
        <div data-cam className="absolute inset-0 origin-[64%_56%]">
          {/* Back wall: warm washes from the ceiling lamps above each case */}
          <div data-depth="0.15" className="absolute inset-[-3%]" aria-hidden>
            <div className="absolute inset-0 bg-[radial-gradient(38%_55%_at_64%_30%,rgba(214,170,112,0.17),transparent_70%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(18%_30%_at_23%_40%,rgba(214,170,112,0.08),transparent_70%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(18%_30%_at_88%_42%,rgba(214,170,112,0.07),transparent_70%)]" />
            {/* Dado rail and a pilaster — architectural depth, kept almost subliminal */}
            <div className="absolute inset-x-0 top-[61%] h-px bg-[rgba(140,110,75,0.16)]" />
            <div className="absolute inset-x-0 top-[61.4%] h-[3px] bg-[rgba(0,0,0,0.35)]" />
            <div className="absolute bottom-[28%] top-0 hidden w-[3.5%] bg-[linear-gradient(90deg,rgba(255,240,220,0.025),rgba(0,0,0,0.25))] md:left-[42%] md:block" />
          </div>

          {/* Polished hardwood floor */}
          <div className="museum-floor absolute inset-x-0 bottom-0 h-[30%]" aria-hidden>
            <div className="absolute inset-0 bg-[radial-gradient(30%_70%_at_64%_0%,rgba(214,170,112,0.16),transparent_75%)]" />
          </div>

          {/* Visible light from the ceiling lamps (very faint, as in a dusty gallery) */}
          <div aria-hidden>
            <div data-beam className="absolute left-[64%] top-0 h-[78%] w-[34vw] max-w-[520px] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,226,180,0.10),rgba(255,226,180,0.025)_70%,transparent)] [clip-path:polygon(44%_0,56%_0,100%_100%,0_100%)]" />
            <div data-beam className="absolute left-[23%] top-0 hidden h-[62%] w-[18vw] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,226,180,0.06),transparent)] [clip-path:polygon(44%_0,56%_0,100%_100%,0_100%)] md:block" />
            <div data-beam className="absolute left-[88%] top-0 hidden h-[62%] w-[16vw] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,226,180,0.05),transparent)] [clip-path:polygon(44%_0,56%_0,100%_100%,0_100%)] md:block" />
          </div>

          {/* Supporting cases, set back in the room (smaller, softer, dimmer) */}
          {left && (
            <div data-support="l" data-depth="0.35" className="absolute bottom-[22%] left-[15%] hidden w-[11vw] max-w-[190px] md:block" style={{ filter: 'blur(1.4px) brightness(0.62)' }}>
              <Vitrine src={hdFor(left.slug)} fallback={left.image?.url} alt={left.image?.alt ?? left.name} aspect="3/4" plinth="stone" />
            </div>
          )}
          {right && (
            <div data-support="r" data-depth="0.35" className="absolute bottom-[23%] right-[5%] hidden w-[10vw] max-w-[170px] md:block" style={{ filter: 'blur(1.6px) brightness(0.58)' }}>
              <Vitrine src={hdFor(right.slug)} fallback={right.image?.url} alt={right.image?.alt ?? right.name} aspect="3/4" plinth="wood" />
            </div>
          )}

          {/* The focal case */}
          <div data-depth="0.6" className="absolute bottom-[8%] left-1/2 w-[62vw] max-w-[280px] -translate-x-1/2 md:bottom-[15%] md:left-[64%] md:w-[24vw] md:max-w-[min(440px,calc((100svh-var(--hdr,0px))*0.44))]">
            <div data-focal>
              <Link to={`/artifact/${focal.slug}`} aria-label={`${focal.name} — view the artifact`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light">
                <Vitrine src={hdFor(focal.slug)} fallback={focal.image?.url} alt={focal.image?.alt ?? focal.name} aspect="4/5" plinth="stone" priority />
              </Link>
            </div>
          </div>

          {/* Wall label beside the focal case — real catalogue data only */}
          <div data-label data-depth="0.6" className="absolute bottom-[34%] left-[78%] hidden w-[170px] lg:block">
            <Link to={`/artifact/${focal.slug}`} className="group block bg-[#efe7d8] px-4 py-3 text-walnut shadow-[0_10px_24px_-12px_rgba(0,0,0,0.8)] transition-colors hover:bg-[#f6efe2]">
              <span className="block font-serif text-[17px] leading-tight">{focal.name}</span>
              {period && <span className="mt-1 block text-[11px] leading-snug text-ink-soft">{period}</span>}
              <span className="mt-2 block text-[11px] text-ink-muted group-hover:text-walnut">View the object →</span>
            </Link>
          </div>
        </div>

        {/* Out-of-focus brass stanchion and rope in the foreground */}
        <div data-fg data-depth="1.2" aria-hidden className="pointer-events-none absolute bottom-[-4%] left-[-2%] hidden h-[42%] w-[30%] blur-[6px] md:block">
          <div className="absolute bottom-0 left-[38%] h-full w-[14px] rounded-t-full bg-[linear-gradient(90deg,#3a2a17,#a07f4e_45%,#4a3520)]" />
          <div className="absolute left-[38%] top-[-2%] h-[26px] w-[26px] -translate-x-[6px] rounded-full bg-[radial-gradient(circle_at_35%_35%,#c9a46a,#5b4122)]" />
          <div className="absolute left-[40%] top-[6%] h-[50%] w-[120%] rounded-[0_0_50%_50%/0_0_100%_100%] border-b-[10px] border-[#3d1c1c]" />
        </div>

        {/* Copy */}
        <div data-copy className="container-site pointer-events-none relative z-10 flex h-full flex-col justify-start pt-12 md:justify-center md:pt-0">
          <div className="pointer-events-auto max-w-[36rem]">
            <p className="overflow-hidden text-[13px] tracking-[0.08em] text-[#c8b089]">
              <span data-line className="block">Antiquora · Private collection</span>
            </p>
            <h1 id="hall-title" className="mt-4 font-serif text-[2.75rem] font-normal leading-[1.02] text-[#f3ece0] sm:text-6xl lg:text-[4.2rem]">
              <span className="block overflow-hidden pb-[0.06em]"><span data-line className="block">History,</span></span>
              <span className="block overflow-hidden pb-[0.06em]"><span data-line className="block">beautifully preserved.</span></span>
            </h1>
            <p data-fade className="mt-6 max-w-[26rem] text-[16px] leading-relaxed text-[#d9cfbf]">
              Coins, sculpture, ceramics and manuscripts spanning twenty-five centuries — lit, catalogued and presented as a collector would show them.
            </p>
            <button
              data-fade
              onClick={onEnter}
              className="mt-9 inline-flex h-12 items-center gap-3 border border-[#b39a6b]/70 bg-[#b39a6b]/10 px-6 text-[13px] tracking-[0.12em] text-[#f3ece0] transition-colors hover:border-[#d9c39b] hover:bg-[#b39a6b]/20"
            >
              Enter the Live Library <ArrowDown className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        {/* Arrival / hand-over darkness */}
        <div data-dim aria-hidden className="pointer-events-none absolute inset-0 bg-[#0b0a09]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55)_100%)]" />
      </div>
    </section>
  );
}
