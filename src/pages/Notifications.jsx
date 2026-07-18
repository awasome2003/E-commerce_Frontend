import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { dateTime } from '../lib/format'
import { PageHeader, Pagination, Badge, ErrorNote, Spinner } from '../components/ui'

/**
 * Read-only: Admin holds only `read` on Notification in the permission matrix.
 */
export default function Notifications() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 350)
    return () => clearTimeout(id)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debounced])

  useEffect(() => {
    let cancelled = false
    setError('')
    api
      .listNotifications({ search: debounced, page, limit: 25 })
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [debounced, page])

  const noise = data ? Math.round((1 - data.total / data.raw_total) * 100) : 0

  return (
    <>
      <PageHeader title="Notifications" subtitle="Messages sent to customers and staff" />

      {data && data.raw_total > data.total && (
        // The legacy app writes one message row per recipient instead of one
        // message plus recipients, so the raw table is mostly duplicates.
        <div className="note note-muted">
          Showing <strong>{data.total.toLocaleString('en-IN')}</strong> unique messages collapsed from{' '}
          <strong>{data.raw_total.toLocaleString('en-IN')}</strong> rows ({noise}% duplicates). The
          app creates a separate message per recipient rather than one message with many recipients —
          the duplicates are real rows, hidden here for readability.
        </div>
      )}

      <div className="filters">
        <input
          className="input"
          placeholder="Search title or message…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <ErrorNote error={error} />

      {!data ? (
        <Spinner />
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Message</th>
                <th>Order</th>
                <th>Audience</th>
                <th className="right">Recipients</th>
                <th className="right">Copies</th>
                <th>Sent</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((n) => (
                <tr key={n.id}>
                  <td>
                    <div className="cell-title">{n.title}</div>
                    <div className="muted-xs">{n.message}</div>
                  </td>
                  <td>
                    {n.order_id ? (
                      <Link to={`/orders/${n.order_id}`} className="link">
                        #{n.order_id}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <Badge tone={n.is_admin ? 'violet' : 'blue'}>{n.is_admin ? 'Staff' : 'Customer'}</Badge>
                  </td>
                  <td className="right">{n.recipients}</td>
                  <td className="right">
                    {n.duplicates > 1 ? <span className="warn">×{n.duplicates}</span> : '1'}
                  </td>
                  <td className="muted-xs">{dateTime(n.created_at)}</td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-row">
                    No notifications match this search.
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
