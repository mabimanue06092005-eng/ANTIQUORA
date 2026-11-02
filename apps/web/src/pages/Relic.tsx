import { lazy, Suspense, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useSeo } from '@/lib/seo';
import { useCompact } from '@/lib/useCompact';
import { hasWebGL } from '@/lib/webgl';
import MuseumHome from './MuseumHome';

// The WebGL experience (three.js, R3F, GSAP) is code-split and only downloaded when it will run.
const Experience = lazy(() => import('@/experience/Experience'));

/**
 * /relic: the scroll-driven WebGL museum on its own (the homepage shows it too) when the device can run it,
 * otherwise the editorial Living Museum (same products, same actions, no WebGL).
 *   ?experience=on   force the 3D experience (e.g. with reduced motion enabled)
 *   ?experience=off  force the editorial page
 */
export default function Relic() {
  const [params] = useSearchParams();
  const reduce = !!useReducedMotion();
  const compact = useCompact();
  const webgl = useMemo(hasWebGL, []);
  const force = params.get('experience');
  useSeo({ title: 'The 3D Relic', description: 'A scroll-driven WebGL museum of rare artifacts — every object in orbit is a real listing you can collect.' });

  const use3D = webgl && force !== 'off' && (force === 'on' || !reduce);
  if (!use3D) {
    return (
      <>
        {webgl && (
          <div className="border-b border-gold/20 bg-walnut-dark px-4 py-2.5 text-center text-sm text-ivory/80">
            {reduce ? 'Motion is reduced on your device, so we are showing the still museum.' : 'You are viewing the still museum.'}{' '}
            <Link to="/relic?experience=on" className="inline-flex items-center gap-1 text-gold-light underline-offset-4 hover:underline">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> Open the 3D experience
            </Link>
          </div>
        )}
        <MuseumHome />
      </>
    );
  }
  return (
    <Suspense
      fallback={
        <div className="flex h-[100svh] items-center justify-center bg-[#050403]" role="status">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold-light">Opening the museum…</p>
        </div>
      }
    >
      <Experience compact={compact} reduce={reduce} />
    </Suspense>
  );
}
