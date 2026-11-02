import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Heart, LayoutDashboard, LogOut, Menu, Package, Search, ShoppingBag, User, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../lib/useAsync';
import { api } from '../../lib/api';
import type { Category } from '../../lib/types';
import { Logo } from './Logo';
import { useSearchPanel } from '../museum/SearchPanel';
import { chamberFor } from '../../lib/chambers';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/gallery', label: 'The Gallery' },
  { to: '/chambers', label: 'Chambers', mega: true },
  { to: '/our-story', label: 'Our Story' },
];

function CountBadge({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-walnut-dark" aria-hidden>
      {n > 99 ? '99+' : n}
    </span>
  );
}

export function Header() {
  const { user, logout } = useAuth();
  const { cart, wishlist, setCartOpen, store } = useShop();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { open: openSearch } = useSearchPanel();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const { data: categories } = useAsync(() => api.get<Category[]>('/api/categories'), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
    setMegaOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
  }, [mobileOpen]);

  const doLogout = async () => {
    // Leave protected pages first so route guards don't bounce to /login.
    navigate('/');
    await logout();
    toast('You have been signed out.', 'info');
  };

  const cartCount = cart?.itemCount ?? 0;
  const wishCount = wishlist?.productIds.length ?? 0;

  return (
    <>
      <div className="bg-forest text-ivory">
        <p className="container-site py-2 text-center text-[11px] uppercase tracking-[0.2em] text-ivory/85">
          {store?.store.announcement || 'Discover rare finds. Every object tells a story.'}
        </p>
      </div>

      <header className={`sticky top-0 z-50 border-b transition-all duration-300 ${scrolled ? 'border-white/50 bg-ivory/70 shadow-[0_8px_32px_-12px_rgba(36,25,18,0.35)] backdrop-blur-xl backdrop-saturate-150' : 'border-transparent bg-ivory/90 backdrop-blur-md'}`}>
        <div className="container-site flex h-16 items-center justify-between gap-2 sm:gap-4 md:h-20">
          <button className="-ml-2 flex h-11 w-10 shrink-0 items-center justify-center text-walnut lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu" aria-expanded={mobileOpen}>
            <Menu className="h-6 w-6" />
          </button>

          <Logo className="lg:mr-8" />

          <nav aria-label="Primary" className="hidden flex-1 lg:block">
            <ul className="flex items-center gap-8">
              {NAV.map((n) =>
                n.mega ? (
                  <li key={n.to} className="relative" onMouseEnter={() => setMegaOpen(true)} onMouseLeave={() => setMegaOpen(false)}>
                    <NavLink
                      to={n.to}
                      className={({ isActive }) => `flex items-center gap-1 py-6 text-[13px] uppercase tracking-[0.14em] transition-colors hover:text-gold-dark ${isActive ? 'text-gold-dark' : 'text-walnut'}`}
                      aria-haspopup="true"
                      aria-expanded={megaOpen}
                      onFocus={() => setMegaOpen(true)}
                    >
                      {n.label} <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                    </NavLink>
                    <AnimatePresence>
                      {megaOpen && categories && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          transition={{ duration: 0.2 }}
                          className="glass absolute left-1/2 top-full w-[620px] -translate-x-1/2 p-6"
                          onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setMegaOpen(false)}
                        >
                          <ul className="grid grid-cols-2 gap-x-6 gap-y-1">
                            {categories.map((c) => (
                              <li key={c.id}>
                                <Link to={`/chambers/${c.slug}`} className="group flex items-center gap-3 py-2.5">
                                  <span className="w-7 font-serif text-sm text-gold-dark">{chamberFor(c.slug).numeral}</span>
                                  <span className="flex-1">
                                    <span className="block font-serif text-lg leading-tight text-walnut group-hover:text-gold-dark">{chamberFor(c.slug).title}</span>
                                    <span className="text-xs text-ink-muted">{c.name} · {c.productCount}</span>
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                          <Link to="/gallery" className="mt-4 inline-block border-t border-walnut/15 pt-4 text-xs uppercase tracking-[0.14em] text-gold-dark hover:text-walnut">
                            Walk the whole gallery →
                          </Link>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                ) : (
                  <li key={n.to}>
                    <NavLink to={n.to} end={n.end} className={({ isActive }) => `link-underline text-[13px] uppercase tracking-[0.14em] transition-colors hover:text-gold-dark ${isActive ? 'text-gold-dark' : 'text-walnut'}`}>
                      {n.label}
                    </NavLink>
                  </li>
                ),
              )}
            </ul>
          </nav>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <button className="flex h-11 w-10 items-center justify-center text-walnut transition-colors hover:text-gold-dark sm:w-11 xl:hidden" onClick={openSearch} aria-label="Search the collection">
              <Search className="h-5 w-5" />
            </button>
            <button
              onClick={openSearch}
              aria-label="Search the collection"
              aria-keyshortcuts="Control+K Meta+K"
              className="mr-1 hidden h-10 w-56 items-center gap-2.5 border border-line bg-white/50 px-3 text-left text-sm text-ink-muted transition-all hover:border-gold hover:bg-white hover:shadow-card xl:flex"
            >
              <Search className="h-4 w-4 text-gold-dark" aria-hidden />
              <span className="flex-1 truncate whitespace-nowrap">Search artifacts…</span>
              <kbd className="border border-line bg-parchment px-1.5 py-0.5 font-mono text-[10px] text-ink-soft">Ctrl K</kbd>
            </button>

            <div className="relative hidden sm:block" ref={accountRef}>
              <button
                className="flex h-11 items-center gap-1.5 px-2 text-walnut transition-colors hover:text-gold-dark"
                onClick={() => (user ? setAccountOpen((o) => !o) : navigate('/login', { state: { from: location.pathname } }))}
                aria-label={user ? 'Account menu' : 'Sign in'}
                aria-expanded={user ? accountOpen : undefined}
                aria-haspopup={user ? 'menu' : undefined}
              >
                <User className="h-5 w-5" />
                <span className="hidden max-w-[110px] truncate text-[13px] xl:inline">{user ? user.name.split(' ')[0] : 'Sign in'}</span>
              </button>
              <AnimatePresence>
                {accountOpen && user && (
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="glass absolute right-0 top-full mt-2 w-60 py-2"
                  >
                    <p className="border-b border-line px-4 pb-2 pt-1 text-xs text-ink-muted">
                      Signed in as
                      <span className="block truncate text-sm text-walnut">{user.email}</span>
                    </p>
                    <Link role="menuitem" to="/account" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-parchment">
                      <User className="h-4 w-4" /> My account
                    </Link>
                    <Link role="menuitem" to="/account/orders" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-parchment">
                      <Package className="h-4 w-4" /> Orders
                    </Link>
                    {user.role === 'ADMIN' && (
                      <Link role="menuitem" to="/admin" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-parchment">
                        <LayoutDashboard className="h-4 w-4" /> Admin dashboard
                      </Link>
                    )}
                    <button role="menuitem" onClick={doLogout} className="flex w-full items-center gap-2.5 border-t border-line px-4 py-2.5 text-left text-sm hover:bg-parchment">
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link to="/wishlist" className="relative flex h-11 w-10 items-center justify-center text-walnut transition-colors hover:text-gold-dark sm:w-11" aria-label={`Wishlist, ${wishCount} item${wishCount === 1 ? '' : 's'}`}>
              <Heart className="h-5 w-5" />
              <CountBadge n={wishCount} />
            </Link>
            <button onClick={() => setCartOpen(true)} className="relative flex h-11 w-10 items-center justify-center text-walnut transition-colors hover:text-gold-dark sm:w-11" aria-label={`Shopping bag, ${cartCount} item${cartCount === 1 ? '' : 's'}`}>
              <ShoppingBag className="h-5 w-5" />
              <CountBadge n={cartCount} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile navigation drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div className="fixed inset-0 z-[85] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-walnut-dark/60" onClick={() => setMobileOpen(false)} aria-hidden />
            <motion.nav
              aria-label="Mobile"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col overflow-y-auto bg-ivory"
            >
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <Logo />
                <button className="flex h-11 w-11 items-center justify-center" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <ul className="px-5 py-4">
                {NAV.map((n) => (
                  <li key={n.to}>
                    <NavLink to={n.to} end={n.end} className={({ isActive }) => `block border-b border-line/60 py-4 font-serif text-2xl ${isActive ? 'text-gold-dark' : 'text-walnut'}`}>
                      {n.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
              {categories && (
                <div className="px-5">
                  <p className="eyebrow mb-2">Collector's chambers</p>
                  <ul>
                    {categories.map((c) => (
                      <li key={c.id}>
                        <Link to={`/chambers/${c.slug}`} className="block py-2 text-ink-soft hover:text-walnut">
                          {chamberFor(c.slug).title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-auto space-y-2 border-t border-line p-5">
                {user ? (
                  <>
                    <Link to="/account" className="btn-outline w-full">My account</Link>
                    {user.role === 'ADMIN' && <Link to="/admin" className="btn-outline w-full">Admin dashboard</Link>}
                    <button onClick={doLogout} className="btn-ghost w-full">Sign out</button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="btn-primary w-full">Sign in</Link>
                    <Link to="/register" className="btn-outline w-full">Create account</Link>
                  </>
                )}
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}
