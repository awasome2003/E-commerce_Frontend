import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useShop } from '../../context/ShopContext'
import { money } from '../../lib/format'
import { ErrorNote, Spinner, Badge } from '../../components/ui'

const SOURCE_NOTE = {
  user_flat: 'Your price',
  user_tier: 'Your bulk deal',
  category_flat: 'Your price',
  category_tier: 'Your bulk deal',
  global_tier: 'Bulk deal',
}

export default function CartPage() {
  const { cart, updateQuantity, removeItem } = useShop()
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

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Your cart</h1>
          <p className="page-sub">Prices update as your quantities cross bulk breaks.</p>
        </div>
      </header>

      <ErrorNote error={error} />

      {cart.items.length === 0 ? (
        <div className="empty">
          <h2>Your cart is empty</h2>
          <p>
            <Link to="/" className="link">
              Browse products
            </Link>
          </p>
        </div>
      ) : (
        <div className="grid-2">
          <section className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="right">Quantity</th>
                  <th className="right">Each</th>
                  <th className="right">Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {cart.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="cell-media">
                        {item.product.product_images?.[0]?.image_url ? (
                          <img src={item.product.product_images[0].image_url} alt="" className="thumb" />
                        ) : (
                          <span className="thumb thumb-empty" />
                        )}
                        <div>
                          <div className="cell-title">{item.product.product_name}</div>
                          {SOURCE_NOTE[item.price_source] && (
                            <Badge tone={item.price_source.startsWith('user') ? 'violet' : 'blue'}>
                              {SOURCE_NOTE[item.price_source]}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="right">
                      <div className="stepper">
                        <button type="button" onClick={() => change(item.id, item.quantity - 1)} disabled={busy === item.id || item.quantity <= 1}>
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button type="button" onClick={() => change(item.id, item.quantity + 1)} disabled={busy === item.id}>
                          +
                        </button>
                      </div>
                    </td>
                    <td className="right">{item.purchasable ? money(item.unit_price) : '—'}</td>
                    <td className="right">{item.purchasable ? money(item.line_total) : '—'}</td>
                    <td className="right">
                      <button type="button" className="link link-btn link-danger" onClick={() => remove(item.id)} disabled={busy === item.id}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card">
            <h2 className="card-title">Summary</h2>
            <dl className="totals">
              <div>
                <dt>Items</dt>
                <dd>{cart.items.reduce((n, i) => n + i.quantity, 0)} pieces</dd>
              </div>
              <div>
                <dt>Subtotal</dt>
                <dd>{money(cart.cart_total)}</dd>
              </div>
              {cart.tax_included > 0 && (
                <div>
                  {/* Prices are tax-inclusive — this is already inside the subtotal. */}
                  <dt>Includes tax</dt>
                  <dd>{money(cart.tax_included)}</dd>
                </div>
              )}
            </dl>

            {unpriceable.length > 0 && (
              <div className="note note-error">
                {unpriceable.length} item(s) have no price and must be removed before you can order.
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => navigate('/checkout')}
              disabled={unpriceable.length > 0}
            >
              Continue to checkout
            </button>
            <p className="muted-xs">Delivery is calculated at checkout.</p>
          </section>
        </div>
      )}
    </>
  )
}
