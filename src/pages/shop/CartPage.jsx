import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Minus, Plus, Trash2, Package, ArrowRight } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { money } from '../../lib/format'
import { PageHeader, Card, Spinner, ErrorBox, EmptyState, PriceTag } from '../../components/shop/ui'

export default function CartPage() {
  const { cart, updateQuantity, removeItem } = useCart()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)

  async function change(id, quantity) {
    if (quantity < 1) return
    setBusy(id)
    setError('')
    try {
      // The whole cart is re-priced server-side: crossing a bulk break changes
      // the price of this line, so the response replaces everything.
      await updateQuantity(id, quantity)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  async function remove(id) {
    setBusy(id)
    setError('')
    try {
      await removeItem(id)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  if (!cart) return <Spinner />

  const unpriceable = cart.items.filter((i) => !i.purchasable)
  const pieces = cart.items.reduce((n, i) => n + i.quantity, 0)

  return (
    <div className="space-y-5">
      <PageHeader title="Your cart" subtitle="Prices update as your quantities cross bulk breaks." />

      <ErrorBox error={error} />

      {cart.items.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="Your cart is empty" message="Browse the catalogue and add products to get started.">
          <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl">
            Browse products <ArrowRight size={16} />
          </Link>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* Items */}
          <div className="lg:col-span-2 space-y-3">
            {cart.items.map((item) => {
              const img = item.product.product_images?.[0]?.image_url
              return (
                <Card key={item.id} className={`p-4 flex items-center gap-4 ${busy === item.id ? 'opacity-60' : ''}`}>
                  <div className="w-16 h-16 bg-slate-50 rounded-xl border border-slate-100 shrink-0 grid place-items-center overflow-hidden">
                    {img ? <img src={img} alt="" referrerPolicy="no-referrer" className="w-full h-full object-contain p-1.5" /> : <Package size={22} className="text-slate-300" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 leading-snug line-clamp-2">{item.product.product_name}</div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <PriceTag source={item.price_source} />
                      <span className="text-xs text-slate-400">{item.purchasable ? `${money(item.unit_price)} / pc` : 'No price'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-1 shrink-0">
                    <button onClick={() => change(item.id, item.quantity - 1)} disabled={busy === item.id || item.quantity <= 1}
                      className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40"><Minus size={15} /></button>
                    <span className="w-8 text-center font-semibold text-slate-800 text-sm">{item.quantity}</span>
                    <button onClick={() => change(item.id, item.quantity + 1)} disabled={busy === item.id}
                      className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><Plus size={15} /></button>
                  </div>

                  <div className="text-right shrink-0 w-24">
                    <div className="font-bold text-slate-800">{item.purchasable ? money(item.line_total) : '—'}</div>
                    <button onClick={() => remove(item.id)} disabled={busy === item.id}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600 transition-colors">
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Summary */}
          <Card className="p-6 lg:sticky lg:top-4 space-y-4">
            <h2 className="font-bold text-slate-800">Order summary</h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Items</dt><dd className="font-medium text-slate-700">{pieces} pieces</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="font-medium text-slate-700">{money(cart.cart_total)}</dd></div>
              {cart.tax_included > 0 && (
                <div className="flex justify-between text-xs"><dt className="text-slate-400">Includes tax</dt><dd className="text-slate-400">{money(cart.tax_included)}</dd></div>
              )}
              <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                <dt className="font-semibold text-slate-800">Total</dt>
                <dd className="text-xl font-bold text-slate-800">{money(cart.cart_total)}</dd>
              </div>
            </dl>

            {unpriceable.length > 0 && (
              <div className="rounded-xl bg-rose-50 text-rose-700 text-xs px-3.5 py-2.5 leading-relaxed">
                {unpriceable.length} item(s) have no price and must be removed before you can order.
              </div>
            )}

            <button
              onClick={() => navigate('/checkout')}
              disabled={unpriceable.length > 0}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to checkout <ArrowRight size={17} />
            </button>
            <p className="text-xs text-slate-400 text-center">Delivery is calculated at checkout.</p>
          </Card>
        </div>
      )}
    </div>
  )
}
