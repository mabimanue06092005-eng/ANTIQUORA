import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api, ApiError, qs } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { formatDateTime, formatINR, ORDER_STATUS_LABEL } from '../../lib/format';
import type { OrderDetail } from '../../lib/types';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog, DemoBadge, EmptyState, ErrorState, Img, PageLoader, Pagination, Skeleton, StatusBadge, TextField } from '../../components/ui';
import { OrderTotals } from '../../components/OrderTotals';
import { OrderTimeline } from '../account/Account';
import { AdminTitle } from './AdminLayout';

interface Row {
  id: string; orderNumber: string; customerName: string; email: string; status: string; totalPaise: number; itemCount: number;
  payment: { status: string; provider: string; isDemo: boolean } | null; isDemo: boolean; createdAt: string;
}

const STATUSES = ['ALL', 'PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'PAYMENT_FAILED'];

export function AdminOrders() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const status = params.get('status') ?? 'ALL';
  const page = Number(params.get('page') ?? 1);
  const [search, setSearch] = useState(q);
  const { data, error, loading, reload } = useAsync(() => api.page<Row[]>(`/api/admin/orders${qs({ q, status, page, pageSize: 20 })}`), [q, status, page]);
  const set = (k: string, v: string | null) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    if (k !== 'page') n.delete('page');
    setParams(n);
  };
  return (
    <>
      <AdminTitle title="Orders">Search by order number, customer name or email. Update fulfilment status from each order.</AdminTitle>
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
        <form onSubmit={(e) => { e.preventDefault(); set('q', search.trim() || null); }} className="relative min-w-[220px] flex-1" role="search">
          <label htmlFor="os" className="sr-only">Search orders</label>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <input id="os" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Order number, name or email" className="field-input pl-9" />
        </form>
        <label htmlFor="ost" className="sr-only">Status</label>
        <select id="ost" value={status} onChange={(e) => set('status', e.target.value === 'ALL' ? null : e.target.value)} className="field-input w-auto">
          {STATUSES.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All statuses' : ORDER_STATUS_LABEL[s]}</option>)}
        </select>
      </div>
      {error ? <ErrorState message={error.message} onRetry={reload} /> : (
        <div className="card overflow-x-auto">
          <table className="table-admin">
            <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Payment</th><th className="text-right">Items</th><th className="text-right">Total</th><th>Placed</th></tr></thead>
            <tbody>
              {loading ? Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={7}><Skeleton className="h-8" /></td></tr>) :
                data?.data.length === 0 ? <tr><td colSpan={7}><EmptyState title="No orders found">Try another search or status.</EmptyState></td></tr> :
                data?.data.map((o) => (
                  <tr key={o.id}>
                    <td className="whitespace-nowrap"><Link to={`/admin/orders/${o.id}`} className="font-medium text-walnut hover:text-gold-dark">{o.orderNumber}</Link> {o.isDemo && <DemoBadge className="ml-1" />}</td>
                    <td><p className="whitespace-nowrap">{o.customerName}</p><p className="text-xs text-ink-muted">{o.email}</p></td>
                    <td><StatusBadge status={o.status} /></td>
                    <td>{o.payment ? <StatusBadge status={o.payment.status} /> : '—'}</td>
                    <td className="text-right">{o.itemCount}</td>
                    <td className="text-right tabular-nums">{formatINR(o.totalPaise)}</td>
                    <td className="whitespace-nowrap text-ink-muted">{formatDateTime(o.createdAt)}</td>
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

type AdminOrder = Omit<OrderDetail, 'payments'> & {
  allowedTransitions: string[];
  user: { id: string; name: string; email: string; createdAt: string } | null;
  payments: (OrderDetail['payments'][number] & { providerOrderId: string | null; providerPaymentId: string | null })[];
};

export function AdminOrderDetail() {
  const { id = '' } = useParams();
  const toast = useToast();
  const { data: o, error, loading, reload } = useAsync(() => api.get<AdminOrder>(`/api/admin/orders/${id}`), [id]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  if (loading) return <PageLoader />;
  if (error || !o) return <ErrorState message={error?.message ?? 'Order not found'} onRetry={reload} />;

  const update = async (status: string) => {
    setBusy(true);
    try {
      await api.patch(`/api/admin/orders/${o.id}/status`, { status, note: note || undefined });
      toast(`Order marked ${ORDER_STATUS_LABEL[status].toLowerCase()}.`);
      setNote('');
      setConfirmCancel(false);
      await reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Update failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AdminTitle title={`Order ${o.orderNumber}`} action={<StatusBadge status={o.status} />}>
        <Link to="/admin/orders" className="text-gold-dark hover:text-walnut">← All orders</Link> · Placed {formatDateTime(o.createdAt)} {o.isDemo && <DemoBadge className="ml-1" />}
      </AdminTitle>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="mb-4 text-2xl">Items</h2>
            <ul className="divide-y divide-line">
              {o.items.map((i) => (
                <li key={i.id} className="flex items-center gap-4 py-3">
                  <div className="h-14 w-12 shrink-0 bg-parchment"><Img src={i.imageUrl ?? undefined} alt="" className="h-full w-full object-cover" /></div>
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-walnut">{i.productName}</p>
                    <p className="text-xs text-ink-muted">SKU {i.productSku} · {i.quantity} × {formatINR(i.unitPricePaise)} (price at purchase)</p>
                  </div>
                  <p className="tabular-nums">{formatINR(i.lineTotalPaise)}</p>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-line pt-4"><OrderTotals totals={{ ...o, freeShippingApplied: o.shippingPaise === 0, couponError: null }} deliveryLabel={o.deliveryMethod} showShippingNote={false} /></div>
          </div>
          <div className="card p-6">
            <h2 className="mb-4 text-2xl">History</h2>
            <OrderTimeline order={o} />
          </div>
        </div>
        <div className="space-y-6">
          <div className="card space-y-4 p-6">
            <h2 className="text-2xl">Update status</h2>
            {o.allowedTransitions.length === 0 && !o.canCancel ? (
              <p className="text-sm text-ink-muted">No further status changes are permitted for a {ORDER_STATUS_LABEL[o.status].toLowerCase()} order.</p>
            ) : (
              <>
                <TextField label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Packed and handed to courier" maxLength={300} />
                <div className="flex flex-col gap-2">
                  {o.allowedTransitions.map((s) => (
                    <button key={s} onClick={() => update(s)} disabled={busy} className="btn-primary">Mark as {ORDER_STATUS_LABEL[s].toLowerCase()}</button>
                  ))}
                  {o.canCancel && <button onClick={() => setConfirmCancel(true)} disabled={busy} className="btn border border-danger/40 text-danger hover:bg-danger hover:text-white">Cancel order</button>}
                </div>
                <p className="text-xs text-ink-muted">Lifecycle: Confirmed → Processing → Shipped → Delivered. Cancelling releases reserved stock{o.isDemo ? ' and records a demo refund' : ''}.</p>
              </>
            )}
          </div>
          <div className="card space-y-1 p-6 text-sm">
            <h2 className="mb-2 text-2xl">Customer</h2>
            <p className="text-walnut">{o.customerName}</p>
            <p className="text-ink-muted">{o.email} · {o.phone}</p>
            {o.user && <Link to={`/admin/customers/${o.user.id}`} className="text-xs text-gold-dark hover:text-walnut">View customer →</Link>}
            <p className="field-label !mt-4">Ship to</p>
            <p className="text-ink-soft">{o.shipName}, {o.shipPhone}</p>
            <p className="text-ink-muted">{o.shipLine1}{o.shipLine2 ? `, ${o.shipLine2}` : ''}, {o.shipCity}, {o.shipState} {o.shipPostalCode}</p>
            {o.notes && <><p className="field-label !mt-4">Customer note</p><p className="text-ink-soft">{o.notes}</p></>}
          </div>
          <div className="card p-6 text-sm">
            <h2 className="mb-3 text-2xl">Payments</h2>
            {o.payments.map((p) => (
              <div key={p.id} className="border-b border-line py-2 last:border-0">
                <div className="flex items-center justify-between"><span>{p.provider}{p.isDemo && ' (simulated)'}</span><StatusBadge status={p.status} /></div>
                <p className="text-xs text-ink-muted">{formatINR(p.amountPaise)} · {formatDateTime(p.createdAt)}</p>
                {p.providerPaymentId && <p className="text-xs text-ink-muted">Ref: {p.providerPaymentId}</p>}
                {p.failureReason && <p className="text-xs text-danger">{p.failureReason}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <ConfirmDialog open={confirmCancel} title="Cancel this order?" message="Stock will be returned to inventory. Paid orders will be marked refunded (demo refunds do not move money)." confirmLabel="Cancel order" busy={busy} onConfirm={() => update('CANCELLED')} onClose={() => setConfirmCancel(false)} />
    </>
  );
}
