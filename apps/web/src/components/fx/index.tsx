/**
 * Interactive "museum-tech" effects. Every effect:
 *  - is decorative only (content stays readable and operable without it),
 *  - switches off for `prefers-reduced-motion` and for coarse (touch) pointers where it relies on hover,
 *  - writes to CSS variables / motion values instead of React state, so pointer movement never re-renders.
 */
import { useEffect, useRef, useState, type ReactNode, type PointerEvent as RPointerEvent } from 'react';
import { animate, motion, useInView, useMotionTemplate, useMotionValue, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';

/** True on devices with a precise, hover-capable pointer (mouse / trackpad). */
export function useFinePointer() {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setFine(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return fine;
}

/** Thin gold reading-progress bar pinned to the top of the viewport. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });
  return <motion.div aria-hidden className="fixed inset-x-0 top-0 z-[120] h-[2px] origin-left bg-gradient-to-r from-gold-dark via-gold-light to-gold" style={{ scaleX }} />;
}

/** A soft gallery-light glow that follows the cursor across the page. */
export function CursorSpotlight() {
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const x = useMotionValue(-1000);
  const y = useMotionValue(-1000);
  const bg = useMotionTemplate`radial-gradient(520px circle at ${x}px ${y}px, rgba(210,183,131,0.10), transparent 60%)`;
  useEffect(() => {
    if (!fine || reduce) return;
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, [fine, reduce, x, y]);
  if (!fine || reduce) return null;
  return <motion.div aria-hidden className="pointer-events-none fixed inset-0 z-[60]" style={{ background: bg }} />;
}

/** Pulls its child gently toward the cursor — for primary calls to action. */
export function Magnetic({ children, strength = 0.28, className }: { children: ReactNode; strength?: number; className?: string }) {
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const x = useSpring(0, { stiffness: 220, damping: 18 });
  const y = useSpring(0, { stiffness: 220, damping: 18 });
  const active = fine && !reduce;
  return (
    <motion.span
      className={cn('inline-flex', className)}
      style={{ x, y }}
      onPointerMove={(e) => {
        if (!active) return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.span>
  );
}

/** 3D tilt toward the pointer with a moving light glare. */
export function TiltCard({ children, className, max = 8, glare = true }: { children: ReactNode; className?: string; max?: number; glare?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const active = fine && !reduce;

  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!active || !el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--rx', `${(0.5 - py) * max}deg`);
    el.style.setProperty('--ry', `${(px - 0.5) * max}deg`);
    el.style.setProperty('--gx', `${px * 100}%`);
    el.style.setProperty('--gy', `${py * 100}%`);
  };
  const onLeave = () => {
    ref.current?.style.setProperty('--rx', '0deg');
    ref.current?.style.setProperty('--ry', '0deg');
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn('group/tilt relative [transform-style:preserve-3d]', active && 'transition-transform duration-300 ease-out', className)}
      style={active ? { transform: 'perspective(1000px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))' } : undefined}
    >
      {children}
      {active && glare && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 opacity-0 mix-blend-soft-light transition-opacity duration-300 group-hover/tilt:opacity-100"
          style={{ background: 'radial-gradient(circle at var(--gx, 50%) var(--gy, 50%), rgba(255,244,220,0.75), transparent 55%)' }}
        />
      )}
    </div>
  );
}

/** Card whose border and surface light up around the cursor. */
export function SpotlightCard({ children, className, dark = false }: { children: ReactNode; className?: string; dark?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      onPointerMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        ref.current!.style.setProperty('--mx', `${e.clientX - r.left}px`);
        ref.current!.style.setProperty('--my', `${e.clientY - r.top}px`);
      }}
      className={cn('group/spot relative overflow-hidden', className)}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/spot:opacity-100"
        style={{ background: `radial-gradient(360px circle at var(--mx, 50%) var(--my, 50%), ${dark ? 'rgba(210,183,131,0.16)' : 'rgba(176,141,87,0.14)'}, transparent 45%)` }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/spot:opacity-100"
        style={{
          padding: 1,
          background: 'radial-gradient(240px circle at var(--mx, 50%) var(--my, 50%), rgba(176,141,87,0.9), transparent 60%)',
          WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/** Counts up to `value` when scrolled into view. Screen readers get the final value. */
export function Counter({ value, suffix = '', className }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const fmt = (n: number) => Math.round(n).toLocaleString('en-IN') + suffix;
  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    if (reduce) {
      el.textContent = fmt(value);
      return;
    }
    const controls = animate(0, value, { duration: 1.6, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => (el.textContent = fmt(v)) });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value, reduce]);
  return (
    <span className={className}>
      <span ref={ref} aria-hidden>{reduce ? fmt(value) : fmt(0)}</span>
      <span className="sr-only">{fmt(value)}</span>
    </span>
  );
}

const GLYPHS = 'ΑΒΓΔΕΘΛΞΠΣΦΨΩ0123456789';

/** Text that "decodes" from Greek glyphs into place once, on mount. */
export function ScrambleText({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  const [out, setOut] = useState(reduce ? text : '');
  useEffect(() => {
    if (reduce) {
      setOut(text);
      return;
    }
    let frame = 0;
    let raf = 0;
    const total = text.length * 2.2 + 12;
    const start = performance.now() + delay * 1000;
    const tick = (now: number) => {
      if (now < start) {
        raf = requestAnimationFrame(tick);
        return;
      }
      frame++;
      const revealed = Math.max(0, (frame - 8) / 2.2);
      setOut(
        text
          .split('')
          .map((ch, i) => (ch === ' ' || i < revealed ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join(''),
      );
      if (frame < total) raf = requestAnimationFrame(tick);
      else setOut(text);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, reduce, delay]);
  return (
    <span className={className}>
      <span aria-hidden>{out || ' '}</span>
      <span className="sr-only">{text}</span>
    </span>
  );
}

/** Gold corner brackets with an optional one-time scan line — a "catalogued object" frame. */
export function HudFrame({ className, scan = true, label }: { className?: string; scan?: boolean; label?: string }) {
  const reduce = useReducedMotion();
  const corner = 'absolute h-5 w-5 border-gold-light drop-shadow-[0_0_2px_rgba(20,14,10,0.7)]';
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 z-10', className)}>
      <span className={cn(corner, 'left-3 top-3 border-l border-t')} />
      <span className={cn(corner, 'right-3 top-3 border-r border-t')} />
      <span className={cn(corner, 'bottom-3 left-3 border-b border-l')} />
      <span className={cn(corner, 'bottom-3 right-3 border-b border-r')} />
      {scan && !reduce && <span className="absolute inset-x-3 top-3 h-px animate-scan bg-gradient-to-r from-transparent via-gold-light to-transparent shadow-[0_0_12px_rgba(210,183,131,0.9)]" />}
      {label && <span className="absolute left-5 top-5 bg-walnut-dark/75 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-gold-light backdrop-blur-sm">{label}</span>}
    </div>
  );
}

/** Rotating conic-gradient border for a highlighted panel. */
export function BeamBorder({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('relative overflow-hidden p-px', className)}>
      <span aria-hidden className="absolute inset-[-150%] animate-beam bg-[conic-gradient(from_0deg,transparent_0_300deg,rgba(176,141,87,0.95)_340deg,transparent_360deg)] motion-reduce:hidden" />
      <span aria-hidden className="absolute inset-0 border border-gold/40" />
      <div className="relative h-full">{children}</div>
    </div>
  );
}
