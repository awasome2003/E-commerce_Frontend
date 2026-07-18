import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { shopApi } from '../../lib/shop-api'
import { useShop } from '../../context/ShopContext'
import { money } from '../../lib/format'
import { ErrorNote, Spinner } from '../../components/ui'
import OutletsPage from './OutletsPage'

export default function CheckoutPage() {
  const { cart, refreshCart } = useShop()
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
      <div className="empty">
        <h2>Your cart is empty</h2>
        <p>
          <Link to="/" className="link">
            Browse products
          </Link>
        </p>
      </div>
    )
  }

  const selectedOutlet = outlets.find((o) => String(o.id) === String(outletId))

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Checkout</h1>
          <p className="page-sub">Confirm where this order is going.</p>
        </div>
        <Link to="/cart" className="btn btn-ghost btn-sm">
          Back to cart
        </Link>
      </header>

      <ErrorNote error={error} />

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Deliver to</h2>
            {outlets.length > 0 && !addingOutlet && (
              <button type="button" className="link link-btn" onClick={() => setAddingOutlet(true)}>
                Add another outlet
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
            <>
              <label className="field">
                <span>Outlet</span>
                <select className="input" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.outlet_name} — {o.outlet_address.slice(0, 40)}
                    </option>
                  ))}
                </select>
              </label>

              {selectedOutlet?.outlet_phones?.length > 0 && (
                <label className="field">
                  <span>Contact for delivery</span>
                  <select className="input" value={phoneId} onChange={(e) => setPhoneId(e.target.value)}>
                    {selectedOutlet.outlet_phones.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.contact_person_name} · {p.phone_number}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {selectedOutlet && (
                <dl className="facts">
                  <div>
                    <dt>Address</dt>
                    <dd>{selectedOutlet.outlet_address}</dd>
                  </div>
                  {selectedOutlet.outlet_gstin && (
                    <div>
                      <dt>GSTIN</dt>
                      <dd>{selectedOutlet.outlet_gstin}</dd>
                    </div>
                  )}
                </dl>
              )}
            </>
          )}
        </section>

        <section className="card">
          <h2 className="card-title">Order summary</h2>

          <table className="table table-compact">
            <tbody>
              {cart.items.map((i) => (
                <tr key={i.id}>
                  <td>
                    {i.product.product_name}
                    <div className="muted-xs">
                      {i.quantity} × {money(i.unit_price)}
                    </div>
                  </td>
                  <td className="right">{money(i.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{money(quote?.cart_total ?? cart.cart_total)}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>{quote ? money(quote.delivery.amount) : '—'}</dd>
            </div>
            <div className="totals-grand">
              <dt>Total</dt>
              <dd>{money(quote?.total ?? cart.cart_total)}</dd>
            </div>
          </dl>

          {quote?.delivery?.reason && (
            <p className="muted-xs">{quote.delivery.reason}</p>
          )}

          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={placeOrder}
            disabled={busy || !outletId}
          >
            {busy ? 'Placing order…' : 'Place order'}
          </button>
        </section>
      </div>
    </>
  )
}
