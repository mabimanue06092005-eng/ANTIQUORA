import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useSeo } from '../lib/seo';
import type { OrderDetail } from '../lib/types';
import { DemoBadge, ErrorState, Img, PageLoader, formatINR } from '../components/ui';
import { OrderTotals } from '../components/OrderTotals';

export default function OrderConfirmation() {
  const { orderNumber = '' } = useParams();
  useSeo({ title: 'Order confirmed', noindex: true });
  const { data: o, error, loading, reload } = useAsync(() => api.get<OrderDetail>(`/api/orders/${orderNumber}`), [orderNumber]);
  if (loading) return <PageLoader />;
  if (error || !o) return <div className="container-site py-20"><ErrorState message={error?.message ?? 'Order not found.'} onRetry={reload} /></div>;

  const paid = o.payments.find((p) => p.status === 'SUCCEEDED');
  return (
    <div className="container-site max-w-3xl py-16 md:py-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="text-center">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 160 }} className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-forest text-gold-light">
          <CheckCircle2 className="h-8 w-8" />
        </motion.div>
        <p className="eyebrow mt-6">Thank you, {o.customerName.split(' ')[0]}</p>
        <h1 className="mt-3 text-4xl md:text-6xl">Your order is confirmed</h1>
        <p className="mt-4 text-ink-muted">
          Order number <strong className="tabular-nums text-walnut">{o.orderNumber}</strong> · A confirmation has been recorded for {o.email}.
        </p>
        {o.isDemo && (
          <p className="mx-auto mt-5 inline-flex items-center gap-2 border border-dashed border-gold-dark/60 bg-gold-light/10 px-4 py-2 text-sm text-walnut">
            <DemoBadge /> This was a simulated DEMO payment — no money was charged.
          </p>
        )}
      </motion.div>

      <div className="card mt-12 p-6 md:p-8">
        <ul className="divide-y divide-line">
          {o.items.map((i) => (
            <li key={i.id} className="flex items-center gap-4 py-4">
              <div className="h-20 w-16 shrink-0 bg-parchment"><Img src={i.imageUrl ?? undefined} alt="" className="h-full w-full object-cover" /></div>
              <div className="flex-1">
                <Link to={`/artifact/${i.productSlug}`} className="font-serif text-lg text-walnut hover:text-gold-dark">{i.productName}</Link>
                <p className="text-xs text-ink-muted">Qty {i.quantity} · {formatINR(i.unitPricePaise)} each</p>
              </div>
              <p className="tabular-nums text-walnut">{formatINR(i.lineTotalPaise)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-6 grid gap-8 border-t border-line pt-6 md:grid-cols-2">
          <div className="text-sm">
            <p className="field-label">Shipping to</p>
            <p className="text-walnut">{o.shipName}</p>
            <p className="text-ink-muted">{o.shipLine1}{o.shipLine2 ? `, ${o.shipLine2}` : ''}</p>
            <p className="text-ink-muted">{o.shipCity}, {o.shipState} {o.shipPostalCode}</p>
            <p className="mt-3 field-label">Delivery</p>
            <p className="capitalize text-ink-muted">{o.deliveryMethod}</p>
            {paid && (
              <>
                <p className="mt-3 field-label">Payment</p>
                <p className="text-ink-muted">{paid.isDemo ? 'Demo gateway (simulated)' : paid.provider} · {formatINR(paid.amountPaise)}</p>
              </>
            )}
          </div>
          <OrderTotals totals={{ ...o, freeShippingApplied: o.shippingPaise === 0, couponError: null }} showShippingNote={false} />
        </div>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link to={`/account/orders/${o.orderNumber}`} className="btn-primary">Track this order</Link>
        <Link to="/shop" className="btn-outline">Continue browsing</Link>
      </div>
    </div>
  );
}
