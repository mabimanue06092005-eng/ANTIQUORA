import { Link } from 'react-router-dom';

export function Emblem({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <circle cx="20" cy="20" r="19" fill="none" stroke="currentColor" strokeOpacity=".55" />
      <circle cx="20" cy="20" r="15.5" fill="none" stroke="currentColor" strokeOpacity=".3" />
      <path d="M20 9.5 L28.5 30 H25.2 L23 24.6 H17 L14.8 30 H11.5 Z M18.1 21.8 H21.9 L20 16.9 Z" fill="currentColor" />
    </svg>
  );
}

export function Logo({ light = false, className = '' }: { light?: boolean; className?: string }) {
  return (
    <Link to="/" className={`group inline-flex items-center gap-2 sm:gap-2.5 ${className}`} aria-label="ANTIQUORA — home">
      <Emblem className={`h-7 w-7 shrink-0 transition-transform sm:h-8 sm:w-8 duration-500 group-hover:rotate-[20deg] ${light ? 'text-gold-light' : 'text-gold-dark'}`} />
      <span className={`font-serif text-[17px] font-semibold leading-none tracking-[0.14em] sm:text-[22px] sm:tracking-[0.28em] ${light ? 'text-ivory' : 'text-walnut'}`}>ANTIQUORA</span>
    </Link>
  );
}
