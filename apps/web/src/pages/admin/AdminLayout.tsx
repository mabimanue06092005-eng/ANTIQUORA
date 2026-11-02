import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft, FolderTree, History, LayoutDashboard, Mail, Menu, MessageSquare, Package, Settings, ShoppingCart, Tag, Users, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSeo } from '../../lib/seo';
import { Emblem } from '../../components/layout/Logo';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/coupons', label: 'Discounts', icon: Tag },
  { to: '/admin/newsletter', label: 'Newsletter', icon: Mail },
  { to: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: '/admin/audit-log', label: 'Audit log', icon: History },
];

export function AdminLayout() {
  useSeo({ title: 'Admin', noindex: true });
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  const nav = (
    <nav aria-label="Admin" className="flex h-full flex-col">
      <Link to="/admin" className="flex items-center gap-2.5 px-5 py-6">
        <Emblem className="h-7 w-7 text-gold-light" />
        <span className="font-serif text-lg tracking-[0.24em] text-ivory">ANTIQUORA</span>
      </Link>
      <p className="px-5 pb-2 text-[10px] uppercase tracking-caps text-ivory/40">Store admin</p>
      <ul className="flex-1 space-y-0.5 px-3">
        {NAV.map(({ to, label, icon: I, end }) => (
          <li key={to}>
            <NavLink to={to} end={end} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${isActive ? 'bg-ivory/10 text-gold-light' : 'text-ivory/70 hover:bg-ivory/5 hover:text-ivory'}`}>
              <I className="h-4 w-4" aria-hidden /> {label}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="border-t border-ivory/10 p-5 text-xs text-ivory/60">
        <p className="truncate">{user?.email}</p>
        <Link to="/" className="mt-3 inline-flex items-center gap-1.5 text-gold-light hover:text-ivory"><ArrowLeft className="h-3.5 w-3.5" /> Back to store</Link>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-[#F6F1E7]">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 bg-walnut-dark lg:block">{nav}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-64 bg-walnut-dark" role="dialog" aria-modal="true" aria-label="Admin navigation">
            <button onClick={() => setOpen(false)} className="absolute right-2 top-4 flex h-10 w-10 items-center justify-center text-ivory" aria-label="Close menu"><X className="h-5 w-5" /></button>
            {nav}
          </aside>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-ivory/95 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} className="flex h-10 w-10 items-center justify-center" aria-label="Open admin menu"><Menu className="h-5 w-5" /></button>
          <span className="font-serif text-lg tracking-[0.2em] text-walnut">ADMIN</span>
        </header>
        <main id="main" className="p-4 sm:p-6 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AdminTitle({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-4xl">{title}</h1>
        {children && <p className="mt-1 text-sm text-ink-muted">{children}</p>}
      </div>
      {action}
    </div>
  );
}
