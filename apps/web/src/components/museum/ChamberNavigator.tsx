import { Link } from 'react-router-dom';
import type { Category } from '@/lib/types';
import { chamberFor } from '@/lib/chambers';
import { cn } from '@/lib/utils';

/** Visual collection navigator: one doorway per chamber. */
export function ChamberNavigator({ categories, current }: { categories: Category[]; current?: string }) {
  return (
    <nav aria-label="Collector's chambers">
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-6 md:px-0">
        {categories.map((c) => {
          const t = chamberFor(c.slug);
          const on = c.slug === current;
          return (
            <li key={c.id} className="w-[46vw] shrink-0 snap-start sm:w-[30vw] md:w-auto">
              <Link to={`/chambers/${c.slug}`} aria-current={on ? 'page' : undefined} className={cn('group relative block aspect-[3/4] overflow-hidden rounded-t-[999px] border transition-all duration-500', on ? 'border-gold-light shadow-[0_0_40px_-8px_rgba(210,183,131,0.7)]' : 'border-ivory/20 hover:border-gold-light/70')}>
                <img src={c.imageUrl ?? '/images/placeholder-artifact.svg'} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <span className={cn('absolute inset-0 bg-gradient-to-t to-transparent', t.tint)} aria-hidden />
                <span className="absolute inset-x-0 bottom-0 p-3 text-center">
                  <span className="block font-serif text-sm text-gold-light">{t.numeral}</span>
                  <span className="block font-serif text-base leading-tight text-ivory md:text-[15px] lg:text-lg">{t.title}</span>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-ivory/70">{c.productCount} objects</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
