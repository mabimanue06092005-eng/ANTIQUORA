import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useSeo } from '../lib/seo';
import type { Category } from '../lib/types';
import { ErrorState, Img, PageHeader, Reveal, Skeleton } from '../components/ui';
import { TiltCard } from '@/components/fx';

export default function Categories() {
  useSeo({ title: 'Categories', description: 'Explore ANTIQUORA by collecting field: ancient coins, sculpture, vintage furniture, ceramics, manuscripts and decorative collectibles.' });
  const { data, error, loading, reload } = useAsync(() => api.get<Category[]>('/api/categories'), []);
  return (
    <>
      <PageHeader eyebrow="Collecting fields" title="Categories" crumbs={[{ label: 'Home', to: '/' }, { label: 'Categories' }]}>
        From the palm-sized to the monumental, explore the disciplines that make up the ANTIQUORA collection.
      </PageHeader>
      <div className="container-site py-14">
        {error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : (
          <ul className="grid gap-x-8 gap-y-14 md:grid-cols-2">
            {(loading ? Array.from({ length: 6 }) : data ?? []).map((c, i) => {
              const cat = c as Category | undefined;
              return (
                <li key={cat?.id ?? i}>
                  {!cat ? (
                    <Skeleton className="aspect-[16/10]" />
                  ) : (
                    <Reveal delay={(i % 2) * 0.08}>
                      <Link to={`/shop?category=${cat.slug}`} className="group block">
                        <TiltCard max={5}><div className="aspect-[16/10] overflow-hidden bg-parchment">
                          <Img src={cat.imageUrl ?? undefined} alt="" className="h-full w-full object-cover transition-transform [transition-duration:1400ms] group-hover:scale-105" />
                        </div></TiltCard>
                        <div className="mt-5 flex items-end justify-between gap-6">
                          <div>
                            <p className="eyebrow">{cat.productCount} objects</p>
                            <h2 className="mt-1 text-3xl md:text-4xl">{cat.name}</h2>
                            <p className="mt-2 max-w-md text-sm text-ink-muted">{cat.description}</p>
                          </div>
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-walnut/30 text-walnut transition-all group-hover:border-walnut group-hover:bg-walnut group-hover:text-ivory" aria-hidden>
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        </div>
                      </Link>
                    </Reveal>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
