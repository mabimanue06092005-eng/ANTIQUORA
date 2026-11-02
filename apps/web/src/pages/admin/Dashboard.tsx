import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, IndianRupee, Package, ShoppingCart, Table2, Timer, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { formatDate, formatINR } from '../../lib/format';
import { DemoBadge, ErrorState, Skeleton, StatusBadge } from '../../components/ui';
import { AdminTitle } from './AdminLayout';

interface Dash {
  totals: { orders: number; products: number; customers: number; revenuePaise: number; pendingOrders: number };
  lowStock: { id: string; name: string; sku: string; stock: number; slug: string }[];
  recentOrders: { id: string; orderNumber: string; customerName: string; status: string; totalPaise: number; createdAt: string; isDemo: boolean }[];
  salesByDay: { date: string; revenuePaise: number; orders: number }[];
  revenueByCategory: { name: string; revenuePaise: number }[];
}

const compactINR = (paise: number) => {
  const r = paise / 100;
  if (r >= 1e7) return `₹${(r / 1e7).toFixed(1)}Cr`;
  if (r >= 1e5) return `₹${(r / 1e5).toFixed(1)}L`;
  if (r >= 1e3) return `₹${(r / 1e3).toFixed(0)}k`;
  return `₹${r.toFixed(0)}`;
};

