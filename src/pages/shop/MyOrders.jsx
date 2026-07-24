import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, ArrowRight, ChevronRight } from 'lucide-react'
import { shopApi } from '../../lib/shop-api'
import { money, dateTime } from '../../lib/format'
import { PageHeader, Card, Spinner, ErrorBox, EmptyState, StatusBadge, Badge } from '../../components/shop/ui'

export default function MyOrders() {
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    shopApi.listOrders().then(setOrders).catch((err) => setError(err.message))
  }, [])

  if (error) return <ErrorBox error={error} />
  if (!orders) return <Spinner />

  return (
    <div className="space-y-5">
      <PageHeader title="My orders" subtitle="Everything you have placed." />

      {orders.length === 0 ? (
        <EmptyState icon={Package} title="No orders yet" message="When you place an order it will show up here.">
          <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl">
            Start shopping <ArrowRight size={16} />
          </Link>
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          {/* Table on desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[11px] font-semibold uppercase tracking-wide">
                  <th className="p-4">Order</th>
                  <th className="p-4">Outlet</th>
                  <th className="p-4 text-center">Items</th>
                  <th className="p-4 text-right">Total</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Status</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-slate-800">#{o.id}</div>
                      <div className="text-xs text-slate-400">{dateTime(o.created_at)}</div>
                    </td>
                    <td className="p-4 text-slate-600">{o.user_outlets?.outlet_name || '—'}</td>
                    <td className="p-4 text-center text-slate-600">{o._count.order_products}</td>
                    <td className="p-4 text-right font-bold text-slate-800">{money(o.total_order_value)}</td>
                    <td className="p-4"><Badge tone={o.payment_recevied ? 'green' : 'amber'}>{o.payment_recevied ? 'Received' : 'Pending'}</Badge></td>
                    <td className="p-4"><StatusBadge status={o.order_status} /></td>
                    <td className="p-4 text-right">
                      <Link to={`/orders/${o.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600 hover:text-amber-700">
                        View <ChevronRight size={15} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards on mobile */}
          <div className="md:hidden divide-y divide-slate-100">
            {orders.map((o) => (
              <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center gap-3 p-4 hover:bg-slate-50/60">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">#{o.id}</span>
                    <StatusBadge status={o.order_status} />
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{o.user_outlets?.outlet_name || '—'} · {o._count.order_products} items</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-slate-800">{money(o.total_order_value)}</div>
                  <div className="text-xs text-slate-400">{dateTime(o.created_at)}</div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
