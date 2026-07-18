import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { money, dateTime, fullName, statusLabel } from '../lib/format'
import { PageHeader, Pagination, StatusBadge, Badge, ErrorNote, Spinner } from '../components/ui'

const STATUSES = ['Placed', 'Packed', 'Dispatched', 'Out_for_delivery', 'Delivered']

export default function Orders() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [status])

  useEffect(() => {
    let cancelled = false
    setError('')
    api
      .listOrders({ status, page, limit: 25 })
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [status, page])

  return (
    <>
      <PageHeader title="Orders" subtitle="Fulfilment pipeline and payment state" />

      <div className="tabs">
        <button type="button" className={`tab${status === '' ? ' is-active' : ''}`} onClick={() => setStatus('')}>
          All
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            className={`tab${status === s ? ' is-active' : ''}`}
            onClick={() => setStatus(s)}
          >
            {statusLabel(s)}
          </button>
        ))}
      </div>

      <ErrorNote error={error} />

      {!data ? (
        <Spinner />
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Outlet</th>
                <th className="right">Items</th>
                <th className="right">Value</th>
                <th>Payment</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.items.map((order) => (
                <tr key={order.id}>
                  <td>
                    <div className="cell-title">#{order.id}</div>
                    <div className="muted-xs">{dateTime(order.created_at)}</div>
                  </td>
                  <td>
                    {fullName(order.users)}
                    <div className="muted-xs">{order.users?.email || '—'}</div>
                  </td>
                  <td>
                    {order.user_outlets?.outlet_name || '—'}
                    <div className="muted-xs">{order.user_outlets?.outlet_state || ''}</div>
                  </td>
                  <td className="right">{order._count.order_products}</td>
                  <td className="right">
                    {money(order.total_order_value)}
                    {order.discount > 0 && <div className="muted-xs">−{money(order.discount)} disc.</div>}
                  </td>
                  <td>
                    <Badge tone={order.payment_recevied ? 'green' : 'amber'}>
                      {order.payment_recevied ? 'Received' : 'Pending'}
                    </Badge>
                  </td>
                  <td>
                    <StatusBadge status={order.order_status} />
                  </td>
                  <td className="right">
                    <Link to={`/orders/${order.id}`} className="link">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty-row">
                    No orders with this status.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
        </div>
      )}
    </>
  )
}
