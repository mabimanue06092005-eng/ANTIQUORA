import { lazy, Suspense, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { useSeo } from '@/lib/seo';
import { useCompact } from '@/lib/useCompact';
import { hasWebGL } from '@/lib/webgl';
import { PageLoader } from '@/components/ui';
import Exhibition from '@/exhibition/Exhibition';

const MuseumHome = lazy(() => import('./MuseumHome'));
// three.js, R3F and the scene are code-split; they only download when the orbit will run.
const Experience = lazy(() => import('@/experience/Experience'));

/**
 * Homepage: the orbital museum first (the gilded infinity relic, its rings and the collection in
 * orbit), then the Live Library, the collections and About. Without WebGL it falls back to the
 * photographic exhibition, which needs none.
 *   ?experience=off  the editorial Living Museum homepage instead
 */
export default function Home() {
  const [params] = useSearchParams();
  const reduce = !!useReducedMotion();
  const compact = useCompact();
  const webgl = useMemo(hasWebGL, []);
  useSeo({ description: 'Step into ANTIQUORA — a quiet museum of rare antiques. Every object in orbit is a real listing you can collect.' });

  if (params.get('experience') === 'off') {
    return (
      <Suspense fallback={<PageLoader />}>
        <MuseumHome />
      </Suspense>
    );
  }
  if (!webgl) return <Exhibition reduce={reduce} compact={compact} />;
  return (
    <>
      <Suspense
        fallback={
          <div className="flex h-[100svh] items-center justify-center bg-[#050403]" role="status">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold-light">Opening the museum…</p>
          </div>
        }
      >
        <Experience compact={compact} reduce={reduce} outro={false} />
      </Suspense>
      <Exhibition reduce={reduce} compact={compact} hero={false} />
    </>
  );
}
