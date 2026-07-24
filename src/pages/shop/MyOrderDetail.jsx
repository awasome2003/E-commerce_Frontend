import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Check, MapPin, FileText, ExternalLink } from 'lucide-react'
import { shopApi } from '../../lib/shop-api'
import { money, dateTime, statusLabel } from '../../lib/format'
import { PageHeader, Card, Spinner, ErrorBox, StatusBadge } from '../../components/shop/ui'

const PIPELINE = ['Placed', 'Packed', 'Dispatched', 'Out_for_delivery', 'Delivered']

export default function MyOrderDetail() {
  const { id } = useParams()
  const location = useLocation()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    shopApi.getOrder(id).then(setOrder).catch((err) => setError(err.message))
  }, [id])

  if (error && !order) return <ErrorBox error={error} />
  if (!order) return <Spinner />

  const step = PIPELINE.indexOf(order.order_status)

  return (
    <div className="space-y-5">
      <PageHeader title={`Order #${order.id}`} subtitle={dateTime(order.created_at)}>
        <Link to="/orders" className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50">
          <ArrowLeft size={15} /> All orders
        </Link>
      </PageHeader>

      {location.state?.justPlaced && (
        <div className="rounded-xl bg-emerald-50 text-emerald-700 text-sm px-4 py-3 flex items-start gap-2.5">
          <CheckCircle2 size={18} className="mt-px shrink-0" />
          <span>Thanks — your order is placed. {location.state.note || ''}</span>
        </div>
      )}

      {/* Progress */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-slate-800">Progress</h2>
          <StatusBadge status={order.order_status} />
        </div>
        {/* Read-only for customers — only staff move an order along. */}
        <ol className="flex items-center">
          {PIPELINE.map((s, i) => {
            const done = i <= step
            const lineDone = i < step
            return (
              <li key={s} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <span className={`w-9 h-9 grid place-items-center rounded-full text-sm font-bold transition-colors ${
                    done ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {done ? <Check size={16} className="stroke-[3]" /> : i + 1}
                  </span>
                  <span className={`text-[11px] font-medium text-center leading-tight ${done ? 'text-slate-700' : 'text-slate-400'}`}>
                    {statusLabel(s)}
                  </span>
                </div>
                {i < PIPELINE.length - 1 && (
                  <span className={`h-0.5 flex-1 mx-1 -mt-6 rounded ${lineDone ? 'bg-amber-500' : 'bg-slate-100'}`} />
                )}
              </li>
            )
          })}
        </ol>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
        {/* Items + totals */}
        <Card className="lg:col-span-3 p-6">
          <h2 className="font-bold text-slate-800 mb-4">Items</h2>
          <div className="divide-y divide-slate-100">
            {order.order_products.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <div className="text-slate-700">{i.products?.product_name || '—'}</div>
                  <div className="text-xs text-slate-400">{i.quantity} × {money(i.unit_price)}</div>
                </div>
                <span className="font-medium text-slate-800 shrink-0">{money((i.unit_price ?? 0) * i.quantity)}</span>
              </div>
            ))}
          </div>

          <dl className="space-y-2.5 text-sm border-t border-slate-100 pt-4 mt-2">
            <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="font-medium text-slate-700">{money(order.cart_price)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Delivery</dt><dd className="font-medium text-slate-700">{money(order.delivery_charge)}</dd></div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-600"><dt>Discount</dt><dd className="font-medium">−{money(order.discount)}</dd></div>
            )}
            <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
              <dt className="font-semibold text-slate-800">Total</dt>
              <dd className="text-xl font-bold text-slate-800">{money(order.total_order_value)}</dd>
            </div>
          </dl>
        </Card>

        {/* Delivery + invoice */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6">
            <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><MapPin size={17} className="text-amber-500" /> Delivery</h2>
            {order.user_outlets ? (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Outlet</div>
                  <div className="text-slate-700 mt-0.5">{order.user_outlets.outlet_name}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Address</div>
                  <div className="text-slate-600 mt-0.5">{order.user_outlets.outlet_address}</div>
                </div>
                {order.outlet_phones && (
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Contact</div>
                    <div className="text-slate-600 mt-0.5">{order.outlet_phones.contact_person_name} · {order.outlet_phones.phone_number}</div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No outlet on this order.</p>
            )}
          </Card>

          {order.order_invoice?.length > 0 && (
            <Card className="p-6">
              <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><FileText size={17} className="text-amber-500" /> Invoice</h2>
              <div className="space-y-2">
                {order.order_invoice.map((inv, i) => (
                  <a key={i} href={inv.invoice_url} target="_blank" rel="noreferrer"
                    className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <span>Invoice #{inv.invoice_number ?? order.id}</span>
                    <ExternalLink size={15} className="text-slate-400" />
                  </a>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
