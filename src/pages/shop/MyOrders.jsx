import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { shopApi } from '../../lib/shop-api'
import { money, dateTime } from '../../lib/format'
import { StatusBadge, ErrorNote, Spinner, Badge } from '../../components/ui'

export default function MyOrders() {
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    shopApi.listOrders().then(setOrders).catch((err) => setError(err.message))
  }, [])

  if (error) return <ErrorNote error={error} />
  if (!orders) return <Spinner />

  return (
    <>
      <header className="page-head">
        <div>
          <h1>My orders</h1>
          <p className="page-sub">Everything you have placed.</p>
        </div>
      </header>

      {orders.length === 0 ? (
        <div className="empty">
          <h2>No orders yet</h2>
          <p>
            <Link to="/" className="link">
              Start shopping
            </Link>
          </p>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Outlet</th>
                <th className="right">Items</th>
                <th className="right">Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <div className="cell-title">#{o.id}</div>
                    <div className="muted-xs">{dateTime(o.created_at)}</div>
                  </td>
                  <td>{o.user_outlets?.outlet_name || '—'}</td>
                  <td className="right">{o._count.order_products}</td>
                  <td className="right">{money(o.total_order_value)}</td>
                  <td>
                    <Badge tone={o.payment_recevied ? 'green' : 'amber'}>
                      {o.payment_recevied ? 'Received' : 'Pending'}
                    </Badge>
                  </td>
                  <td>
                    <StatusBadge status={o.order_status} />
                  </td>
                  <td className="right">
                    <Link to={`/orders/${o.id}`} className="link">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
