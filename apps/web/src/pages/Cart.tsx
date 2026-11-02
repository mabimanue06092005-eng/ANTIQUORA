import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Tag, Trash2, X } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useSeo } from '../lib/seo';
import type { Cart as CartT, ProductCard as PC } from '../lib/types';
import { useShop } from '../context/ShopContext';
import { useToast } from '../context/ToastContext';
import { OrderTotals } from '../components/OrderTotals';
import { ProductCard } from '../components/product/ProductCard';
import { ConfirmDialog, EmptyState, Img, Notice, PageHeader, QuantityStepper, SectionHeading, formatINR } from '../components/ui';

function Recommendations() {
  const { data } = useAsync(() => api.get<PC[]>('/api/products?sort=popular&pageSize=4&inStock=true'), []);
  if (!data?.length) return null;
  return (
    <section className="container-site pb-20" aria-labelledby="rec-heading">
      <SectionHeading eyebrow="Begin your collection" title={<span id="rec-heading">Collector Favourites</span>} />
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 lg:grid-cols-4">
        {data.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}

export default function Cart() {
  useSeo({ title: 'Your Bag', noindex: true });
  const { cart, setCart, updateQuantity, removeItem, store } = useShop();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [applying, setApplying] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const applyCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return setCodeError('Enter a discount code.');
    setApplying(true);
    setCodeError('');
    try {
      setCart(await api.post<CartT>('/api/cart/coupon', { code }));
      toast('Discount code applied.');
      setCode('');
    } catch (err) {
      setCodeError(err instanceof ApiError ? err.message : 'Could not apply code.');
    } finally {
      setApplying(false);
    }
  };

  const removeCode = async () => setCart(await api.del<CartT>('/api/cart/coupon'));
  const clear = async () => {
    setCart(await api.del<CartT>('/api/cart'));
    setConfirmClear(false);
    toast('Your bag has been cleared.', 'info');
  };

  if (!cart) return <PageHeader title="Your Bag" />;

  if (cart.items.length === 0)
    return (
      <>
        <PageHeader title="Your Bag" crumbs={[{ label: 'Home', to: '/' }, { label: 'Bag' }]} />
        <EmptyState icon={<ShoppingBag className="h-6 w-6" />} title="Your bag is empty" action={<Link to="/shop" className="btn-primary">Explore the collection</Link>}>
          Every great collection begins with a single object. Here are a few that collectors love.
        </EmptyState>
        <Recommendations />
      </>
    );

  const threshold = store?.shipping.freeShippingThresholdPaise ?? 0;
  const remaining = Math.max(0, threshold - (cart.totals.subtotalPaise - cart.totals.discountPaise));

  return (
    <>
      <PageHeader title="Your Bag" crumbs={[{ label: 'Home', to: '/' }, { label: 'Bag' }]}>
        {cart.itemCount} {cart.itemCount === 1 ? 'object' : 'objects'} reserved for this session — availability is confirmed at checkout.
      </PageHeader>
      <div className="container-site grid gap-12 py-12 lg:grid-cols-[1fr_380px]">
        <section aria-label="Items in your bag">
          {cart.warnings.length > 0 && (
            <Notice tone="warn" className="mb-6">
              <ul className="space-y-1">{cart.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            </Notice>
          )}
          <div className="hidden grid-cols-[1fr_140px_120px_40px] gap-4 border-b border-line pb-3 text-[11px] uppercase tracking-[0.14em] text-ink-muted md:grid">
            <span>Artifact</span>
            <span>Quantity</span>
            <span className="text-right">Total</span>
            <span />
          </div>
          <ul className="divide-y divide-line">
            {cart.items.map((item) => (
              <li key={item.id} className="grid grid-cols-[88px_1fr] gap-4 py-6 md:grid-cols-[1fr_140px_120px_40px] md:items-center">
                <div className="flex gap-5 md:col-span-1">
                  <Link to={`/artifact/${item.product.slug}`} className="h-28 w-[88px] shrink-0 overflow-hidden bg-parchment">
                    <Img src={item.product.image?.url} alt={item.product.image?.alt ?? item.product.name} className="h-full w-full object-cover" />
                  </Link>
                  <div className="hidden min-w-0 md:block">
                    <p className="text-[11px] uppercase tracking-wider text-ink-muted">{item.product.category.name}</p>
                    <Link to={`/artifact/${item.product.slug}`} className="font-serif text-xl text-walnut hover:text-gold-dark">{item.product.name}</Link>
                    <p className="mt-1 text-sm text-ink-muted">{formatINR(item.product.pricePaise)} · SKU {item.product.sku}</p>
                  </div>
                </div>
                <div className="min-w-0 md:contents">
                  <div className="md:hidden">
                    <p className="text-[11px] uppercase tracking-wider text-ink-muted">{item.product.category.name}</p>
                    <Link to={`/artifact/${item.product.slug}`} className="font-serif text-lg text-walnut">{item.product.name}</Link>
                    <p className="text-sm text-ink-muted">{formatINR(item.product.pricePaise)}</p>
                  </div>
                  <div className="mt-3 md:mt-0">
                    <QuantityStepper value={item.quantity} max={item.maxQuantity} onChange={(n) => updateQuantity(item.id, n)} label={`Quantity for ${item.product.name}`} />
                    {item.quantity >= item.maxQuantity && <p className="mt-1 text-[11px] text-ink-muted">Max available</p>}
                  </div>
                  <p className="mt-2 font-medium tabular-nums text-walnut md:mt-0 md:text-right">{formatINR(item.lineTotalPaise)}</p>
                  <button onClick={() => removeItem(item.id)} className="mt-2 flex h-10 w-10 items-center justify-center text-ink-muted hover:text-danger md:mt-0" aria-label={`Remove ${item.product.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap justify-between gap-3">
            <Link to="/shop" className="btn-ghost px-0">← Continue browsing</Link>
            <button onClick={() => setConfirmClear(true)} className="btn-ghost px-0 text-ink-muted hover:text-danger">Clear bag</button>
          </div>
        </section>

        <aside className="lg:sticky lg:top-28 lg:self-start" aria-label="Order summary">
          <div className="card p-6">
            <h2 className="mb-5 text-2xl">Order Summary</h2>
            {remaining > 0 && threshold > 0 && (
              <p className="mb-4 bg-parchment/80 px-3 py-2 text-xs text-ink-soft">
                Add <strong>{formatINR(remaining)}</strong> more for complimentary standard shipping.
              </p>
            )}
            <OrderTotals totals={cart.totals} deliveryLabel="standard" />

            <div className="mt-6 border-t border-line pt-5">
              {cart.totals.couponCode ? (
                <div className="flex items-center justify-between bg-emerald-50 px-3 py-2 text-sm text-success">
                  <span className="flex items-center gap-2"><Tag className="h-4 w-4" /> {cart.totals.couponCode} applied</span>
                  <button onClick={removeCode} className="flex h-8 w-8 items-center justify-center" aria-label="Remove discount code"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <form onSubmit={applyCode} noValidate>
                  <label htmlFor="coupon" className="field-label">Discount code</label>
                  <div className="flex gap-2">
                    <input id="coupon" value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setCodeError(''); }} className="field-input uppercase" placeholder="e.g. WELCOME10" aria-invalid={!!codeError} aria-describedby={codeError ? 'coupon-err' : 'coupon-hint'} />
                    <button type="submit" className="btn-outline px-4" disabled={applying}>Apply</button>
                  </div>
                  {codeError ? <p id="coupon-err" className="field-error" role="alert">{codeError}</p> : <p id="coupon-hint" className="mt-1.5 text-xs text-ink-muted">Demo codes: WELCOME10, HERITAGE2000, COLLECTOR15</p>}
                </form>
              )}
            </div>

            <Link to="/checkout" className="btn-primary mt-6 w-full">
              Proceed to checkout <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-4 text-xs leading-relaxed text-ink-muted">
              <strong className="font-medium">Shipping rule (demo):</strong> standard insured shipping {store ? formatINR(store.shipping.standardPaise) : ''}, free when your discounted subtotal reaches {store ? formatINR(threshold) : ''}. Express delivery {store ? formatINR(store.shipping.expressPaise) : ''} — choose at checkout.
            </p>
          </div>
        </aside>
      </div>
      <ConfirmDialog open={confirmClear} title="Clear your bag?" message="All items and any applied discount code will be removed." confirmLabel="Clear bag" onConfirm={clear} onClose={() => setConfirmClear(false)} />
    </>
  );
}
