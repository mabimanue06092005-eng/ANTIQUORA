import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Download, Mail, MailOpen, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api, ApiError, qs } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { formatDate, formatDateTime, formatINR } from '../../lib/format';
import type { Address } from '../../lib/types';
import { useToast } from '../../context/ToastContext';
import { Checkbox, ConfirmDialog, DemoBadge, EmptyState, ErrorState, Img, Modal, Notice, PageLoader, Pagination, SelectField, Skeleton, StatusBadge, SubmitButton, TextAreaField, TextField } from '../../components/ui';
import { AdminTitle } from './AdminLayout';

function usePaged<T>(base: string, extra: Record<string, string> = {}) {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? 1);
  const q = params.get('q') ?? '';
  const key = qs({ q, page, pageSize: 20, ...extra });
  const res = useAsync(() => api.page<T[]>(`${base}${key}`), [key]);
  const set = (k: string, v: string | null) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    if (k !== 'page') n.delete('page');
    setParams(n);
  };
  return { ...res, page, q, set };
}

function SearchBar({ q, onSearch, placeholder }: { q: string; onSearch: (v: string | null) => void; placeholder: string }) {
  const [v, setV] = useState(q);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSearch(v.trim() || null); }} className="card relative mb-4 p-3" role="search">
      <label htmlFor="admin-search" className="sr-only">{placeholder}</label>
      <Search className="absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
      <input id="admin-search" value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className="field-input pl-9" />
    </form>
  );
}

/* ───────── Categories ───────── */

interface Cat { id: string; slug: string; name: string; description: string | null; imageUrl: string | null; sortOrder: number; productCount: number }

