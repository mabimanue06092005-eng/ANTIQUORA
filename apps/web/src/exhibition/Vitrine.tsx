import { forwardRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A museum display case, built around a real photograph.
 *
 * The CC0 reference photographs were shot on neutral grey studio backdrops; instead of cutting
 * the objects out (which looks pasted), the backdrop becomes the case's lit interior. Realism
 * comes from what surrounds it: a top-down warm light falloff inside the case, faint glass
 * reflections, thin patinated-bronze trim, a stone/wood plinth, a soft contact shadow and a
 * blurred reflection on the polished floor.
 */
export interface VitrineProps {
  src?: string;
  fallback?: string;
  alt: string;
  /** Case interior aspect ratio, e.g. "3/4". Photos are cropped to it (object-cover). */
  aspect?: string;
  plinth?: 'stone' | 'wood' | 'none';
  reflection?: boolean;
  className?: string;
  caseClassName?: string;
  style?: CSSProperties;
  imgStyle?: CSSProperties;
  children?: ReactNode; // overlays inside the case (e.g. inspect hint)
  priority?: boolean;
}

export function ExhibitImage({ src, fallback, alt, className, style, priority }: { src?: string; fallback?: string; alt: string; className?: string; style?: CSSProperties; priority?: boolean }) {
  const [current, setCurrent] = useState(src ?? fallback);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  return (
    <>
      {state === 'loading' && <span className="absolute inset-0 animate-pulse bg-[#3a3632]" aria-hidden />}
      {state === 'failed' ? (
        <span className="absolute inset-0 flex items-center justify-center bg-[#2c2925] px-4 text-center font-serif text-sm italic text-ivory/60">Photograph unavailable</span>
      ) : (
        <img
          src={current}
          alt={alt}
          draggable={false}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          {...(priority ? { fetchpriority: 'high' } : {})}
          onLoad={() => setState('ready')}
          onError={() => {
            if (fallback && current !== fallback) setCurrent(fallback);
            else setState('failed');
          }}
          className={cn('h-full w-full select-none object-cover transition-opacity duration-700', state === 'ready' ? 'opacity-100' : 'opacity-0', className)}
          style={{
            // A consistent, restrained grade so photographs from different departments share one light.
            filter: 'contrast(1.06) saturate(0.88) sepia(0.07) brightness(0.96)',
            ...style,
          }}
        />
      )}
    </>
  );
}

export const Vitrine = forwardRef<HTMLDivElement, VitrineProps>(function Vitrine(
  { src, fallback, alt, aspect = '3/4', plinth = 'stone', reflection = true, className, caseClassName, style, imgStyle, children, priority },
  ref,
) {
  return (
    <div ref={ref} className={cn('relative', className)} style={style}>
      {/* The case */}
      <div
        data-case
        className={cn(
          'relative overflow-hidden bg-[#77726b]',
          // Thin bronze trim + a hairline of light along the top edge of the glass.
          'shadow-[0_0_0_1px_rgba(120,92,58,0.85),0_0_0_3px_rgba(28,24,20,0.9),0_40px_60px_-30px_rgba(0,0,0,0.9)]',
          caseClassName,
        )}
        style={{ aspectRatio: aspect }}
      >
        <ExhibitImage key={src} src={src} fallback={fallback} alt={alt} style={imgStyle} priority={priority} />
        {/* Light from the case's top lamp: bright at the top, falling off toward the base and sides. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-multiply"
          style={{ background: 'radial-gradient(120% 85% at 50% 0%, rgba(255,246,228,0) 35%, rgba(36,28,20,0.42) 100%)' }}
        />
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[18%] bg-gradient-to-b from-[rgba(255,236,204,0.16)] to-transparent mix-blend-screen" />
        {/* Glass: two faint, soft diagonal reflections — never a mirror. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(115deg, transparent 0 22%, rgba(255,255,255,0.055) 24%, transparent 31%), linear-gradient(115deg, transparent 0 58%, rgba(255,255,255,0.035) 60%, transparent 64%)',
          }}
        />
        {children}
      </div>

      {/* Plinth */}
      {plinth !== 'none' && (
        <div
          aria-hidden
          className={cn(
            'relative mx-[-4%] h-[13%] min-h-[18px]',
            plinth === 'stone'
              ? 'bg-[linear-gradient(180deg,#5b5650_0%,#3b3834_9%,#2b2926_60%,#1d1b19_100%)]'
              : 'bg-[linear-gradient(180deg,#5a3d28_0%,#3a2719_10%,#2a1c12_60%,#1a110b_100%)]',
          )}
          style={{ boxShadow: 'inset 0 1px 0 rgba(255,235,205,0.18), inset 0 -18px 30px rgba(0,0,0,0.45)' }}
        >
          {/* fine surface texture */}
          <span className="absolute inset-0 opacity-[0.18] mix-blend-overlay [background-image:url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E&quot;)]" />
        </div>
      )}

      {/* Contact shadow on the floor */}
      <span aria-hidden className="pointer-events-none absolute -bottom-[3%] left-[-14%] right-[-14%] h-[7%] rounded-[50%] bg-black/70 blur-[10px]" />

      {/* Soft reflection on the polished floor */}
      {reflection && (
        <div
          aria-hidden
          className="pointer-events-none absolute left-[-4%] right-[-4%] top-full h-[38%] overflow-hidden opacity-[0.16] blur-[3px]"
          style={{ maskImage: 'linear-gradient(to bottom, black, transparent 80%)', WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 80%)' }}
        >
          <div className="h-full w-full scale-y-[-1] bg-[linear-gradient(180deg,#3b3834,#1d1b19)]" />
        </div>
      )}
    </div>
  );
});
