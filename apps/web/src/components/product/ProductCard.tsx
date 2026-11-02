import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Heart, ShoppingBag } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import type { ProductCard as P } from '../../lib/types';
import { Img, Price, Skeleton } from '../ui';
import { QuickViewModal } from './QuickViewModal';
import { TiltCard } from '../fx';
import { useFromState } from '@/lib/navState';

export function StockNote({ product }: { product: Pick<P, 'stock' | 'stockStatus'> }) {
  if (product.stockStatus === 'out_of_stock') return <span className="text-xs text-danger">Sold out</span>;
  if (product.stockStatus === 'low_stock') return <span className="text-xs text-amber-800">{product.stock === 1 ? 'One of a kind — 1 available' : `Only ${product.stock} left`}</span>;
  return <span className="text-xs text-success">In stock</span>;
}

export function WishlistButton({ product, className = '' }: { product: Pick<P, 'id' | 'name'>; className?: string }) {
  const { isWishlisted, toggleWishlist } = useShop();
  const on = isWishlisted(product.id);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        void toggleWishlist(product);
      }}
      aria-pressed={on}
      aria-label={on ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
      className={`flex h-10 w-10 items-center justify-center bg-ivory/90 text-walnut shadow-sm transition-colors hover:text-gold-dark ${className}`}
    >
      <Heart className={`h-[18px] w-[18px] transition-transform ${on ? 'scale-110 fill-gold-dark text-gold-dark' : ''}`} />
    </button>
  );
}

export function ProductCard({ product, layout = 'grid', priority = false }: { product: P; layout?: 'grid' | 'list'; priority?: boolean }) {
  const { addToCart } = useShop();
  const from = useFromState();
  const [quick, setQuick] = useState(false);
  const [adding, setAdding] = useState(false);
  const soldOut = product.stockStatus === 'out_of_stock';

  const add = async () => {
    setAdding(true);
    await addToCart(product, 1, { openDrawer: false });
    setAdding(false);
  };

  const badges = (
    <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
      {product.discountPercent > 0 && <span className="bg-forest px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-ivory">−{product.discountPercent}%</span>}
      {soldOut && <span className="bg-walnut px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-ivory">Sold out</span>}
    </div>
  );

  if (layout === 'list') {
    return (
      <article className="group grid grid-cols-[120px_1fr] gap-5 border-b border-line py-6 sm:grid-cols-[180px_1fr_auto] sm:gap-8">
        <Link state={from} to={`/artifact/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-parchment">
          <Img src={product.image?.url} alt={product.image?.alt ?? product.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          {badges}
        </Link>
        <div className="min-w-0">
          <p className="eyebrow">{product.category.name}</p>
          <h3 className="mt-1.5 text-2xl leading-tight">
            <Link state={from} to={`/artifact/${product.slug}`} className="hover:text-gold-dark">
              {product.name}
            </Link>
          </h3>
          <p className="mt-1 text-xs text-ink-muted">
            {[product.period, product.origin].filter(Boolean).join(' · ')} · SKU {product.sku}
          </p>
          <p className="mt-3 line-clamp-2 max-w-xl text-sm text-ink-soft">{product.shortDescription}</p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <Price paise={product.pricePaise} compareAt={product.compareAtPaise} />
            <StockNote product={product} />
          </div>
        </div>
        <div className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:flex-col sm:items-stretch">
          <button onClick={add} disabled={soldOut || adding} className="btn-primary flex-1 sm:flex-none">
            <ShoppingBag className="h-4 w-4" /> {soldOut ? 'Sold out' : 'Add to bag'}
          </button>
          <button onClick={() => setQuick(true)} className="btn-outline flex-1 sm:flex-none">
            Quick view
          </button>
          <WishlistButton product={product} className="border border-line" />
        </div>
        <QuickViewModal slug={product.slug} open={quick} onClose={() => setQuick(false)} />
      </article>
    );
  }

  return (
    <article className="group relative flex flex-col">
      <TiltCard max={5}>
      <div className="relative aspect-[4/5] overflow-hidden bg-parchment shadow-card transition-shadow duration-500 group-hover:shadow-lift">
        <Link state={from} to={`/artifact/${product.slug}`} className="block h-full w-full" aria-label={product.name} tabIndex={-1}>
          <Img
            src={product.image?.url}
            alt={product.image?.alt ?? product.name}
            loading={priority ? 'eager' : 'lazy'}
            className="h-full w-full object-cover transition-transform [transition-duration:1200ms] ease-out group-hover:scale-[1.06]"
          />
          {product.hoverImage && (
            <Img src={product.hoverImage.url} alt="" aria-hidden className="!absolute inset-0 h-full w-full object-cover !opacity-0 transition-opacity duration-700 group-hover:!opacity-100" />
          )}
        </Link>
        {badges}
        <WishlistButton product={product} className="absolute right-3 top-3" />
        <div className="absolute inset-x-3 bottom-3 flex translate-y-0 gap-2 opacity-100 transition-all duration-500 md:translate-y-3 md:opacity-0 md:group-focus-within:translate-y-0 md:group-focus-within:opacity-100 md:group-hover:translate-y-0 md:group-hover:opacity-100">
          <button onClick={add} disabled={soldOut || adding} className="flex h-11 flex-1 items-center justify-center gap-2 bg-forest/95 text-[11px] font-medium uppercase tracking-[0.14em] text-ivory backdrop-blur transition-colors hover:bg-forest disabled:bg-walnut/80">
            <ShoppingBag className="h-4 w-4" aria-hidden /> {soldOut ? 'Sold out' : adding ? 'Adding…' : 'Add to bag'}
          </button>
          <button onClick={() => setQuick(true)} className="flex h-11 w-11 items-center justify-center bg-ivory/95 text-walnut backdrop-blur hover:text-gold-dark" aria-label={`Quick view ${product.name}`}>
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </div>
      </TiltCard>
      <div className="mt-4 flex flex-1 flex-col">
        <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">{product.category.name}</p>
        <h3 className="mt-1 font-serif text-xl leading-snug">
          <Link state={from} to={`/artifact/${product.slug}`} className="hover:text-gold-dark">
            {product.name}
          </Link>
        </h3>
        {product.period && <p className="mt-0.5 text-xs text-ink-muted">{product.period}{product.origin ? ` · ${product.origin}` : ''}</p>}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <Price paise={product.pricePaise} compareAt={product.compareAtPaise} />
          {product.stockStatus !== 'in_stock' && <StockNote product={product} />}
        </div>
      </div>
      <QuickViewModal slug={product.slug} open={quick} onClose={() => setQuick(false)} />
    </article>
  );
}

export function ProductCardSkeleton({ layout = 'grid' }: { layout?: 'grid' | 'list' }) {
  if (layout === 'list')
    return (
      <div className="grid grid-cols-[120px_1fr] gap-5 border-b border-line py-6 sm:grid-cols-[180px_1fr]">
        <Skeleton className="aspect-[4/5]" />
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    );
  return (
    <div>
      <Skeleton className="aspect-[4/5]" />
      <Skeleton className="mt-4 h-3 w-20" />
      <Skeleton className="mt-2 h-5 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/3" />
    </div>
  );
}
