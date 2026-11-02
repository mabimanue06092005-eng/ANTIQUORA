import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import type { ProductCard, ProductDetail } from '../../lib/types';
import { useShop } from '../../context/ShopContext';
import { ErrorState, Img, Modal, Price, QuantityStepper, Spinner } from '../ui';
import { StockNote, WishlistButton } from './ProductCard';

function QuickViewBody({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { data, error, loading, reload } = useAsync(() => api.get<{ product: ProductDetail; related: ProductCard[] }>(`/api/products/${slug}`), [slug]);
  const { addToCart } = useShop();
  const [qty, setQty] = useState(1);
  const [active, setActive] = useState(0);

  if (loading)
    return (
      <div className="flex h-80 items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  if (error || !data) return <div className="p-8"><ErrorState message={error?.message ?? 'Could not load this artifact.'} onRetry={reload} /></div>;
  const p = data.product;
  const soldOut = p.stockStatus === 'out_of_stock';
  const max = Math.min(p.stock, 10);

  return (
    <div className="grid md:grid-cols-2">
      <div className="bg-parchment">
        <div className="aspect-square overflow-hidden">
          <Img src={p.images[active]?.url} alt={p.images[active]?.alt ?? p.name} className="h-full w-full object-cover" />
        </div>
        {p.images.length > 1 && (
          <div className="flex gap-2 p-3">
            {p.images.map((img, i) => (
              <button key={img.id} onClick={() => setActive(i)} className={`h-14 w-14 overflow-hidden border ${i === active ? 'border-gold-dark' : 'border-transparent opacity-70'}`} aria-label={`Show image ${i + 1}`}>
                <Img src={img.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col p-6 md:p-8">
        <p className="eyebrow">{p.category.name}</p>
        <h2 id="qv-title" className="mt-2 text-3xl leading-tight">{p.name}</h2>
        <p className="mt-1 text-xs text-ink-muted">SKU {p.sku}{p.period ? ` · ${p.period}` : ''}</p>
        <Price paise={p.pricePaise} compareAt={p.compareAtPaise} size="lg" className="mt-4" />
        <div className="mt-2"><StockNote product={p} /></div>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">{p.shortDescription}</p>
        <div className="mt-6 flex items-center gap-3">
          {!soldOut && <QuantityStepper value={qty} max={max} onChange={setQty} />}
          <button
            className="btn-primary flex-1"
            disabled={soldOut}
            onClick={async () => {
              if (await addToCart(p, qty)) onClose();
            }}
          >
            {soldOut ? 'Sold out' : 'Add to bag'}
          </button>
          <WishlistButton product={p} className="border border-line" />
        </div>
        <Link to={`/artifact/${p.slug}`} onClick={onClose} className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-gold-dark hover:text-walnut">
          Full details, condition & provenance <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

export function QuickViewModal({ slug, open, onClose }: { slug: string; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} size="lg" labelledBy="qv-title">
      {open && <QuickViewBody slug={slug} onClose={onClose} />}
    </Modal>
  );
}
