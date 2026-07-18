import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { money, dateTime, fullName } from '../lib/format'
import { PageHeader, StatusBadge, ErrorNote, Spinner } from '../components/ui'

const TILES = [
  { key: 'products', label: 'Products', hint: 'active_products' },
  { key: 'orders', label: 'Orders' },
  { key: 'customers', label: 'Customers' },
  { key: 'outlets', label: 'Outlets' },
  { key: 'open_tickets', label: 'Open tickets' },
]

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.dashboard().then(setData).catch((err) => setError(err.message))
  }, [])

  if (error) return <ErrorNote error={error} />
  if (!data) return <Spinner />

  const maxCount = Math.max(...data.orders_by_status.map((s) => s.count), 1)

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Live figures from the operational database" />

      <div className="tiles">
        <div className="tile tile-accent">
          <span className="tile-label">Revenue</span>
          <span className="tile-value">{money(data.totals.revenue)}</span>
          <span className="tile-hint">across {data.totals.orders} orders</span>
        </div>
        {TILES.map((tile) => (
          <div key={tile.key} className="tile">
            <span className="tile-label">{tile.label}</span>
            <span className="tile-value">{data.totals[tile.key].toLocaleString('en-IN')}</span>
            {tile.hint && (
              <span className="tile-hint">{data.totals[tile.hint].toLocaleString('en-IN')} active</span>
            )}
          </div>
        ))}
      </div>

      <div className="grid-2">
        <section className="card">
          <h2 className="card-title">Orders by status</h2>
          <ul className="bars">
            {data.orders_by_status.map((row) => (
              <li key={row.status}>
                <div className="bar-head">
                  <StatusBadge status={row.status} />
                  <span className="bar-count">{row.count}</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(row.count / maxCount) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="card-title">Recent orders</h2>
          <table className="table table-compact">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Status</th>
                <th className="right">Value</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link to={`/orders/${order.id}`} className="link">
                      #{order.id}
                    </Link>
                    <div className="muted-xs">{dateTime(order.created_at)}</div>
                  </td>
                  <td>
                    {fullName(order.users)}
                    <div className="muted-xs">{order.user_outlets?.outlet_name || '—'}</div>
                  </td>
                  <td>
                    <StatusBadge status={order.order_status} />
                  </td>
                  <td className="right">{money(order.total_order_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  )
}
