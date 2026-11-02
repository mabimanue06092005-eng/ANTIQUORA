import { useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { Heart, KeyRound, LogOut, MapPin, Package, Pencil, Plus, Star, Trash2, User } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { useSeo } from '../../lib/seo';
import type { Address, OrderDetail, OrderSummary, User as UserT } from '../../lib/types';
import { INDIAN_STATES } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatDateTime, ORDER_STATUS_LABEL } from '../../lib/format';
import { Checkbox, ConfirmDialog, DemoBadge, EmptyState, ErrorState, Img, Modal, Notice, PageLoader, Pagination, SelectField, Skeleton, StatusBadge, SubmitButton, TextField, formatINR } from '../../components/ui';
import { OrderTotals } from '../../components/OrderTotals';
import { WishlistItems } from '../Wishlist';

const NAV = [
  { to: '/account', label: 'Overview', icon: User, end: true },
  { to: '/account/orders', label: 'Orders', icon: Package },
  { to: '/account/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/account/addresses', label: 'Addresses', icon: MapPin },
  { to: '/account/profile', label: 'Profile', icon: Pencil },
  { to: '/account/password', label: 'Password', icon: KeyRound },
];

export function AccountLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  useSeo({ title: 'My account', noindex: true });
  return (
    <div className="container-site py-10 md:py-14">
      <div className="mb-8 border-b border-line pb-6">
        <p className="eyebrow">My account</p>
        <h1 className="mt-2 text-4xl md:text-5xl">Hello, {user?.name.split(' ')[0]}</h1>
      </div>
      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Account" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <ul className="flex gap-1 lg:flex-col">
            {NAV.map(({ to, label, icon: I, end }) => (
              <li key={to}>
                <NavLink to={to} end={end} className={({ isActive }) => `flex items-center gap-3 whitespace-nowrap px-3 py-2.5 text-sm transition-colors ${isActive ? 'bg-walnut text-ivory' : 'text-ink-soft hover:bg-parchment hover:text-walnut'}`}>
                  <I className="h-4 w-4" aria-hidden /> {label}
                </NavLink>
              </li>
            ))}
            <li>
              <button
                onClick={async () => {
                  navigate('/');
                  await logout();
                  toast('You have been signed out.', 'info');
                }}
                className="flex w-full items-center gap-3 whitespace-nowrap px-3 py-2.5 text-sm text-ink-soft hover:bg-parchment hover:text-walnut"
              >
                <LogOut className="h-4 w-4" aria-hidden /> Sign out
              </button>
            </li>
          </ul>
        </nav>
        <section className="min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  );
}

