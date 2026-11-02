import { useReducedMotion } from 'framer-motion';
import { useSeo } from '@/lib/seo';
import { useCompact } from '@/lib/useCompact';
import Exhibition from '@/exhibition/Exhibition';

/** /exhibition: the photographic halls with their entrance hall (no WebGL). */
export default function PhotoExhibition() {
  const reduce = !!useReducedMotion();
  const compact = useCompact();
  useSeo({ title: 'The Photographic Hall', description: 'The ANTIQUORA exhibition: real listing photographs in lit display cases, the Live Library and the collections.' });
  return <Exhibition reduce={reduce} compact={compact} />;
}
