import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { useSeo } from '../lib/seo';
import { useShop } from '../context/ShopContext';
import { useAuth } from '../context/AuthContext';
import { EmptyState, Img, Notice, PageHeader, Price } from '../components/ui';
import { StockNote } from '../components/product/ProductCard';
import { formatDate } from '../lib/format';

export function WishlistItems() {
  const { wishlist, moveToCart, toggleWishlist } = useShop();
  if (!wishlist) return null;
  if (wishlist.items.length === 0)
    return (
      <EmptyState icon={<Heart className="h-6 w-6" />} title="Your wishlist is empty" action={<Link to="/shop" className="btn-primary">Discover artifacts</Link>}>
        Tap the heart on any object to keep it here while you decide.
      </EmptyState>
    );
  return (
    <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {wishlist.items.map(({ id, product: p, addedAt }) => (
        <li key={id} className="flex flex-col">
          <Link to={`/artifact/${p.slug}`} className="group block aspect-[4/5] overflow-hidden bg-parchment">
            <Img src={p.image?.url} alt={p.image?.alt ?? p.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          </Link>
          <p className="mt-4 text-[11px] uppercase tracking-wider text-ink-muted">{p.category.name}</p>
          <Link to={`/artifact/${p.slug}`} className="font-serif text-xl text-walnut hover:text-gold-dark">{p.name}</Link>
          <div className="mt-1 flex items-center justify-between">
            <Price paise={p.pricePaise} compareAt={p.compareAtPaise} />
            <StockNote product={p} />
          </div>
          <p className="mt-1 text-xs text-ink-muted">Saved {formatDate(addedAt)}</p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => moveToCart(p.id)} disabled={p.stock <= 0} className="btn-primary flex-1">
              <ShoppingBag className="h-4 w-4" /> {p.stock <= 0 ? 'Sold out' : 'Move to bag'}
            </button>
            <button onClick={() => toggleWishlist(p)} className="flex h-11 w-11 items-center justify-center border border-line text-ink-muted hover:text-danger" aria-label={`Remove ${p.name} from wishlist`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Wishlist() {
  useSeo({ title: 'Wishlist', noindex: true });
  const { user } = useAuth();
  return (
    <>
      <PageHeader title="Wishlist" crumbs={[{ label: 'Home', to: '/' }, { label: 'Wishlist' }]}>
        Objects you are considering. Saved items are not reserved.
      </PageHeader>
      <div className="container-site py-12">
        {!user && (
          <Notice className="mb-8">
            Your wishlist is saved in this browser. <Link to="/login" className="font-medium underline">Sign in</Link> or <Link to="/register" className="font-medium underline">create an account</Link> to keep it across devices — we’ll merge it automatically.
          </Notice>
        )}
        <WishlistItems />
      </div>
    </>
  );
}
