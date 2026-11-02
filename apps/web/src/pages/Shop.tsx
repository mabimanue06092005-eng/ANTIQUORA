import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutGrid, List, Search, SlidersHorizontal, X } from 'lucide-react';
import { api, qs } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useSeo } from '../lib/seo';
import type { Category, ProductCard as PC } from '../lib/types';
import { ProductCard, ProductCardSkeleton } from '../components/product/ProductCard';
import { EmptyState, ErrorState, PageHeader, Pagination } from '../components/ui';
import { PriceRange } from '../components/PriceRange';
import { ViewToggle } from '@/components/museum/SearchPanel';
import { rememberFilters } from '@/lib/navState';

const PRICE_MAX = 700000;

const SORTS = [
  ['featured', 'Featured'],
  ['newest', 'Newest'],
  ['popular', 'Most popular'],
  ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'],
] as const;

const PRICE_PRESETS: [string, string, string][] = [
  ['Under ₹25,000', '', '25000'],
  ['₹25,000 – ₹1,00,000', '25000', '100000'],
  ['₹1,00,000 – ₹3,00,000', '100000', '300000'],
  ['Above ₹3,00,000', '300000', ''],
];

const PAGE_SIZE = 12;

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { data: categories } = useAsync(() => api.get<Category[]>('/api/categories'), []);

  const q = params.get('q') ?? '';
  const selectedCats = (params.get('category') ?? '').split(',').filter(Boolean);
  const minPrice = params.get('minPrice') ?? '';
  const maxPrice = params.get('maxPrice') ?? '';
  const sort = params.get('sort') ?? 'featured';
  const featured = params.get('featured') === 'true';
  const onSale = params.get('onSale') === 'true';
  const inStock = params.get('inStock') === 'true';
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);
  const view = params.get('view') === 'list' ? 'list' : 'grid';

  const [searchInput, setSearchInput] = useState(q);
  const [priceDraft, setPriceDraft] = useState({ min: minPrice, max: maxPrice });
  const [priceError, setPriceError] = useState('');
  useEffect(() => setSearchInput(q), [q]);
  useEffect(() => setPriceDraft({ min: minPrice, max: maxPrice }), [minPrice, maxPrice]);

  const apiQuery = qs({
    q,
    category: selectedCats.join(','),
    minPrice,
    maxPrice,
    sort,
    featured: featured || undefined,
    onSale: onSale || undefined,
    inStock: inStock || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const { data, error, loading, reload } = useAsync(() => api.page<PC[]>(`/api/products${apiQuery}`), [apiQuery]);

  const update = (changes: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    if (resetPage) next.delete('page');
    setParams(next);
  };

  const toggleCat = (slug: string) => {
    const set = new Set(selectedCats);
    if (set.has(slug)) set.delete(slug);
    else set.add(slug);
    update({ category: [...set].join(',') || null });
  };

  const applyPrice = (e?: FormEvent) => {
    e?.preventDefault();
    const min = priceDraft.min.trim();
    const max = priceDraft.max.trim();
    if ((min && (isNaN(+min) || +min < 0)) || (max && (isNaN(+max) || +max < 0))) return setPriceError('Enter a valid amount in rupees.');
    if (min && max && +min > +max) return setPriceError('Minimum price cannot exceed maximum.');
    setPriceError('');
    update({ minPrice: min || null, maxPrice: max || null });
  };

  const catName = (slug: string) => categories?.find((c) => c.slug === slug)?.name ?? slug;
  const chips = useMemo(() => {
    const c: { label: string; clear: Record<string, string | null> }[] = [];
    if (q) c.push({ label: `“${q}”`, clear: { q: null } });
    selectedCats.forEach((s) => c.push({ label: catName(s), clear: { category: selectedCats.filter((x) => x !== s).join(',') || null } }));
    if (minPrice || maxPrice) c.push({ label: `₹${minPrice ? Number(minPrice).toLocaleString('en-IN') : '0'} – ${maxPrice ? `₹${Number(maxPrice).toLocaleString('en-IN')}` : 'any'}`, clear: { minPrice: null, maxPrice: null } });
    if (featured) c.push({ label: 'Featured', clear: { featured: null } });
    if (onSale) c.push({ label: 'On sale', clear: { onSale: null } });
    if (inStock) c.push({ label: 'In stock', clear: { inStock: null } });
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, categories]);

  const clearAll = () => setParams(view === 'list' ? { view: 'list' } : {});

  // Shared with the immersive gallery and the floating search panel.
  useEffect(() => rememberFilters(`?${params}`), [params]);

  const singleCat = selectedCats.length === 1 ? categories?.find((c) => c.slug === selectedCats[0]) : undefined;
  useSeo({
    title: singleCat ? singleCat.name : q ? `Search: ${q}` : 'Shop All Artifacts',
    description: singleCat?.description ?? 'Browse the full ANTIQUORA collection of coins, sculpture, furniture, ceramics, manuscripts and decorative collectibles.',
  });

  const total = data?.meta?.total ?? 0;

  const filterPanel = (
    <div className="space-y-8">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: searchInput.trim() || null });
        }}
      >
        <label htmlFor="shop-search" className="field-label">Search</label>
        <div className="relative">
          <input id="shop-search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Name, description or SKU" className="field-input pr-10" />
          <button type="submit" className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-ink-muted hover:text-walnut" aria-label="Search">
            <Search className="h-4 w-4" />
          </button>
        </div>
      </form>

      <fieldset>
        <legend className="field-label">Category</legend>
        <ul className="mt-2 space-y-1">
          {categories?.map((c) => (
            <li key={c.id}>
              <label className="flex cursor-pointer items-center justify-between py-1.5 text-sm text-ink-soft hover:text-walnut">
                <span className="flex items-center gap-2.5">
                  <input type="checkbox" className="h-4 w-4 accent-forest" checked={selectedCats.includes(c.slug)} onChange={() => toggleCat(c.slug)} />
                  {c.name}
                </span>
                <span className="text-xs text-ink-muted">{c.productCount}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="field-label">Price (₹)</legend>
        <div className="mb-3 mt-2">
          <PriceRange
            min={0}
            max={PRICE_MAX}
            step={5000}
            value={[Number(minPrice) || 0, Number(maxPrice) || PRICE_MAX]}
            onCommit={([lo, hi]) => update({ minPrice: lo > 0 ? String(lo) : null, maxPrice: hi < PRICE_MAX ? String(hi) : null })}
          />
        </div>
        <form onSubmit={applyPrice} className="mt-2" noValidate>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="min-price">Minimum price in rupees</label>
            <input id="min-price" inputMode="numeric" placeholder="Min" value={priceDraft.min} onChange={(e) => setPriceDraft((d) => ({ ...d, min: e.target.value.replace(/[^\d]/g, '') }))} className="field-input" aria-invalid={!!priceError} />
            <span className="text-ink-muted">–</span>
            <label className="sr-only" htmlFor="max-price">Maximum price in rupees</label>
            <input id="max-price" inputMode="numeric" placeholder="Max" value={priceDraft.max} onChange={(e) => setPriceDraft((d) => ({ ...d, max: e.target.value.replace(/[^\d]/g, '') }))} className="field-input" aria-invalid={!!priceError} />
          </div>
          {priceError && <p className="field-error" role="alert">{priceError}</p>}
          <button type="submit" className="btn-outline mt-3 w-full">Apply price</button>
        </form>
        <ul className="mt-3 space-y-1">
          {PRICE_PRESETS.map(([label, min, max]) => {
            const active = minPrice === min && maxPrice === max;
            return (
              <li key={label}>
                <button onClick={() => update(active ? { minPrice: null, maxPrice: null } : { minPrice: min || null, maxPrice: max || null })} className={`py-1 text-left text-sm ${active ? 'font-medium text-gold-dark' : 'text-ink-soft hover:text-walnut'}`} aria-pressed={active}>
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="field-label">Refine</legend>
        <div className="mt-2 space-y-2.5">
          {[
            ['featured', 'Featured artifacts', featured],
            ['onSale', 'On sale', onSale],
            ['inStock', 'In stock only', inStock],
          ].map(([key, label, on]) => (
            <label key={key as string} className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft hover:text-walnut">
              <input type="checkbox" className="h-4 w-4 accent-forest" checked={on as boolean} onChange={() => update({ [key as string]: on ? null : 'true' })} />
              {label as string}
            </label>
          ))}
        </div>
      </fieldset>

      {chips.length > 0 && (
        <button onClick={clearAll} className="btn-ghost w-full border border-line">Clear all filters</button>
      )}
    </div>
  );

  return (
    <>
      <PageHeader
        eyebrow="The collection"
        title={singleCat ? singleCat.name : q ? `Results for “${q}”` : 'Shop All Artifacts'}
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Shop', to: singleCat ? '/shop' : undefined }, ...(singleCat ? [{ label: singleCat.name }] : [])]}
      >
        {singleCat?.description ?? 'Every object is described with care. Use the filters to narrow by field, price and availability.'}
      </PageHeader>

      <div className="container-site grid gap-10 py-10 lg:grid-cols-[260px_1fr] lg:py-14">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-28">{filterPanel}</div>
        </aside>

        <section aria-label="Products">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <p className="text-sm text-ink-muted" role="status" aria-live="polite">
              {loading ? 'Loading…' : `${total} ${total === 1 ? 'artifact' : 'artifacts'}`}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <ViewToggle current="shop" />
              <button onClick={() => setFiltersOpen(true)} className="btn-outline h-11 px-4 lg:hidden">
                <SlidersHorizontal className="h-4 w-4" /> Filters {chips.length > 0 && `(${chips.length})`}
              </button>
              <label htmlFor="sort" className="sr-only">Sort by</label>
              <select id="sort" value={sort} onChange={(e) => update({ sort: e.target.value === 'featured' ? null : e.target.value })} className="field-input h-11 w-auto min-w-[170px] py-0 text-sm">
                {SORTS.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <div className="hidden border border-line sm:flex" role="group" aria-label="Display mode">
                <button onClick={() => update({ view: null }, false)} aria-pressed={view === 'grid'} className={`flex h-11 w-11 items-center justify-center ${view === 'grid' ? 'bg-walnut text-ivory' : 'text-walnut hover:bg-parchment'}`} aria-label="Grid view">
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button onClick={() => update({ view: 'list' }, false)} aria-pressed={view === 'list'} className={`flex h-11 w-11 items-center justify-center ${view === 'list' ? 'bg-walnut text-ivory' : 'text-walnut hover:bg-parchment'}`} aria-label="List view">
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {chips.length > 0 && (
            <ul className="mb-6 flex flex-wrap items-center gap-2" aria-label="Active filters">
              {chips.map((c) => (
                <li key={c.label}>
                  <button onClick={() => update(c.clear)} className="inline-flex items-center gap-1.5 border border-gold/50 bg-parchment/70 px-3 py-1.5 text-xs text-walnut hover:border-walnut" aria-label={`Remove filter ${c.label}`}>
                    {c.label} <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
              <li>
                <button onClick={clearAll} className="px-2 text-xs uppercase tracking-wider text-gold-dark underline-offset-4 hover:underline">
                  Clear all
                </button>
              </li>
            </ul>
          )}

          {error ? (
            <ErrorState message={error.message} onRetry={reload} />
          ) : loading ? (
            <div className={view === 'grid' ? 'grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 xl:grid-cols-3' : ''}>
              {Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} layout={view} />)}
            </div>
          ) : data && data.data.length === 0 ? (
            <EmptyState icon={<Search className="h-6 w-6" />} title="Nothing matches — yet" action={<button onClick={clearAll} className="btn-primary">Clear all filters</button>}>
              Try removing a filter or searching for a broader term such as “coin”, “marble” or “print”.
            </EmptyState>
          ) : (
            <>
              <div className={view === 'grid' ? 'grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 xl:grid-cols-3' : ''}>
                {data?.data.map((p, i) => <ProductCard key={p.id} product={p} layout={view} priority={i < 3} />)}
              </div>
              <Pagination
                page={page}
                totalPages={data?.meta?.totalPages ?? 1}
                onChange={(p) => {
                  update({ page: p === 1 ? null : String(p) }, false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </>
          )}
        </section>
      </div>

      <AnimatePresence>
        {filtersOpen && (
          <motion.div className="fixed inset-0 z-[85] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-walnut-dark/60" onClick={() => setFiltersOpen(false)} aria-hidden />
            <motion.div role="dialog" aria-modal="true" aria-label="Filters" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.35 }} className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col bg-ivory">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <h2 className="text-2xl">Filters</h2>
                <button onClick={() => setFiltersOpen(false)} className="flex h-11 w-11 items-center justify-center" aria-label="Close filters">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">{filterPanel}</div>
              <div className="border-t border-line p-4">
                <button onClick={() => setFiltersOpen(false)} className="btn-primary w-full">Show {total} results</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