export function AdminCategories() {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api.get<Cat[]>('/api/admin/categories'), []);
  const [edit, setEdit] = useState<{ id?: string; name: string; slug: string; description: string; imageUrl: string; sortOrder: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [del, setDel] = useState<Cat | null>(null);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    setSaving(true);
    setErrors({});
    const body = { name: edit.name, slug: edit.slug || undefined, description: edit.description || null, imageUrl: edit.imageUrl || null, sortOrder: Number(edit.sortOrder) || 0 };
    try {
      if (edit.id) await api.put(`/api/admin/categories/${edit.id}`, body);
      else await api.post('/api/admin/categories', body);
      toast('Category saved.');
      setEdit(null);
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
    if (!del) return;
    try {
      await api.del(`/api/admin/categories/${del.id}`);
      toast('Category deleted.');
      await reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Delete failed', 'error');
    } finally {
      setDel(null);
    }
  };

  return (
    <>
      <AdminTitle title="Categories" action={<button onClick={() => { setErrors({}); setEdit({ name: '', slug: '', description: '', imageUrl: '', sortOrder: String(data?.length ?? 0) }); }} className="btn-primary"><Plus className="h-4 w-4" /> New category</button>}>
        Products are assigned to a category from the product editor.
      </AdminTitle>
      {error ? <ErrorState message={error.message} onRetry={reload} /> : loading ? <Skeleton className="h-60" /> : (
        <div className="card overflow-x-auto">
          <table className="table-admin">
            <thead><tr><th>Category</th><th>Slug</th><th className="text-right">Products</th><th className="text-right">Order</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {data?.map((c) => (
                <tr key={c.id}>
                  <td><div className="flex items-center gap-3"><div className="h-10 w-14 shrink-0 bg-parchment"><Img src={c.imageUrl ?? undefined} alt="" className="h-full w-full object-cover" /></div><span className="font-medium text-walnut">{c.name}</span></div></td>
                  <td className="text-ink-muted">{c.slug}</td>
                  <td className="text-right"><Link to={`/admin/products?category=${c.id}`} className="hover:text-gold-dark">{c.productCount}</Link></td>
                  <td className="text-right">{c.sortOrder}</td>
                  <td className="whitespace-nowrap text-right">
                    <button onClick={() => { setErrors({}); setEdit({ id: c.id, name: c.name, slug: c.slug, description: c.description ?? '', imageUrl: c.imageUrl ?? '', sortOrder: String(c.sortOrder) }); }} className="mr-3 text-xs uppercase tracking-wider text-gold-dark hover:text-walnut">Edit</button>
                    <button onClick={() => setDel(c)} className="text-xs uppercase tracking-wider text-ink-muted hover:text-danger">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit category' : 'New category'}>
        {edit && (
          <form onSubmit={save} noValidate className="space-y-4 p-6">
            <TextField label="Name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} error={errors.name} required />
            <TextField label="Slug" value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} error={errors.slug} hint="Leave blank to generate from the name" />
            <TextAreaField label="Description" rows={3} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} error={errors.description} />
            <TextField label="Image URL" value={edit.imageUrl} onChange={(e) => setEdit({ ...edit, imageUrl: e.target.value })} error={errors.imageUrl} hint="e.g. /images/products/iznik-dish-1.jpg or an uploaded /uploads/… path" />
            {edit.imageUrl && <Img src={edit.imageUrl} alt="Category image preview" className="h-28 w-40 object-cover" />}
            <TextField label="Sort order" inputMode="numeric" value={edit.sortOrder} onChange={(e) => setEdit({ ...edit, sortOrder: e.target.value.replace(/\D/g, '') })} />
            <div className="flex justify-end gap-3"><button type="button" className="btn-ghost" onClick={() => setEdit(null)}>Cancel</button><SubmitButton loading={saving} className="btn-primary">Save</SubmitButton></div>
          </form>
        )}
      </Modal>
      <ConfirmDialog open={!!del} title={`Delete “${del?.name}”?`} message={del?.productCount ? `This category has ${del.productCount} product(s); reassign them first or deletion will be refused.` : 'This category will be permanently deleted.'} confirmLabel="Delete" onConfirm={remove} onClose={() => setDel(null)} />
    </>
  );
}

/* ───────── Customers ───────── */

interface CustomerRow { id: string; name: string; email: string; phone: string | null; isDisabled: boolean; isDemo: boolean; createdAt: string; orderCount: number }

export function AdminCustomers() {
  const { data, error, loading, reload, page, q, set } = usePaged<CustomerRow>('/api/admin/customers');
  return (
    <>
      <AdminTitle title="Customers">Registered customer accounts. Demo customers were created by the seed script and cannot sign in.</AdminTitle>
      <SearchBar q={q} onSearch={(v) => set('q', v)} placeholder="Search name or email" />
      {error ? <ErrorState message={error.message} onRetry={reload} /> : (
        <div className="card overflow-x-auto">
          <table className="table-admin">
            <thead><tr><th>Name</th><th>Email</th><th className="text-right">Orders</th><th>Status</th><th>Joined</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5}><Skeleton className="h-8" /></td></tr> : data?.data.length === 0 ? <tr><td colSpan={5}><EmptyState title="No customers found" /></td></tr> :
                data?.data.map((c) => (
                  <tr key={c.id}>
                    <td className="whitespace-nowrap"><Link to={`/admin/customers/${c.id}`} className="font-medium text-walnut hover:text-gold-dark">{c.name}</Link> {c.isDemo && <DemoBadge className="ml-1" />}</td>
                    <td className="text-ink-soft">{c.email}</td>
                    <td className="text-right">{c.orderCount}</td>
                    <td>{c.isDisabled ? <span className="text-xs font-medium uppercase tracking-wider text-danger">Disabled</span> : <span className="text-xs uppercase tracking-wider text-success">Active</span>}</td>
                    <td className="whitespace-nowrap text-ink-muted">{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={data?.meta?.totalPages ?? 1} onChange={(p) => set('page', String(p))} />
    </>
  );
}

interface CustomerDetail extends Omit<CustomerRow, 'orderCount'> {
  disabledAt: string | null;
  disabledReason: string | null;
  addresses: Address[];
  orders: { id: string; orderNumber: string; status: string; totalPaise: number; createdAt: string }[];
  auditLog: { id: string; action: string; actor: string; details: { reason?: string } | null; createdAt: string }[];
}

export function AdminCustomerDetail() {
  const { id = '' } = useParams();
  const toast = useToast();
  const { data: c, error, loading, reload } = useAsync(() => api.get<CustomerDetail>(`/api/admin/customers/${id}`), [id]);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (loading) return <PageLoader />;
  if (error || !c) return <ErrorState message={error?.message ?? 'Not found'} onRetry={reload} />;

  const toggle = async () => {
    setBusy(true);
    setErr('');
    try {
      await api.patch(`/api/admin/customers/${c.id}/status`, { disabled: !c.isDisabled, reason: reason || undefined });
      toast(c.isDisabled ? 'Account re-enabled.' : 'Account disabled and signed out.');
      setOpen(false);
      setReason('');
      await reload();
    } catch (e) {
      if (e instanceof ApiError) setErr(e.fields.reason ?? e.message);
    } finally {
      setBusy(false);
    }
  };
  const spent = c.orders.filter((o) => ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(o.status)).reduce((s, o) => s + o.totalPaise, 0);

  return (
    <>
      <AdminTitle title={c.name} action={<button onClick={() => setOpen(true)} className={c.isDisabled ? 'btn-primary' : 'btn border border-danger/40 text-danger hover:bg-danger hover:text-white'}>{c.isDisabled ? 'Re-enable account' : 'Disable account'}</button>}>
        <Link to="/admin/customers" className="text-gold-dark hover:text-walnut">← All customers</Link> · {c.email} · joined {formatDate(c.createdAt)} {c.isDemo && <DemoBadge className="ml-1" />}
      </AdminTitle>
      {c.isDisabled && <Notice tone="error" className="mb-6">Disabled {c.disabledAt && formatDateTime(c.disabledAt)} — {c.disabledReason}</Notice>}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="card overflow-x-auto">
          <h2 className="px-5 pt-5 text-2xl">Order history <span className="text-base text-ink-muted">· {formatINR(spent)} paid</span></h2>
          {c.orders.length === 0 ? <p className="p-5 text-sm text-ink-muted">No orders.</p> : (
            <table className="table-admin mt-3">
              <thead><tr><th>Order</th><th>Status</th><th className="text-right">Total</th><th>Date</th></tr></thead>
              <tbody>{c.orders.map((o) => <tr key={o.id}><td><Link to={`/admin/orders/${o.id}`} className="font-medium text-walnut hover:text-gold-dark">{o.orderNumber}</Link></td><td><StatusBadge status={o.status} /></td><td className="text-right tabular-nums">{formatINR(o.totalPaise)}</td><td className="text-ink-muted">{formatDate(o.createdAt)}</td></tr>)}</tbody>
            </table>
          )}
        </div>
        <div className="space-y-6">
          <div className="card p-5 text-sm">
            <h2 className="mb-3 text-2xl">Addresses</h2>
            {c.addresses.length === 0 ? <p className="text-ink-muted">None saved.</p> : c.addresses.map((a) => <p key={a.id} className="mb-2 text-ink-soft">{a.fullName}, {a.line1}, {a.city}, {a.state} {a.postalCode}</p>)}
            <p className="mt-3 text-ink-muted">Phone: {c.phone ?? '—'}</p>
          </div>
          <div className="card p-5 text-sm">
            <h2 className="mb-3 text-2xl">Account audit trail</h2>
            {c.auditLog.length === 0 ? <p className="text-ink-muted">No account actions recorded.</p> : (
              <ul className="space-y-2">{c.auditLog.map((l) => <li key={l.id}><p className="text-walnut">{l.action}</p><p className="text-xs text-ink-muted">{l.actor} · {formatDateTime(l.createdAt)}{l.details?.reason ? ` · “${l.details.reason}”` : ''}</p></li>)}</ul>
            )}
          </div>
        </div>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={c.isDisabled ? 'Re-enable this account?' : 'Disable this account?'}>
        <div className="space-y-4 p-6">
          <p className="text-sm text-ink-soft">{c.isDisabled ? 'The customer will be able to sign in again.' : 'The customer will be signed out of all devices and unable to sign in. Order history is preserved.'}</p>
          <TextAreaField label={c.isDisabled ? 'Note (optional)' : 'Reason (recorded in the audit log)'} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} error={err} required={!c.isDisabled} />
          <div className="flex justify-end gap-3"><button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button onClick={toggle} disabled={busy} className={c.isDisabled ? 'btn-primary' : 'btn bg-danger text-white hover:bg-red-800'}>{c.isDisabled ? 'Re-enable' : 'Disable account'}</button></div>
        </div>
      </Modal>
    </>
  );
}

/* ───────── Coupons ───────── */

interface Coupon { id: string; code: string; description: string; type: 'PERCENT' | 'FIXED'; value: number; minSubtotal: number; maxDiscount: number | null; isActive: boolean; expiresAt: string | null; usageLimit: number | null; usedCount: number }
type CouponForm = { id?: string; code: string; description: string; type: 'PERCENT' | 'FIXED'; value: string; minSubtotal: string; maxDiscount: string; isActive: boolean; expiresAt: string; usageLimit: string };

export function AdminCoupons() {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api.get<Coupon[]>('/api/admin/coupons'), []);
  const [edit, setEdit] = useState<CouponForm | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [del, setDel] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);

  const open = (c?: Coupon) => {
    setErrors({});
    setEdit(c ? {
      id: c.id, code: c.code, description: c.description, type: c.type, value: String(c.type === 'PERCENT' ? c.value : c.value / 100),
      minSubtotal: String(c.minSubtotal / 100), maxDiscount: c.maxDiscount ? String(c.maxDiscount / 100) : '', isActive: c.isActive,
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '', usageLimit: c.usageLimit ? String(c.usageLimit) : '',
    } : { code: '', description: '', type: 'PERCENT', value: '10', minSubtotal: '0', maxDiscount: '', isActive: true, expiresAt: '', usageLimit: '' });
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    setSaving(true);
    setErrors({});
    const body = {
      code: edit.code, description: edit.description, type: edit.type, value: Number(edit.value), minSubtotal: Number(edit.minSubtotal || 0),
      maxDiscount: edit.maxDiscount ? Number(edit.maxDiscount) : null, isActive: edit.isActive,
      expiresAt: edit.expiresAt ? new Date(`${edit.expiresAt}T23:59:59`).toISOString() : null, usageLimit: edit.usageLimit ? Number(edit.usageLimit) : null,
    };
    try {
      if (edit.id) await api.put(`/api/admin/coupons/${edit.id}`, body);
      else await api.post('/api/admin/coupons', body);
      toast('Discount saved.');
      setEdit(null);
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

  return (
    <>
      <AdminTitle title="Discount codes" action={<button onClick={() => open()} className="btn-primary"><Plus className="h-4 w-4" /> New code</button>}>
        Codes are validated server-side against minimum spend, expiry and usage limits. Per-product discounts are set via “original price” on each product.
      </AdminTitle>
      {error ? <ErrorState message={error.message} onRetry={reload} /> : loading ? <Skeleton className="h-40" /> : (
        <div className="card overflow-x-auto">
          <table className="table-admin">
            <thead><tr><th>Code</th><th>Discount</th><th>Min. spend</th><th>Used</th><th>Expires</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {data?.map((c) => {
                const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
                return (
                  <tr key={c.id}>
                    <td><p className="font-medium tracking-wider text-walnut">{c.code}</p><p className="text-xs text-ink-muted">{c.description}</p></td>
                    <td className="whitespace-nowrap">{c.type === 'PERCENT' ? `${c.value}%` : formatINR(c.value)}{c.maxDiscount ? <span className="text-xs text-ink-muted"> (max {formatINR(c.maxDiscount)})</span> : null}</td>
                    <td className="whitespace-nowrap">{c.minSubtotal ? formatINR(c.minSubtotal) : '—'}</td>
                    <td>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
                    <td className="whitespace-nowrap text-ink-muted">{c.expiresAt ? formatDate(c.expiresAt) : 'Never'}</td>
                    <td>{expired ? <span className="text-xs uppercase text-danger">Expired</span> : c.isActive ? <span className="text-xs uppercase text-success">Active</span> : <span className="text-xs uppercase text-ink-muted">Inactive</span>}</td>
                    <td className="whitespace-nowrap text-right">
                      <button onClick={() => open(c)} className="mr-3 text-gold-dark hover:text-walnut" aria-label={`Edit ${c.code}`}><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDel(c)} className="text-ink-muted hover:text-danger" aria-label={`Delete ${c.code}`}><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit discount code' : 'New discount code'}>
        {edit && (
          <form onSubmit={save} noValidate className="space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Code" value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} error={errors.code} required />
              <SelectField label="Type" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value as CouponForm['type'] })}>
                <option value="PERCENT">Percentage</option>
                <option value="FIXED">Fixed amount (₹)</option>
              </SelectField>
            </div>
            <TextField label="Description" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} error={errors.description} required />
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField label={edit.type === 'PERCENT' ? 'Percent off' : 'Amount off (₹)'} inputMode="decimal" value={edit.value} onChange={(e) => setEdit({ ...edit, value: e.target.value })} error={errors.value} required />
              <TextField label="Min. spend (₹)" inputMode="decimal" value={edit.minSubtotal} onChange={(e) => setEdit({ ...edit, minSubtotal: e.target.value })} error={errors.minSubtotal} />
              <TextField label="Max discount (₹)" inputMode="decimal" value={edit.maxDiscount} onChange={(e) => setEdit({ ...edit, maxDiscount: e.target.value })} error={errors.maxDiscount} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Expires on" type="date" value={edit.expiresAt} onChange={(e) => setEdit({ ...edit, expiresAt: e.target.value })} error={errors.expiresAt} />
              <TextField label="Usage limit" inputMode="numeric" value={edit.usageLimit} onChange={(e) => setEdit({ ...edit, usageLimit: e.target.value.replace(/\D/g, '') })} error={errors.usageLimit} />
            </div>
            <Checkbox label="Active" checked={edit.isActive} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} />
            <div className="flex justify-end gap-3"><button type="button" className="btn-ghost" onClick={() => setEdit(null)}>Cancel</button><SubmitButton loading={saving} className="btn-primary">Save</SubmitButton></div>
          </form>
        )}
      </Modal>
      <ConfirmDialog
        open={!!del}
        title={`Delete ${del?.code}?`}
        message="Customers will no longer be able to use this code."
        confirmLabel="Delete"
        onConfirm={async () => { if (del) { await api.del(`/api/admin/coupons/${del.id}`); toast('Discount deleted.'); setDel(null); await reload(); } }}
        onClose={() => setDel(null)}
      />
    </>
  );
}

/* ───────── Newsletter ───────── */

interface Sub { id: string; email: string; source: string | null; isActive: boolean; isDemo: boolean; createdAt: string }

export function AdminNewsletter() {
  const toast = useToast();
  const { data, error, loading, reload, page, q, set } = usePaged<Sub>('/api/admin/newsletter');
  const toggle = async (s: Sub) => {
    await api.patch(`/api/admin/newsletter/${s.id}`, { isActive: !s.isActive });
    toast(s.isActive ? 'Unsubscribed.' : 'Resubscribed.');
    await reload();
  };
  return (
    <>
      <AdminTitle title="Newsletter subscribers" action={<a href="/api/admin/newsletter.csv" className="btn-outline"><Download className="h-4 w-4" /> Export CSV</a>}>
        {data?.meta?.total ?? '…'} subscribers. Export includes active subscribers only.
      </AdminTitle>
      <SearchBar q={q} onSearch={(v) => set('q', v)} placeholder="Search email" />
      {error ? <ErrorState message={error.message} onRetry={reload} /> : (
        <div className="card overflow-x-auto">
          <table className="table-admin">
            <thead><tr><th>Email</th><th>Source</th><th>Subscribed</th><th>Status</th><th className="text-right">Action</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5}><Skeleton className="h-8" /></td></tr> : data?.data.length === 0 ? <tr><td colSpan={5}><EmptyState title="No subscribers yet" /></td></tr> :
                data?.data.map((s) => (
                  <tr key={s.id}>
                    <td>{s.email} {s.isDemo && <DemoBadge className="ml-1" />}</td>
                    <td className="text-ink-muted">{s.source ?? '—'}</td>
                    <td className="whitespace-nowrap text-ink-muted">{formatDate(s.createdAt)}</td>
                    <td>{s.isActive ? <span className="text-xs uppercase text-success">Subscribed</span> : <span className="text-xs uppercase text-ink-muted">Unsubscribed</span>}</td>
                    <td className="text-right"><button onClick={() => toggle(s)} className="text-xs uppercase tracking-wider text-gold-dark hover:text-walnut">{s.isActive ? 'Unsubscribe' : 'Resubscribe'}</button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={data?.meta?.totalPages ?? 1} onChange={(p) => set('page', String(p))} />
    </>
  );
}

/* ───────── Contact messages ───────── */

interface Msg { id: string; name: string; email: string; subject: string; message: string; isRead: boolean; isDemo: boolean; createdAt: string }

export function AdminMessages() {
  const { data, error, loading, reload, page, set } = usePaged<Msg>('/api/admin/contact');
  const [openId, setOpenId] = useState<string | null>(null);
  const mark = async (m: Msg, isRead: boolean) => {
    await api.patch(`/api/admin/contact/${m.id}`, { isRead });
    await reload();
  };
  return (
    <>
      <AdminTitle title="Contact messages">Submissions from the contact form, newest first.</AdminTitle>
      {error ? <ErrorState message={error.message} onRetry={reload} /> : loading ? <Skeleton className="h-40" /> : data?.data.length === 0 ? <EmptyState title="No messages yet" /> : (
        <ul className="space-y-3">
          {data?.data.map((m) => (
            <li key={m.id} className={`card p-5 ${m.isRead ? '' : 'border-l-4 border-l-gold'}`}>
              <button onClick={() => { setOpenId(openId === m.id ? null : m.id); if (!m.isRead) void mark(m, true); }} className="flex w-full flex-wrap items-start justify-between gap-2 text-left" aria-expanded={openId === m.id}>
                <span>
                  <span className="flex items-center gap-2 font-medium text-walnut">{m.isRead ? <MailOpen className="h-4 w-4 text-ink-muted" /> : <Mail className="h-4 w-4 text-gold-dark" />} {m.subject} {m.isDemo && <DemoBadge />}</span>
                  <span className="text-sm text-ink-muted">{m.name} · {m.email}</span>
                </span>
                <span className="text-xs text-ink-muted">{formatDateTime(m.createdAt)}</span>
              </button>
              {openId === m.id && (
                <div className="mt-4 border-t border-line pt-4">
                  <p className="whitespace-pre-wrap text-sm text-ink-soft">{m.message}</p>
                  <div className="mt-4 flex gap-4 text-xs uppercase tracking-wider">
                    <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`} className="text-gold-dark hover:text-walnut">Reply by email</a>
                    <button onClick={() => mark(m, false)} className="text-ink-muted hover:text-walnut">Mark unread</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} totalPages={data?.meta?.totalPages ?? 1} onChange={(p) => set('page', String(p))} />
    </>
  );
}

/* ───────── Settings ───────── */

interface Settings {
  store: { storeName: string; supportEmail: string; supportPhone: string; address: string; announcement: string };
  shipping: { standardPaise: number; expressPaise: number; freeShippingThresholdPaise: number; standardDays: string; expressDays: string; taxRatePercent: number };
}

export function AdminSettings() {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api.get<Settings>('/api/admin/settings'), []);
  const [store, setStore] = useState<Settings['store'] | null>(null);
  const [ship, setShip] = useState<{ standard: string; express: string; freeShippingThreshold: string; standardDays: string; expressDays: string; taxRatePercent: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setStore(data.store);
    setShip({
      standard: String(data.shipping.standardPaise / 100), express: String(data.shipping.expressPaise / 100),
      freeShippingThreshold: String(data.shipping.freeShippingThresholdPaise / 100), standardDays: data.shipping.standardDays,
      expressDays: data.shipping.expressDays, taxRatePercent: String(data.shipping.taxRatePercent),
    });
  }, [data]);

  if (loading || !store || !ship) return error ? <ErrorState message={error.message} onRetry={reload} /> : <PageLoader />;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await api.put('/api/admin/settings', {
        store,
        shipping: { standard: Number(ship.standard), express: Number(ship.express), freeShippingThreshold: Number(ship.freeShippingThreshold), standardDays: ship.standardDays, expressDays: ship.expressDays, taxRatePercent: Number(ship.taxRatePercent) },
      });
      toast('Settings saved. Changes apply to new carts and orders immediately.');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k.split('.').pop()!, v])));
        toast(err.message, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} noValidate>
      <AdminTitle title="Settings" action={<SubmitButton loading={saving} className="btn-primary">Save settings</SubmitButton>}>Store information and the shipping rule used to calculate totals on the server.</AdminTitle>
      <div className="grid gap-6 xl:grid-cols-2">
        <fieldset className="card space-y-4 p-6">
          <legend className="sr-only">Store information</legend>
          <h2 className="text-2xl">Store information</h2>
          <TextField label="Store name" value={store.storeName} onChange={(e) => setStore({ ...store, storeName: e.target.value })} error={errors.storeName} />
          <TextField label="Support email" type="email" value={store.supportEmail} onChange={(e) => setStore({ ...store, supportEmail: e.target.value })} error={errors.supportEmail} />
          <TextField label="Support phone" value={store.supportPhone} onChange={(e) => setStore({ ...store, supportPhone: e.target.value })} error={errors.supportPhone} />
          <TextAreaField label="Address" rows={2} value={store.address} onChange={(e) => setStore({ ...store, address: e.target.value })} error={errors.address} />
          <TextField label="Announcement bar" value={store.announcement} maxLength={140} onChange={(e) => setStore({ ...store, announcement: e.target.value })} error={errors.announcement} />
        </fieldset>
        <fieldset className="card space-y-4 p-6">
          <legend className="sr-only">Shipping & tax</legend>
          <h2 className="text-2xl">Shipping & tax</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Standard shipping (₹)" inputMode="decimal" value={ship.standard} onChange={(e) => setShip({ ...ship, standard: e.target.value })} error={errors.standard} />
            <TextField label="Standard delivery time" value={ship.standardDays} onChange={(e) => setShip({ ...ship, standardDays: e.target.value })} error={errors.standardDays} />
            <TextField label="Express shipping (₹)" inputMode="decimal" value={ship.express} onChange={(e) => setShip({ ...ship, express: e.target.value })} error={errors.express} />
            <TextField label="Express delivery time" value={ship.expressDays} onChange={(e) => setShip({ ...ship, expressDays: e.target.value })} error={errors.expressDays} />
          </div>
          <TextField label="Free standard shipping from (₹)" inputMode="decimal" value={ship.freeShippingThreshold} onChange={(e) => setShip({ ...ship, freeShippingThreshold: e.target.value })} error={errors.freeShippingThreshold} />
          <TextField label="Additional tax rate (%)" inputMode="decimal" value={ship.taxRatePercent} onChange={(e) => setShip({ ...ship, taxRatePercent: e.target.value })} error={errors.taxRatePercent} hint="0 when product prices already include GST (default). A non-zero rate is added on top of the discounted subtotal." />
        </fieldset>
      </div>
    </form>
  );
}

/* ───────── Audit log ───────── */

interface Log { id: string; action: string; entityType: string; entityId: string | null; details: unknown; actor: string; createdAt: string }

export function AdminAuditLog() {
  const { data, error, loading, reload, page, set } = usePaged<Log>('/api/admin/audit-log');
  return (
    <>
      <AdminTitle title="Audit log">Every administrative change is recorded with the acting admin and timestamp.</AdminTitle>
      {error ? <ErrorState message={error.message} onRetry={reload} /> : (
        <div className="card overflow-x-auto">
          <table className="table-admin">
            <thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5}><Skeleton className="h-8" /></td></tr> : data?.data.length === 0 ? <tr><td colSpan={5}><EmptyState title="No admin actions yet" /></td></tr> :
                data?.data.map((l) => (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap text-ink-muted">{formatDateTime(l.createdAt)}</td>
                    <td className="whitespace-nowrap">{l.actor}</td>
                    <td className="whitespace-nowrap font-medium text-walnut">{l.action}</td>
                    <td className="whitespace-nowrap text-ink-muted">{l.entityType}{l.entityId ? ` · ${l.entityId.slice(0, 10)}…` : ''}</td>
                    <td className="max-w-[320px] truncate text-xs text-ink-muted" title={l.details ? JSON.stringify(l.details) : ''}>{l.details ? JSON.stringify(l.details) : '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={data?.meta?.totalPages ?? 1} onChange={(p) => set('page', String(p))} />
    </>
  );
}
