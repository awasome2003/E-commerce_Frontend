import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { money } from '../lib/format'
import { useSession } from '../context/SessionContext'
import { PageHeader, ErrorNote, Spinner, Badge } from '../components/ui'

/**
 * Customer product and order requests.
 *
 * Quote a per-unit price on each line, then approve — approving CONVERTS the
 * request into an order at those prices. A line for something not in the
 * catalogue blocks approval, so the panel says so before the button is pressed
 * rather than after.
 */

const TONE = { Pending: 'grey', Quoted: 'blue', Approved: 'green', Rejected: 'red' }
const STATUSES = ['Pending', 'Quoted', 'Approved', 'Rejected']

function customerName(user) {
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim()
  return name || user?.email || `Customer #${user?.id}`
}

function RequestCard({ request, onChanged, canQuote, canApprove }) {
  const [prices, setPrices] = useState(() =>
    Object.fromEntries(
      request.product_request_items.map((i) => [i.id, i.quoted_price ?? '']),
    ),
  )
  const [reply, setReply] = useState(request.admin_reply ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const settled = request.status === 'Approved' || request.status === 'Rejected'
  const unstocked = request.product_request_items.filter((i) => !i.product_id)
  // Both are hard blockers on conversion, checked here so the button explains
  // itself instead of failing with a 400 the admin cannot act on.
  const noOutlet = !request.outlet_id
  const blockers = [
    unstocked.length > 0 && `${unstocked.length} item(s) are not in the catalogue`,
    noOutlet && 'the customer has not chosen a delivery outlet',
  ].filter(Boolean)

  // Only lines that can go on an order line count; an unstocked line has no
  // product_id, so it is excluded rather than silently valued at zero.
  const estimate = request.product_request_items
    .filter((i) => i.product_id)
    .reduce((sum, i) => {
      const price = prices[i.id] === '' ? i.products?.inst_price ?? 0 : Number(prices[i.id])
      return sum + price * i.quantity
    }, 0)

  async function run(action) {
    setError('')
    setBusy(true)
    try {
      const body = {
        admin_reply: reply,
        items: request.product_request_items.map((i) => ({
          id: i.id,
          quoted_price: prices[i.id] === '' ? null : Number(prices[i.id]),
        })),
      }
      if (action === 'quote') await api.quoteRequest(request.id, body)
      if (action === 'approve') await api.approveRequest(request.id, { admin_reply: reply })
      if (action === 'reject') await api.rejectRequest(request.id, { admin_reply: reply })
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card">
      <div className="row-between">
        <h2 className="card-title">
          Request #{request.id} — {customerName(request.users)}
        </h2>
        <Badge tone={TONE[request.status] ?? 'grey'}>{request.status}</Badge>
      </div>

      <p className="muted">
        {request.user_outlets?.outlet_name ?? 'No outlet chosen yet'}
        {request.note ? ` — “${request.note}”` : ''}
      </p>

      <ErrorNote error={error} />

      <table className="table table-compact">
        <thead>
          <tr>
            <th>Item</th>
            <th className="right">Qty</th>
            <th className="right">Catalogue</th>
            <th className="right">Quoted (per unit)</th>
          </tr>
        </thead>
        <tbody>
          {request.product_request_items.map((item) => (
            <tr key={item.id}>
              <td>
                {item.products?.product_name ?? item.product_name}{' '}
                {item.product_id ? (
                  <Link to={`/admin/products/${item.product_id}`} className="muted">
                    #{item.product_id}
                  </Link>
                ) : (
                  <Badge tone="amber">not in catalogue</Badge>
                )}
              </td>
              <td className="right">{item.quantity}</td>
              <td className="right">
                {item.products ? money(item.products.inst_price) : '—'}
              </td>
              <td className="right">
                <input
                  className="input input-sm"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={item.products ? 'ladder price' : 'n/a'}
                  value={prices[item.id]}
                  disabled={settled || !canQuote || !item.product_id}
                  onChange={(e) => setPrices((p) => ({ ...p, [item.id]: e.target.value }))}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="muted">
        Estimated goods total: <strong>{money(estimate)}</strong> — delivery is added on approval.
        Lines left blank bill at this customer’s normal price.
      </p>

      {blockers.length > 0 && !settled && (
        <div className="note note-warning">
          This cannot become an order yet — {blockers.join(', and ')}.
          {unstocked.length > 0 && ' Create the missing items under Products first.'}
          {noOutlet && ' Ask the customer to pick an outlet on their request.'}
        </div>
      )}

      {request.order_id && (
        <div className="note note-success">
          Converted to <Link to={`/admin/orders/${request.order_id}`}>order #{request.order_id}</Link>.
        </div>
      )}

      {!settled && (
        <>
          <label className="field">
            <span>Reply to the customer</span>
            <textarea
              className="input"
              rows={2}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
            />
          </label>

          <div className="row-actions">
            {canQuote && (
              <button className="btn btn-ghost" disabled={busy} onClick={() => run('quote')}>
                Save quote
              </button>
            )}
            {canApprove && (
              <button
                className="btn btn-primary"
                disabled={busy || blockers.length > 0}
                onClick={() => run('approve')}
                title={blockers.length > 0 ? blockers.join('; ') : undefined}
              >
                Approve &amp; create order
              </button>
            )}
            {canQuote && (
              <button className="btn btn-danger" disabled={busy} onClick={() => run('reject')}>
                Reject
              </button>
            )}
          </div>
        </>
      )}
    </section>
  )
}

export default function Requests() {
  const { can } = useSession()
  const [rows, setRows] = useState(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  function load() {
    setError('')
    api
      .listRequests({ status })
      .then(setRows)
      .catch((err) => setError(err.message))
  }

  useEffect(load, [status])

  return (
    <>
      <PageHeader title="Requests" subtitle="Customer asks for products and bulk orders" />

      <div className="filters">
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <ErrorNote error={error} />

      {!rows ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <div className="empty">
          <h2>Nothing here</h2>
          <p>No requests match this filter.</p>
        </div>
      ) : (
        <div className="stack">
          {rows.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onChanged={load}
              canQuote={can('Requests', 'update')}
              canApprove={can('Requests', 'create')}
            />
          ))}
        </div>
      )}
    </>
  )
}
