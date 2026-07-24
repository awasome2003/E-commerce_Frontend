import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, ChevronDown, ShoppingCart, Plus } from 'lucide-react'
import { shopApi } from '../../lib/shop-api'
import { useCart } from '../../context/CartContext'
import { money } from '../../lib/format'
import { PageHeader, Card, Spinner, ErrorBox, EmptyState, fieldLabel, inputClass } from '../../components/shop/ui'
import OutletsPage from './OutletsPage'

export default function CheckoutPage() {
  const { cart, refreshCart } = useCart()
  const navigate = useNavigate()

  const [outlets, setOutlets] = useState(null)
  const [outletId, setOutletId] = useState('')
  const [phoneId, setPhoneId] = useState('')
  const [quote, setQuote] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [addingOutlet, setAddingOutlet] = useState(false)

  function loadOutlets(selectId) {
    return shopApi
      .listOutlets()
      .then((rows) => {
        setOutlets(rows)
        setOutletId((prev) => String(selectId ?? prev ?? '') || String(rows[0]?.id ?? ''))
      })
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    loadOutlets()
  }, [])

  // Re-quote whenever the outlet changes: under PER_KM the charge depends on
  // which outlet it is going to.
  useEffect(() => {
    if (!outletId) return
    setError('')
    shopApi
      .quoteCheckout(outletId)
      .then(setQuote)
      .catch((err) => setError(err.message))
  }, [outletId])

  useEffect(() => {
    const outlet = outlets?.find((o) => String(o.id) === String(outletId))
    setPhoneId(String(outlet?.outlet_phones?.[0]?.id ?? ''))
  }, [outletId, outlets])

  async function placeOrder() {
    setBusy(true)
    setError('')
    try {
      const res = await shopApi.checkout(Number(outletId), phoneId ? Number(phoneId) : undefined)
      await refreshCart()
      navigate(`/orders/${res.order_id}`, { state: { justPlaced: true, note: res.delivery_note } })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!cart || outlets === null) return <Spinner />

  if (cart.items.length === 0) {
    return (
      <EmptyState icon={ShoppingCart} title="Your cart is empty" message="Add products before checking out.">
        <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl">
          Browse products
        </Link>
      </EmptyState>
    )
  }

  const selectedOutlet = outlets.find((o) => String(o.id) === String(outletId))

  return (
    <div className="space-y-5">
      <PageHeader title="Checkout" subtitle="Confirm where this order is going.">
        <Link to="/cart" className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50">
          <ArrowLeft size={15} /> Back to cart
        </Link>
      </PageHeader>

      <ErrorBox error={error} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
        {/* Deliver to */}
        <Card className="lg:col-span-3 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <MapPin size={18} className="text-amber-500" /> Deliver to
            </h2>
            {outlets.length > 0 && !addingOutlet && (
              <button onClick={() => setAddingOutlet(true)} className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600 hover:text-amber-700">
                <Plus size={15} /> Add outlet
              </button>
            )}
          </div>

          {/* Ordering requires an outlet, and half the customer base has none —
              so the checkout has to be able to create one inline. */}
          {outlets.length === 0 || addingOutlet ? (
            <OutletsPage
              compact
              onCreated={(id) => {
                setAddingOutlet(false)
                loadOutlets(id)
              }}
            />
          ) : (
            <div className="space-y-4">
              <div>
                <label className={fieldLabel}>Outlet</label>
                <div className="relative">
                  <select className={inputClass + ' appearance-none pr-10 cursor-pointer'} value={outletId} onChange={(e) => setOutletId(e.target.value)}>
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>{o.outlet_name} — {o.outlet_address.slice(0, 40)}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {selectedOutlet?.outlet_phones?.length > 0 && (
                <div>
                  <label className={fieldLabel}>Contact for delivery</label>
                  <div className="relative">
                    <select className={inputClass + ' appearance-none pr-10 cursor-pointer'} value={phoneId} onChange={(e) => setPhoneId(e.target.value)}>
                      {selectedOutlet.outlet_phones.map((p) => (
                        <option key={p.id} value={p.id}>{p.contact_person_name} · {p.phone_number}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              )}

              {selectedOutlet && (
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm space-y-1.5">
                  <div className="text-slate-500">{selectedOutlet.outlet_address}</div>
                  {selectedOutlet.outlet_gstin && <div className="text-xs text-slate-400">GSTIN {selectedOutlet.outlet_gstin}</div>}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Order summary */}
        <Card className="lg:col-span-2 p-6 lg:sticky lg:top-4 space-y-4">
          <h2 className="font-bold text-slate-800">Order summary</h2>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {cart.items.map((i) => (
              <div key={i.id} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="text-slate-700 line-clamp-1">{i.product.product_name}</div>
                  <div className="text-xs text-slate-400">{i.quantity} × {money(i.unit_price)}</div>
                </div>
                <span className="font-medium text-slate-700 shrink-0">{money(i.line_total)}</span>
              </div>
            ))}
          </div>

          <dl className="space-y-2.5 text-sm border-t border-slate-100 pt-4">
            <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="font-medium text-slate-700">{money(quote?.cart_total ?? cart.cart_total)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Delivery</dt><dd className="font-medium text-slate-700">{quote ? money(quote.delivery.amount) : '—'}</dd></div>
            <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
              <dt className="font-semibold text-slate-800">Total</dt>
              <dd className="text-xl font-bold text-slate-800">{money(quote?.total ?? cart.cart_total)}</dd>
            </div>
          </dl>

          {quote?.delivery?.reason && <p className="text-xs text-slate-400">{quote.delivery.reason}</p>}

          <button
            onClick={placeOrder}
            disabled={busy || !outletId}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Placing order…' : 'Place order'}
          </button>
        </Card>
      </div>
    </div>
  )
}
