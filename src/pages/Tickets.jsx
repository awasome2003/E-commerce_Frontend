import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { dateTime, fullName } from '../lib/format'
import { PageHeader, Pagination, ErrorNote, Spinner } from '../components/ui'

/** Status colours come from `master_ticket_status.color`, so the badge follows the data. */
function StatusChip({ status }) {
  if (!status) return <span className="badge tone-grey">—</span>
  return (
    <span
      className="badge"
      style={{ color: status.color || undefined, background: `${status.color || '#888'}1a` }}
    >
      {status.title}
    </span>
  )
}

export default function Tickets() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [statuses, setStatuses] = useState([])
  const [statusId, setStatusId] = useState('')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    api.ticketStatuses().then(setStatuses).catch(() => setStatuses([]))
  }, [])

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 350)
    return () => clearTimeout(id)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debounced, statusId])

  useEffect(() => {
    let cancelled = false
    setError('')
    api
      .listTickets({ search: debounced, status_id: statusId, page, limit: 25 })
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [debounced, statusId, page])

  return (
    <>
      <PageHeader title="Support" subtitle="Customer tickets and conversations" />

      <div className="tabs">
        <button type="button" className={`tab${statusId === '' ? ' is-active' : ''}`} onClick={() => setStatusId('')}>
          All
        </button>
        {statuses.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`tab${String(statusId) === String(s.id) ? ' is-active' : ''}`}
            onClick={() => setStatusId(String(s.id))}
          >
            {s.title}
          </button>
        ))}
      </div>

      <div className="filters">
        <input
          className="input"
          placeholder="Search subject, description or customer…"
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
                <th>Ticket</th>
                <th>Customer</th>
                <th>Category</th>
                <th className="right">Messages</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div className="cell-title">{t.ticket_subject}</div>
                    <div className="muted-xs">
                      #{t.ticket_number ?? t.id} · {dateTime(t.created_at)}
                    </div>
                  </td>
                  <td>
                    {fullName(t.users)}
                    <div className="muted-xs">{t.users?.email || '—'}</div>
                  </td>
                  <td>{t.master_ticket_category?.title || '—'}</td>
                  <td className="right">{t._count.chat_messages}</td>
                  <td>
                    <StatusChip status={t.master_ticket_status} />
                  </td>
                  <td className="right">
                    <Link to={`/admin/tickets/${t.id}`} className="link">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-row">
                    No tickets match these filters.
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
