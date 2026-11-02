import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError } from '../lib/api';
import type { Cart, ProductCard, StoreInfo, Wishlist } from '../lib/types';
import { authEvents } from './AuthContext';
import { useToast } from './ToastContext';

interface ShopState {
  cart: Cart | null;
  wishlist: Wishlist | null;
  store: StoreInfo | null;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  setCart: (c: Cart) => void;
  setWishlist: (w: Wishlist) => void;
  refreshCart: () => Promise<void>;
  addToCart: (product: Pick<ProductCard, 'id' | 'name'>, quantity?: number, opts?: { openDrawer?: boolean }) => Promise<boolean>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  toggleWishlist: (product: Pick<ProductCard, 'id' | 'name'>) => Promise<void>;
  isWishlisted: (productId: string) => boolean;
  moveToCart: (productId: string) => Promise<void>;
  recentlyViewed: string[];
  trackViewed: (productId: string) => void;
}

const ShopCtx = createContext<ShopState | null>(null);
const RECENT_KEY = 'aq_recently_viewed';

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [cart, setCart] = useState<Cart | null>(null);
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [recentlyViewed, setRecent] = useState<string[]>(readRecent);

  const refreshCart = useCallback(async () => {
    try {
      setCart(await api.get<Cart>('/api/cart'));
    } catch {
      /* non-fatal: cart badge just stays empty */
    }
  }, []);
  const refreshWishlist = useCallback(async () => {
    try {
      setWishlist(await api.get<Wishlist>('/api/wishlist'));
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    void refreshCart();
    void refreshWishlist();
    api.get<StoreInfo>('/api/store').then(setStore).catch(() => undefined);
    const onAuth = () => {
      void refreshCart();
      void refreshWishlist();
    };
    authEvents.addEventListener('change', onAuth);
    return () => authEvents.removeEventListener('change', onAuth);
  }, [refreshCart, refreshWishlist]);

  const addToCart: ShopState['addToCart'] = async (product, quantity = 1, opts = { openDrawer: true }) => {
    try {
      setCart(await api.post<Cart>('/api/cart/items', { productId: product.id, quantity }));
      if (opts.openDrawer) setCartOpen(true);
      else toast(`"${product.name}" added to your bag.`);
      return true;
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not add to bag.', 'error');
      return false;
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      setCart(await api.patch<Cart>(`/api/cart/items/${itemId}`, { quantity }));
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not update quantity.', 'error');
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      setCart(await api.del<Cart>(`/api/cart/items/${itemId}`));
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not remove item.', 'error');
    }
  };

  const isWishlisted = (id: string) => !!wishlist?.productIds.includes(id);

  const toggleWishlist = async (product: Pick<ProductCard, 'id' | 'name'>) => {
    try {
      if (isWishlisted(product.id)) {
        setWishlist(await api.del<Wishlist>(`/api/wishlist/items/${product.id}`));
        toast(`Removed "${product.name}" from your wishlist.`, 'info');
      } else {
        setWishlist(await api.post<Wishlist>('/api/wishlist/items', { productId: product.id }));
        toast(`Saved "${product.name}" to your wishlist.`);
      }
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not update wishlist.', 'error');
    }
  };

  const moveToCart = async (productId: string) => {
    try {
      const res = await api.post<{ wishlist: Wishlist; cart: Cart }>(`/api/wishlist/items/${productId}/move-to-cart`);
      setWishlist(res.wishlist);
      setCart(res.cart);
      toast('Moved to your bag.');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not move item.', 'error');
    }
  };

  const trackViewed = useCallback((id: string) => {
    setRecent((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, 12);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  return (
    <ShopCtx.Provider
      value={{
        cart, wishlist, store, cartOpen, setCartOpen, setCart, setWishlist, refreshCart,
        addToCart, updateQuantity, removeItem, toggleWishlist, isWishlisted, moveToCart, recentlyViewed, trackViewed,
      }}
    >
      {children}
    </ShopCtx.Provider>
  );
}

export function useShop() {
  const ctx = useContext(ShopCtx);
  if (!ctx) throw new Error('useShop must be used inside ShopProvider');
  return ctx;
}
