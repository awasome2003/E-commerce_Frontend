import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { money, dateTime, fullName, statusLabel } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { PageHeader, StatusBadge, Badge, ErrorNote, Spinner } from '../components/ui'

const PIPELINE = ['Placed', 'Packed', 'Dispatched', 'Out_for_delivery', 'Delivered']

export default function OrderDetail() {
  const { id } = useParams()
  const { can } = useAuth()
  const editable = can('Orders', 'update')

  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.getOrder(id).then(setOrder).catch((err) => setError(err.message))
  }, [id])

  async function changeStatus(status) {
    setError('')
    setBusy(true)
    try {
      const updated = await api.updateOrderStatus(id, status)
      setOrder((prev) => ({ ...prev, order_status: updated.order_status }))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function togglePayment() {
    setError('')
    setBusy(true)
    try {
      const updated = await api.updateOrderPayment(id, !order.payment_recevied)
      setOrder((prev) => ({ ...prev, payment_recevied: updated.payment_recevied }))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (error && !order) return <ErrorNote error={error} />
  if (!order) return <Spinner />

  const currentStep = PIPELINE.indexOf(order.order_status)

  return (
    <>
      <PageHeader title={`Order #${order.id}`} subtitle={dateTime(order.created_at)}>
        <Link to="/orders" className="btn btn-ghost btn-sm">
          Back to orders
        </Link>
      </PageHeader>

      <ErrorNote error={error} />

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Fulfilment</h2>
          <div className="row-gap">
            <Badge tone={order.payment_recevied ? 'green' : 'amber'}>
              Payment {order.payment_recevied ? 'received' : 'pending'}
            </Badge>
            {editable && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={togglePayment} disabled={busy}>
                Mark {order.payment_recevied ? 'pending' : 'received'}
              </button>
            )}
          </div>
        </div>

        <ol className="pipeline">
          {PIPELINE.map((step, index) => (
            <li key={step} className={`pipeline-step${index <= currentStep ? ' is-done' : ''}`}>
              <button
                type="button"
                className="pipeline-dot"
                disabled={!editable || busy || step === order.order_status}
                onClick={() => changeStatus(step)}
                title={editable ? `Set status to ${statusLabel(step)}` : statusLabel(step)}
              >
                {index + 1}
              </button>
              <span className="pipeline-label">{statusLabel(step)}</span>
            </li>
          ))}
        </ol>
        {editable && <p className="muted-xs">Click any step to move the order to that status.</p>}
      </section>

      <div className="grid-2">
        <section className="card">
          <h2 className="card-title">Items</h2>
          <table className="table table-compact">
            <thead>
              <tr>
                <th>Product</th>
                <th className="right">Qty</th>
                <th className="right">Unit</th>
                <th className="right">Tax</th>
                <th className="right">Line</th>
              </tr>
            </thead>
            <tbody>
              {order.order_products.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.products?.product_name || '—'}
                    <div className="muted-xs">
                      {item.products?.hsn_code ? `HSN ${item.products.hsn_code}` : ''}
                    </div>
                  </td>
                  <td className="right">{item.quantity}</td>
                  <td className="right">{money(item.unit_price)}</td>
                  <td className="right">{item.tax != null ? `${item.tax}%` : '—'}</td>
                  <td className="right">{money((item.unit_price ?? 0) * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="totals">
            <div><dt>Cart</dt><dd>{money(order.cart_price)}</dd></div>
            <div><dt>Delivery</dt><dd>{money(order.delivery_charge)}</dd></div>
            {order.discount > 0 && <div><dt>Discount</dt><dd>−{money(order.discount)}</dd></div>}
            {order.credits_used > 0 && <div><dt>Credits used</dt><dd>−{money(order.credits_used)}</dd></div>}
            <div className="totals-grand"><dt>Total</dt><dd>{money(order.total_order_value)}</dd></div>
          </dl>
        </section>

        <div className="stack">
          <section className="card">
            <h2 className="card-title">Customer</h2>
            <dl className="facts">
              <div><dt>Name</dt><dd>{fullName(order.users)}</dd></div>
              <div><dt>Email</dt><dd>{order.users?.email || '—'}</dd></div>
              <div><dt>Phone</dt><dd>{order.users?.phone_number || '—'}</dd></div>
              <div><dt>GST</dt><dd>{order.users?.gst_number || '—'}</dd></div>
              <div><dt>Credit limit</dt><dd>{money(order.users?.credit_limit)}</dd></div>
            </dl>
            <Link to={`/customers/${order.users?.id}`} className="link">
              View customer
            </Link>
          </section>

          <section className="card">
            <h2 className="card-title">Delivery</h2>
            {order.user_outlets ? (
              <dl className="facts">
                <div><dt>Outlet</dt><dd>{order.user_outlets.outlet_name}</dd></div>
                <div><dt>Address</dt><dd>{order.user_outlets.outlet_address || '—'}</dd></div>
                <div><dt>Landmark</dt><dd>{order.user_outlets.outlet_landmark || '—'}</dd></div>
                <div><dt>State</dt><dd>{order.user_outlets.outlet_state || '—'}</dd></div>
                <div><dt>GSTIN</dt><dd>{order.user_outlets.outlet_gstin || '—'}</dd></div>
                <div><dt>FSSAI</dt><dd>{order.user_outlets.outlet_fssai || '—'}</dd></div>
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
              <p className="muted">No outlet linked to this order.</p>
            )}
          </section>

          {order.order_invoice?.length > 0 && (
            <section className="card">
              <h2 className="card-title">Invoices</h2>
              <ul className="plain-list">
                {order.order_invoice.map((inv) => (
                  <li key={inv.id}>
                    <a href={inv.invoice_url} target="_blank" rel="noreferrer" className="link">
                      Invoice #{inv.invoice_number ?? inv.id}
                    </a>
                    <span className="muted-xs"> · {money(inv.final_amount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {order.order_ratings?.length > 0 && (
            <section className="card">
              <h2 className="card-title">Rating</h2>
              {order.order_ratings.map((r, i) => (
                <div key={i}>
                  <strong>{r.rating_value} / 5</strong>
                  {r.feedback && <p className="muted">{r.feedback}</p>}
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </>
  )
}
