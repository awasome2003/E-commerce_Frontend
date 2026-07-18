import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { shopApi } from '../../lib/shop-api'
import { money, dateTime, statusLabel } from '../../lib/format'
import { StatusBadge, ErrorNote, Spinner } from '../../components/ui'

const PIPELINE = ['Placed', 'Packed', 'Dispatched', 'Out_for_delivery', 'Delivered']

export default function MyOrderDetail() {
  const { id } = useParams()
  const location = useLocation()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    shopApi.getOrder(id).then(setOrder).catch((err) => setError(err.message))
  }, [id])

  if (error && !order) return <ErrorNote error={error} />
  if (!order) return <Spinner />

  const step = PIPELINE.indexOf(order.order_status)

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Order #{order.id}</h1>
          <p className="page-sub">{dateTime(order.created_at)}</p>
        </div>
        <Link to="/orders" className="btn btn-ghost btn-sm">
          All orders
        </Link>
      </header>

      {location.state?.justPlaced && (
        <div className="note note-success">
          Thanks — your order is placed. {location.state.note || ''}
        </div>
      )}

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Progress</h2>
          <StatusBadge status={order.order_status} />
        </div>
        {/* Read-only for customers — only staff move an order along. */}
        <ol className="pipeline">
          {PIPELINE.map((s, i) => (
            <li key={s} className={`pipeline-step${i <= step ? ' is-done' : ''}`}>
              <span className="pipeline-dot pipeline-dot-static">{i + 1}</span>
              <span className="pipeline-label">{statusLabel(s)}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid-2">
        <section className="card">
          <h2 className="card-title">Items</h2>
          <table className="table table-compact">
            <thead>
              <tr>
                <th>Product</th>
                <th className="right">Qty</th>
                <th className="right">Each</th>
                <th className="right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.order_products.map((i) => (
                <tr key={i.id}>
                  <td>{i.products?.product_name || '—'}</td>
                  <td className="right">{i.quantity}</td>
                  <td className="right">{money(i.unit_price)}</td>
                  <td className="right">{money((i.unit_price ?? 0) * i.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{money(order.cart_price)}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>{money(order.delivery_charge)}</dd>
            </div>
            {order.discount > 0 && (
              <div>
                <dt>Discount</dt>
                <dd>−{money(order.discount)}</dd>
              </div>
            )}
            <div className="totals-grand">
              <dt>Total</dt>
              <dd>{money(order.total_order_value)}</dd>
            </div>
          </dl>
        </section>

        <div className="stack">
          <section className="card">
            <h2 className="card-title">Delivery</h2>
            {order.user_outlets ? (
              <dl className="facts">
                <div>
                  <dt>Outlet</dt>
                  <dd>{order.user_outlets.outlet_name}</dd>
                </div>
                <div>
                  <dt>Address</dt>
                  <dd>{order.user_outlets.outlet_address}</dd>
                </div>
                {order.outlet_phones && (
                  <div>
                    <dt>Contact</dt>
                    <dd>
                      {order.outlet_phones.contact_person_name} · {order.outlet_phones.phone_number}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="muted">No outlet on this order.</p>
            )}
          </section>

          {order.order_invoice?.length > 0 && (
            <section className="card">
              <h2 className="card-title">Invoice</h2>
              <ul className="plain-list">
                {order.order_invoice.map((inv, i) => (
                  <li key={i}>
                    <a href={inv.invoice_url} target="_blank" rel="noreferrer" className="link">
                      Invoice #{inv.invoice_number ?? order.id}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  )
}
