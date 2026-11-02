import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingBag, Trash2, X } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { Img, QuantityStepper, formatINR } from '../ui';

export function CartDrawer() {
  const { cart, cartOpen, setCartOpen, updateQuantity, removeItem, store } = useShop();
  const location = useLocation();

  useEffect(() => setCartOpen(false), [location.pathname, setCartOpen]);
  useEffect(() => {
    if (!cartOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setCartOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [cartOpen, setCartOpen]);

  const threshold = store?.shipping.freeShippingThresholdPaise ?? 0;
  const subtotal = cart?.totals.subtotalPaise ?? 0;
  const remaining = Math.max(0, threshold - subtotal);

  return (
    <AnimatePresence>
      {cartOpen && (
        <motion.div className="fixed inset-0 z-[85]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-walnut-dark/50 backdrop-blur-[2px]" onClick={() => setCartOpen(false)} aria-hidden />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Shopping bag"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="glass absolute inset-y-0 right-0 flex w-full max-w-md flex-col !bg-ivory/80"
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <h2 className="text-2xl">Your Bag {cart?.itemCount ? <span className="text-base text-ink-muted">({cart.itemCount})</span> : null}</h2>
              <button className="flex h-10 w-10 items-center justify-center" onClick={() => setCartOpen(false)} aria-label="Close bag" autoFocus>
                <X className="h-5 w-5" />
              </button>
            </div>

            {!cart || cart.items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                <ShoppingBag className="mb-4 h-10 w-10 text-gold" aria-hidden />
                <p className="font-serif text-2xl text-walnut">Your bag is empty</p>
                <p className="mt-2 text-sm text-ink-muted">Every collection begins with a single object.</p>
                <Link to="/shop" className="btn-primary mt-6">Explore the collection</Link>
              </div>
            ) : (
              <>
                {threshold > 0 && (
                  <div className="border-b border-line bg-parchment/60 px-6 py-3 text-xs text-ink-soft">
                    {remaining > 0 ? (
                      <>Add <strong>{formatINR(remaining)}</strong> more for complimentary standard shipping.</>
                    ) : (
                      <>Your order qualifies for complimentary standard shipping.</>
                    )}
                    <div className="mt-2 h-1 bg-line">
                      <div className="h-full bg-gold transition-all duration-500" style={{ width: `${Math.min(100, (subtotal / threshold) * 100)}%` }} />
                    </div>
                  </div>
                )}
                <ul className="flex-1 divide-y divide-line overflow-y-auto px-6">
                  {cart.items.map((item) => (
                    <li key={item.id} className="flex gap-4 py-5">
                      <Link to={`/artifact/${item.product.slug}`} className="h-28 w-22 w-[88px] shrink-0 overflow-hidden bg-parchment">
                        <Img src={item.product.image?.url} alt={item.product.image?.alt ?? item.product.name} className="h-full w-full object-cover" />
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <p className="text-[11px] uppercase tracking-wider text-ink-muted">{item.product.category.name}</p>
                        <Link to={`/artifact/${item.product.slug}`} className="font-serif text-lg leading-tight text-walnut hover:text-gold-dark">
                          {item.product.name}
                        </Link>
                        <p className="mt-1 text-sm text-ink-soft">{formatINR(item.product.pricePaise)}</p>
                        <div className="mt-auto flex items-center justify-between pt-2">
                          <QuantityStepper value={item.quantity} max={item.maxQuantity} onChange={(n) => updateQuantity(item.id, n)} label={`Quantity for ${item.product.name}`} />
                          <button onClick={() => removeItem(item.id)} className="flex h-10 w-10 items-center justify-center text-ink-muted hover:text-danger" aria-label={`Remove ${item.product.name}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-line px-6 py-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm uppercase tracking-wider text-ink-soft">Subtotal</span>
                    <span className="font-serif text-2xl text-walnut">{formatINR(subtotal)}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">Shipping and discount codes are calculated in your bag and at checkout.</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Link to="/cart" className="btn-outline">View bag</Link>
                    <Link to="/checkout" className="btn-primary">Checkout</Link>
                  </div>
                </div>
              </>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
