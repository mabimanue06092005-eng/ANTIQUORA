import type { Totals } from '../lib/types';
import { formatINR } from '../lib/format';

export function OrderTotals({ totals, deliveryLabel, showShippingNote = true }: { totals: Totals; deliveryLabel?: string; showShippingNote?: boolean }) {
  return (
    <dl className="space-y-3 text-sm">
      <div className="flex justify-between">
        <dt className="text-ink-soft">Subtotal</dt>
        <dd className="tabular-nums text-walnut">{formatINR(totals.subtotalPaise)}</dd>
      </div>
      {totals.discountPaise > 0 && (
        <div className="flex justify-between text-success">
          <dt>Discount {totals.couponCode && <span className="text-xs">({totals.couponCode})</span>}</dt>
          <dd className="tabular-nums">−{formatINR(totals.discountPaise)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-ink-soft">Shipping {deliveryLabel && <span className="text-xs text-ink-muted">({deliveryLabel})</span>}</dt>
        <dd className="tabular-nums text-walnut">{totals.shippingPaise === 0 ? (totals.subtotalPaise > 0 ? 'Complimentary' : '—') : formatINR(totals.shippingPaise)}</dd>
      </div>
      {totals.taxPaise > 0 && (
        <div className="flex justify-between">
          <dt className="text-ink-soft">Tax</dt>
          <dd className="tabular-nums text-walnut">{formatINR(totals.taxPaise)}</dd>
        </div>
      )}
      <div className="flex items-baseline justify-between border-t border-line pt-4">
        <dt className="text-[13px] font-medium uppercase tracking-[0.12em] text-walnut">Total</dt>
        <dd className="font-serif text-3xl tabular-nums text-walnut">{formatINR(totals.totalPaise)}</dd>
      </div>
      {showShippingNote && <p className="text-xs leading-relaxed text-ink-muted">Prices include applicable taxes. Totals are calculated and verified on our server at checkout.</p>}
    </dl>
  );
}