/** Single-series column chart (one hue, rounded data-ends, hover tooltip, table fallback). */
function SalesChart({ data }: { data: Dash['salesByDay'] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = Math.max(...data.map((d) => d.revenuePaise), 1);
  const W = 720;
  const H = 220;
  const pad = { l: 48, r: 8, t: 12, b: 26 };
  const bw = (W - pad.l - pad.r) / data.length;
  const ticks = [0, 0.5, 1].map((f) => f * max);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const total = data.reduce((s, d) => s + d.revenuePaise, 0);

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-sans text-sm font-medium text-walnut">Revenue · last 30 days</h2>
          <p className="text-xs text-ink-muted">Paid orders (confirmed → delivered), from stored order data · {formatINR(total)} total</p>
        </div>
        <button onClick={() => setTable((t) => !t)} className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-walnut" aria-pressed={table}>
          <Table2 className="h-3.5 w-3.5" /> {table ? 'Chart' : 'Table'}
        </button>
      </div>
      {table ? (
        <div className="max-h-[240px] overflow-auto">
          <table className="table-admin">
            <thead><tr><th>Date</th><th className="text-right">Orders</th><th className="text-right">Revenue</th></tr></thead>
            <tbody>{data.filter((d) => d.orders).map((d) => <tr key={d.date}><td>{formatDate(d.date)}</td><td className="text-right">{d.orders}</td><td className="text-right tabular-nums">{formatINR(d.revenuePaise)}</td></tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Revenue per day for the last 30 days, total ${formatINR(total)}`} onMouseLeave={() => setHover(null)}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#DDD0B8" strokeWidth="1" strokeDasharray={t ? '2 4' : undefined} />
                <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6E665A">{compactINR(t)}</text>
              </g>
            ))}
            {data.map((d, i) => {
              const x = pad.l + i * bw;
              const h = (H - pad.t - pad.b) * (d.revenuePaise / max);
              const barW = Math.max(2, bw - 4);
              return (
                <g key={d.date} onMouseEnter={() => setHover(i)}>
                  <rect x={x} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
                  {d.revenuePaise > 0 && (
                    <path
                      d={`M${x + 2},${y(0)} v${-(h - Math.min(4, h))} q0,-${Math.min(4, h)} ${Math.min(4, barW / 2)},-${Math.min(4, h)} h${barW - 2 * Math.min(4, barW / 2)} q${Math.min(4, barW / 2)},0 ${Math.min(4, barW / 2)},${Math.min(4, h)} v${h - Math.min(4, h)} z`}
                      fill={hover === i ? '#2D5240' : '#1F3B2D'}
                    />
                  )}
                  {i % 7 === 0 && <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#6E665A">{formatDate(d.date, { day: 'numeric', month: 'short' })}</text>}
                </g>
              );
            })}
          </svg>
          {hover !== null && (
            <div className="pointer-events-none absolute top-0 border border-line bg-ivory px-3 py-2 text-xs shadow-card" style={{ left: `${Math.min(80, ((pad.l + hover * bw) / W) * 100)}%` }}>
              <p className="font-medium text-walnut">{formatDate(data[hover].date)}</p>
              <p className="text-ink-soft">{formatINR(data[hover].revenuePaise)} · {data[hover].orders} order{data[hover].orders === 1 ? '' : 's'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CategoryBars({ data }: { data: Dash['revenueByCategory'] }) {
  const max = Math.max(...data.map((d) => d.revenuePaise), 1);
  return (
    <div className="card p-5">
      <h2 className="font-sans text-sm font-medium text-walnut">Revenue by category</h2>
      <p className="mb-4 text-xs text-ink-muted">All-time, paid orders</p>
      {data.length === 0 ? <p className="text-sm text-ink-muted">No paid orders yet.</p> : (
        <ul className="space-y-3">
          {data.map((d) => (
            <li key={d.name} title={`${d.name}: ${formatINR(d.revenuePaise)}`}>
              <div className="mb-1 flex justify-between text-xs"><span className="text-ink-soft">{d.name}</span><span className="tabular-nums text-walnut">{compactINR(d.revenuePaise)}</span></div>
              <div className="h-2 bg-parchment"><div className="h-full rounded-r bg-forest transition-all duration-700 hover:bg-forest-light" style={{ width: `${(d.revenuePaise / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { data, error, loading, reload } = useAsync(() => api.get<Dash>('/api/admin/dashboard'), []);
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  const t = data?.totals;
  const kpis = [
    { label: 'Revenue (paid orders)', value: t ? formatINR(t.revenuePaise) : '', icon: IndianRupee, to: '/admin/orders' },
    { label: 'Total orders', value: t?.orders, icon: ShoppingCart, to: '/admin/orders' },
    { label: 'Open orders', value: t?.pendingOrders, icon: Timer, to: '/admin/orders?status=CONFIRMED' },
    { label: 'Products', value: t?.products, icon: Package, to: '/admin/products' },
    { label: 'Customers', value: t?.customers, icon: Users, to: '/admin/customers' },
  ];
  return (
    <>
      <AdminTitle title="Dashboard">Store overview from live database data. Seeded orders are labelled demo.</AdminTitle>
      <ul className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map(({ label, value, icon: I, to }) => (
          <li key={label}>
            <Link to={to} className="card block p-5 transition-colors hover:border-gold">
              <I className="h-4 w-4 text-gold-dark" aria-hidden />
              <p className="mt-3 text-[11px] uppercase tracking-wider text-ink-muted">{label}</p>
              {loading ? <Skeleton className="mt-1 h-8 w-24" /> : <p className="mt-1 font-serif text-3xl text-walnut">{value}</p>}
            </Link>
          </li>
        ))}
      </ul>
      {loading || !data ? (
        <Skeleton className="h-72" />
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
            <SalesChart data={data.salesByDay} />
            <CategoryBars data={data.revenueByCategory} />
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <h2 className="font-sans text-sm font-medium text-walnut">Recent orders</h2>
                <Link to="/admin/orders" className="text-xs text-gold-dark hover:text-walnut">View all</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="table-admin">
                  <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th className="text-right">Total</th><th>Date</th></tr></thead>
                  <tbody>
                    {data.recentOrders.map((o) => (
                      <tr key={o.id}>
                        <td><Link to={`/admin/orders/${o.id}`} className="font-medium text-walnut hover:text-gold-dark">{o.orderNumber}</Link> {o.isDemo && <DemoBadge className="ml-1" />}</td>
                        <td className="whitespace-nowrap">{o.customerName}</td>
                        <td><StatusBadge status={o.status} /></td>
                        <td className="text-right tabular-nums">{formatINR(o.totalPaise)}</td>
                        <td className="whitespace-nowrap text-ink-muted">{formatDate(o.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card">
              <div className="border-b border-line px-5 py-4">
                <h2 className="flex items-center gap-2 font-sans text-sm font-medium text-walnut"><AlertTriangle className="h-4 w-4 text-amber-700" aria-hidden /> Low stock (≤ 2)</h2>
              </div>
              {data.lowStock.length === 0 ? <p className="p-5 text-sm text-ink-muted">All products are well stocked.</p> : (
                <ul className="divide-y divide-line">
                  {data.lowStock.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                      <Link to={`/admin/products/${p.id}`} className="min-w-0 truncate text-walnut hover:text-gold-dark">{p.name}</Link>
                      <span className={`shrink-0 text-xs font-medium ${p.stock === 0 ? 'text-danger' : 'text-amber-800'}`}>{p.stock === 0 ? 'Out of stock' : `${p.stock} left`}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