function OrderRow({ o }: { o: OrderSummary }) {
  return (
    <li>
      <Link to={`/account/orders/${o.orderNumber}`} className="group flex flex-col gap-4 border border-line bg-white/50 p-5 transition-colors hover:border-walnut/50 sm:flex-row sm:items-center">
        <div className="flex -space-x-3">
          {o.items.slice(0, 3).map((i, k) => (
            <div key={k} className="h-16 w-14 overflow-hidden border-2 border-ivory bg-parchment">
              <Img src={i.imageUrl ?? undefined} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
        <div className="flex-1">
          <p className="flex flex-wrap items-center gap-2 font-medium tabular-nums text-walnut">{o.orderNumber} {o.isDemo && <DemoBadge />}</p>
          <p className="text-sm text-ink-muted">{formatDate(o.createdAt)} · {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'}</p>
        </div>
        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
          <StatusBadge status={o.status} />
          <p className="font-serif text-xl text-walnut">{formatINR(o.totalPaise)}</p>
        </div>
      </Link>
    </li>
  );
}

export function AccountOverview() {
  const { user } = useAuth();
  const { wishlist } = useShop();
  const { data, loading } = useAsync(() => api.page<OrderSummary[]>('/api/orders?pageSize=3'), []);
  return (
    <div className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ['Orders', data?.meta?.total ?? '—', '/account/orders'],
          ['Wishlist', wishlist?.productIds.length ?? 0, '/account/wishlist'],
          ['Member since', user ? formatDate(user.createdAt, { month: 'short', year: 'numeric' }) : '—', '/account/profile'],
        ].map(([label, value, to]) => (
          <Link key={label as string} to={to as string} className="border border-line bg-white/50 p-5 hover:border-walnut/50">
            <p className="text-[11px] uppercase tracking-wider text-ink-muted">{label}</p>
            <p className="mt-1 font-serif text-3xl text-walnut">{value}</p>
          </Link>
        ))}
      </div>
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl">Recent orders</h2>
          <Link to="/account/orders" className="text-xs uppercase tracking-wider text-gold-dark hover:text-walnut">View all</Link>
        </div>
        {loading ? (
          <Skeleton className="h-24" />
        ) : data?.data.length ? (
          <ul className="space-y-3">{data.data.map((o) => <OrderRow key={o.id} o={o} />)}</ul>
        ) : (
          <Notice>You haven’t placed an order yet. <Link to="/shop" className="underline">Explore the collection</Link>.</Notice>
        )}
      </div>
    </div>
  );
}

export function AccountOrders() {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAsync(() => api.page<OrderSummary[]>(`/api/orders?page=${page}&pageSize=10`), [page]);
  if (loading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (!data?.data.length)
    return <EmptyState icon={<Package className="h-6 w-6" />} title="No orders yet" action={<Link to="/shop" className="btn-primary">Start collecting</Link>}>When you place an order it will appear here with its status.</EmptyState>;
  return (
    <>
      <h2 className="mb-5 text-3xl">Order history</h2>
      <ul className="space-y-3">{data.data.map((o) => <OrderRow key={o.id} o={o} />)}</ul>
      <Pagination page={page} totalPages={data.meta?.totalPages ?? 1} onChange={setPage} />
    </>
  );
}

const LIFECYCLE = ['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

export function OrderTimeline({ order }: { order: Pick<OrderDetail, 'status' | 'events'> }) {
  const terminal = order.status === 'CANCELLED' || order.status === 'PAYMENT_FAILED';
  const reached = new Set(order.events.map((e) => e.status));
  return (
    <div>
      {!terminal && (
        <ol className="mb-8 grid grid-cols-5 gap-1" aria-label="Order progress">
          {LIFECYCLE.map((s) => {
            const done = reached.has(s);
            return (
              <li key={s} className="text-center">
                <div className={`h-1 ${done ? 'bg-gold-dark' : 'bg-line'}`} />
                <p className={`mt-2 text-[10px] uppercase tracking-wider sm:text-[11px] ${done ? 'text-walnut' : 'text-ink-muted'}`}>{ORDER_STATUS_LABEL[s]}</p>
              </li>
            );
          })}
        </ol>
      )}
      <ol className="relative space-y-5 border-l border-line pl-6">
        {[...order.events].reverse().map((e) => (
          <li key={e.id} className="relative">
            <span className="absolute -left-[29px] top-1 h-2.5 w-2.5 rounded-full border-2 border-ivory bg-gold-dark" aria-hidden />
            <p className="text-sm font-medium text-walnut">{ORDER_STATUS_LABEL[e.status]}</p>
            {e.note && <p className="text-sm text-ink-soft">{e.note}</p>}
            <p className="text-xs text-ink-muted">{formatDateTime(e.createdAt)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function AccountOrderDetail() {
  const { orderNumber = '' } = useParams();
  const toast = useToast();
  const { data: o, error, loading, reload } = useAsync(() => api.get<OrderDetail>(`/api/orders/${orderNumber}`), [orderNumber]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  if (loading) return <PageLoader />;
  if (error || !o) return <ErrorState message={error?.message ?? 'Order not found'} onRetry={reload} />;

  const cancel = async () => {
    setBusy(true);
    try {
      await api.post(`/api/orders/${o.orderNumber}/cancel`, { reason: 'Cancelled by customer' });
      toast('Your order has been cancelled.');
      setConfirm(false);
      await reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not cancel order.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/account/orders" className="text-xs uppercase tracking-wider text-gold-dark hover:text-walnut">← All orders</Link>
          <h2 className="mt-2 flex flex-wrap items-center gap-3 text-3xl">Order {o.orderNumber} {o.isDemo && <DemoBadge />}</h2>
          <p className="text-sm text-ink-muted">Placed {formatDateTime(o.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={o.status} />
          {o.canCancel && <button onClick={() => setConfirm(true)} className="btn-outline h-10 min-h-0 px-4">Cancel order</button>}
        </div>
      </div>
      {o.status === 'SHIPPED' && <Notice>Your order is on its way. Live courier tracking is not connected in this demo, so no tracking number is shown.</Notice>}
      {o.status === 'PAYMENT_FAILED' && <Notice tone="error">Payment for this order did not go through, so it was not charged and the items were released. Your bag still holds them if you’d like to try again.</Notice>}
      {o.status === 'CANCELLED' && <Notice>This order was cancelled{o.cancelReason ? `: ${o.cancelReason}` : ''}.</Notice>}

      <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <ul className="divide-y divide-line border-y border-line">
            {o.items.map((i) => (
              <li key={i.id} className="flex items-center gap-4 py-4">
                <div className="h-20 w-16 shrink-0 bg-parchment"><Img src={i.imageUrl ?? undefined} alt="" className="h-full w-full object-cover" /></div>
                <div className="flex-1">
                  <Link to={`/artifact/${i.productSlug}`} className="font-serif text-lg text-walnut hover:text-gold-dark">{i.productName}</Link>
                  <p className="text-xs text-ink-muted">SKU {i.productSku} · Qty {i.quantity} × {formatINR(i.unitPricePaise)}</p>
                </div>
                <p className="tabular-nums text-walnut">{formatINR(i.lineTotalPaise)}</p>
              </li>
            ))}
          </ul>
          <div>
            <h3 className="mb-4 text-2xl">Status history</h3>
            <OrderTimeline order={o} />
          </div>
        </div>
        <div className="space-y-6">
          <div className="card p-5"><OrderTotals totals={{ ...o, freeShippingApplied: o.shippingPaise === 0, couponError: null }} deliveryLabel={o.deliveryMethod} showShippingNote={false} /></div>
          <div className="card p-5 text-sm">
            <p className="field-label">Shipping address</p>
            <p className="text-walnut">{o.shipName}</p>
            <p className="text-ink-muted">{o.shipLine1}{o.shipLine2 ? `, ${o.shipLine2}` : ''}</p>
            <p className="text-ink-muted">{o.shipCity}, {o.shipState} {o.shipPostalCode}, {o.shipCountry}</p>
            <p className="text-ink-muted">{o.shipPhone}</p>
          </div>
          <div className="card p-5 text-sm">
            <p className="field-label">Payment</p>
            {o.payments.length === 0 ? <p className="text-ink-muted">No payment recorded.</p> : o.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 py-1">
                <span className="text-ink-soft">{p.isDemo ? 'Demo gateway' : p.provider} · {formatINR(p.amountPaise)}</span>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <ConfirmDialog open={confirm} title="Cancel this order?" message={<>Order {o.orderNumber} will be cancelled and the items returned to the collection.{o.status === 'CONFIRMED' && o.isDemo ? ' A demo refund will be recorded (no money moves in demo mode).' : ''}</>} confirmLabel="Cancel order" onConfirm={cancel} onClose={() => setConfirm(false)} busy={busy} />
    </div>
  );
}

export function AccountWishlist() {
  return (
    <>
      <h2 className="mb-6 text-3xl">Wishlist</h2>
      <WishlistItems />
    </>
  );
}

type AddrForm = { label: string; fullName: string; phone: string; line1: string; line2: string; city: string; state: string; postalCode: string; isDefault: boolean };
const blank: AddrForm = { label: '', fullName: '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '', isDefault: false };

export function AccountAddresses() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.get<Address[]>('/api/account/addresses'), []);
  const [editing, setEditing] = useState<{ id?: string; form: AddrForm } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Address | null>(null);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setErrors({});
    try {
      const body = { ...editing.form, label: editing.form.label || null, line2: editing.form.line2 || null };
      if (editing.id) await api.put(`/api/account/addresses/${editing.id}`, body);
      else await api.post('/api/account/addresses', body);
      toast('Address saved.');
      setEditing(null);
      await reload();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        if (!Object.keys(err.fields).length) toast(err.message, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    await api.del(`/api/account/addresses/${deleting.id}`);
    setDeleting(null);
    toast('Address removed.', 'info');
    await reload();
  };

  const f = editing?.form;
  const set = (k: keyof AddrForm, v: string | boolean) => editing && setEditing({ ...editing, form: { ...editing.form, [k]: v } });

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-3xl">Saved addresses</h2>
        <button onClick={() => { setErrors({}); setEditing({ form: blank }); }} className="btn-primary h-10 min-h-0 px-4"><Plus className="h-4 w-4" /> Add address</button>
      </div>
      {loading ? <Skeleton className="h-32" /> : error ? <ErrorState message={error.message} onRetry={reload} /> : !data?.length ? (
        <EmptyState icon={<MapPin className="h-6 w-6" />} title="No saved addresses">Add an address to speed up checkout.</EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {data.map((a) => (
            <li key={a.id} className="border border-line bg-white/50 p-5 text-sm">
              <div className="flex items-start justify-between">
                <p className="font-medium text-walnut">{a.label || a.fullName}</p>
                {a.isDefault && <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-gold-dark"><Star className="h-3 w-3 fill-current" /> Default</span>}
              </div>
              <p className="mt-2 text-ink-soft">{a.fullName} · {a.phone}</p>
              <p className="text-ink-muted">{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p>
              <p className="text-ink-muted">{a.city}, {a.state} {a.postalCode}</p>
              <div className="mt-4 flex gap-4 text-xs uppercase tracking-wider">
                <button onClick={() => { setErrors({}); setEditing({ id: a.id, form: { label: a.label ?? '', fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2 ?? '', city: a.city, state: a.state, postalCode: a.postalCode, isDefault: a.isDefault } }); }} className="text-gold-dark hover:text-walnut">Edit</button>
                <button onClick={() => setDeleting(a)} className="flex items-center gap-1 text-ink-muted hover:text-danger"><Trash2 className="h-3 w-3" /> Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit address' : 'New address'}>
        {f && (
          <form onSubmit={save} noValidate className="space-y-4 p-6">
            <TextField label="Label (optional)" placeholder="Home, Office…" value={f.label} onChange={(e) => set('label', e.target.value)} error={errors.label} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Full name" value={f.fullName} onChange={(e) => set('fullName', e.target.value)} error={errors.fullName} required />
              <TextField label="Mobile" type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} error={errors.phone} required />
            </div>
            <TextField label="Address line 1" value={f.line1} onChange={(e) => set('line1', e.target.value)} error={errors.line1} required />
            <TextField label="Address line 2" value={f.line2} onChange={(e) => set('line2', e.target.value)} error={errors.line2} />
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField label="City" value={f.city} onChange={(e) => set('city', e.target.value)} error={errors.city} required />
              <SelectField label="State" value={f.state} onChange={(e) => set('state', e.target.value)} error={errors.state} required>
                <option value="">Select…</option>
                {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
              </SelectField>
              <TextField label="PIN code" inputMode="numeric" maxLength={6} value={f.postalCode} onChange={(e) => set('postalCode', e.target.value.replace(/\D/g, ''))} error={errors.postalCode} required />
            </div>
            <Checkbox label="Make this my default address" checked={f.isDefault} onChange={(e) => set('isDefault', e.target.checked)} />
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <SubmitButton loading={saving} className="btn-primary">Save address</SubmitButton>
            </div>
          </form>
        )}
      </Modal>
      <ConfirmDialog open={!!deleting} title="Delete address?" message="This saved address will be removed from your account." confirmLabel="Delete" onConfirm={remove} onClose={() => setDeleting(null)} />
    </>
  );
}

export function AccountProfile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: user?.name ?? '', phone: user?.phone ?? '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      setUser(await api.patch<UserT>('/api/account/profile', form));
      toast('Profile updated.');
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={save} noValidate className="max-w-lg space-y-5">
      <h2 className="text-3xl">Profile</h2>
      <TextField label="Email" value={user?.email ?? ''} disabled hint="Contact support to change the email on your account." />
      <TextField label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} required />
      <TextField label="Mobile number" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} hint="Optional — used to prefill checkout." />
      <SubmitButton loading={saving} className="btn-primary">Save changes</SubmitButton>
    </form>
  );
}

export function AccountPassword() {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.currentPassword) errs.currentPassword = 'Enter your current password';
    if (form.newPassword.length < 8) errs.newPassword = 'Password must be at least 8 characters';
    else if (!/[A-Za-z]/.test(form.newPassword) || !/\d/.test(form.newPassword)) errs.newPassword = 'Include at least one letter and one number';
    if (form.confirmPassword !== form.newPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await api.post('/api/auth/change-password', form);
      toast('Password changed. Other devices have been signed out.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        if (!Object.keys(err.fields).length) toast(err.message, 'error');
      }
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={save} noValidate className="max-w-lg space-y-5">
      <h2 className="text-3xl">Change password</h2>
      <TextField label="Current password" type="password" autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} error={errors.currentPassword} required />
      <TextField label="New password" type="password" autoComplete="new-password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} error={errors.newPassword} hint="At least 8 characters, with a letter and a number." required />
      <TextField label="Confirm new password" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} error={errors.confirmPassword} required />
      <SubmitButton loading={saving} className="btn-primary">Update password</SubmitButton>
    </form>
  );
}
