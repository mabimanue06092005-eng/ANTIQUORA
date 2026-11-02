import { useEffect, useRef, useState } from 'react';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/**
 * Two-thumb price slider built from two native range inputs (keyboard and screen-reader
 * accessible for free). Values commit on release so the URL/API aren't hit on every pixel.
 */
export function PriceRange({ min, max, step, value, onCommit }: { min: number; max: number; step: number; value: [number, number]; onCommit: (v: [number, number]) => void }) {
  const [lo, setLo] = useState(value[0]);
  const [hi, setHi] = useState(value[1]);
  useEffect(() => {
    setLo(value[0]);
    setHi(value[1]);
    // Depend on the numbers, not the array identity, so a parent re-render never snaps a thumb back mid-drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value[0], value[1]]);

  const pct = (n: number) => ((n - min) / (max - min)) * 100;
  // Keyboard presses arrive in bursts; commit once the burst settles so a late
  // round-trip can't snap the thumb back. Pointer release commits immediately.
  const latest = useRef<[number, number]>([lo, hi]);
  latest.current = [lo, hi];
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const commitNow = () => {
    clearTimeout(timer.current);
    onCommit(latest.current);
  };
  const commitSoon = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onCommit(latest.current), 400);
  };
  const thumb =
    'pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-ivory [&::-moz-range-thumb]:bg-gold-dark [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-ivory [&::-webkit-slider-thumb]:bg-gold-dark [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(176,141,87,0.2)] [&::-webkit-slider-thumb]:transition-shadow hover:[&::-webkit-slider-thumb]:shadow-[0_0_0_7px_rgba(176,141,87,0.25)] focus-visible:[&::-webkit-slider-thumb]:shadow-[0_0_0_7px_rgba(176,141,87,0.45)]';

  return (
    <div>
      <div className="relative h-8">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-line" aria-hidden />
        <div className="absolute top-1/2 h-1 -translate-y-1/2 bg-gradient-to-r from-gold-dark to-gold" style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} aria-hidden />
        <input
          type="range"
          aria-label="Minimum price"
          aria-valuetext={fmt(lo)}
          min={min}
          max={max}
          step={step}
          value={lo}
          onChange={(e) => setLo(Math.min(Number(e.target.value), hi - step))}
          onPointerUp={commitNow}
          onKeyUp={commitSoon}
          className={thumb}
        />
        <input
          type="range"
          aria-label="Maximum price"
          aria-valuetext={fmt(hi)}
          min={min}
          max={max}
          step={step}
          value={hi}
          onChange={(e) => setHi(Math.max(Number(e.target.value), lo + step))}
          onPointerUp={commitNow}
          onKeyUp={commitSoon}
          className={thumb}
        />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[11px] text-ink-soft" aria-hidden>
        <span>{fmt(lo)}</span>
        <span>{hi >= max ? `${fmt(max)}+` : fmt(hi)}</span>
      </div>
    </div>
  );
}
