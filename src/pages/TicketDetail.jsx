import { useEffect, useState, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { dateTime, fullName, money } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { PageHeader, ErrorNote, Spinner } from '../components/ui'

export default function TicketDetail() {
  const { id } = useParams()
  const { user, can } = useAuth()
  const canReply = can('Support', 'create')
  const canSetStatus = can('Support', 'update')

  const [ticket, setTicket] = useState(null)
  const [statuses, setStatuses] = useState([])
  const [reply, setReply] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const threadEnd = useRef(null)

  useEffect(() => {
    api.getTicket(id).then(setTicket).catch((err) => setError(err.message))
    api.ticketStatuses().then(setStatuses).catch(() => setStatuses([]))
  }, [id])

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ block: 'nearest' })
  }, [ticket?.chat_messages?.length])

  async function sendReply(event) {
    event.preventDefault()
    if (!reply.trim()) return
    setError('')
    setBusy(true)
    try {
      const created = await api.addTicketMessage(id, reply.trim())
      setTicket((prev) => ({ ...prev, chat_messages: [...prev.chat_messages, created] }))
      setReply('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function changeStatus(statusId) {
    setError('')
    setBusy(true)
    try {
      const updated = await api.updateTicketStatus(id, Number(statusId))
      setTicket((prev) => ({ ...prev, master_ticket_status: updated.master_ticket_status }))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (error && !ticket) return <ErrorNote error={error} />
  if (!ticket) return <Spinner />

  const status = ticket.master_ticket_status

  return (
    <>
      <PageHeader
        title={ticket.ticket_subject}
        subtitle={`Ticket #${ticket.ticket_number ?? ticket.id} · raised ${dateTime(ticket.created_at)}`}
      >
        <Link to="/tickets" className="btn btn-ghost btn-sm">
          Back to support
        </Link>
      </PageHeader>

      <ErrorNote error={error} />

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Conversation</h2>
            {canSetStatus ? (
              <select
                className="input input-inline"
                value={status?.id ?? ''}
                onChange={(e) => changeStatus(e.target.value)}
                disabled={busy}
              >
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            ) : (
              <span className="badge" style={{ color: status?.color, background: `${status?.color}1a` }}>
                {status?.title ?? '—'}
              </span>
            )}
          </div>

          <div className="thread-opening">
            <div className="muted-xs">{fullName(ticket.users)} wrote</div>
            <p>{ticket.ticket_description}</p>
          </div>

          {/* Ordered by `level`, which is this ticket's message sequence (1..N). */}
          <ul className="thread">
            {ticket.chat_messages.map((m) => {
              const mine = m.users?.id === user?.id
              const staff = m.users?.role_id !== 6
              return (
                <li key={m.id} className={`bubble-row${staff ? ' is-staff' : ''}`}>
                  <div className="bubble">
                    <div className="bubble-head">
                      <strong>{mine ? 'You' : fullName(m.users)}</strong>
                      <span className="muted-xs">{dateTime(m.created_at)}</span>
                    </div>
                    <p>{m.message}</p>
                  </div>
                </li>
              )
            })}
            {ticket.chat_messages.length === 0 && <p className="muted">No replies yet.</p>}
            <li ref={threadEnd} />
          </ul>

          {canReply && (
            <form className="reply" onSubmit={sendReply}>
              <textarea
                className="input"
                rows={3}
                placeholder="Write a reply…"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={busy || !reply.trim()}>
                {busy ? 'Sending…' : 'Send reply'}
              </button>
            </form>
          )}
        </section>

        <div className="stack">
          <section className="card">
            <h2 className="card-title">Details</h2>
            <dl className="facts">
              <div><dt>Customer</dt><dd>{fullName(ticket.users)}</dd></div>
              <div><dt>Email</dt><dd>{ticket.users?.email || '—'}</dd></div>
              <div><dt>Category</dt><dd>{ticket.master_ticket_category?.title || '—'}</dd></div>
              <div><dt>Status</dt><dd>{status?.title || '—'}</dd></div>
            </dl>
            {ticket.users?.id && (
              <Link to={`/customers/${ticket.users.id}`} className="link">
                View customer
              </Link>
            )}
          </section>

          {/* No ticket in this database links to an order, but the column exists. */}
          {ticket.orders && (
            <section className="card">
              <h2 className="card-title">Linked order</h2>
              <dl className="facts">
                <div><dt>Order</dt><dd>#{ticket.orders.id}</dd></div>
                <div><dt>Status</dt><dd>{ticket.orders.order_status?.replace(/_/g, ' ')}</dd></div>
                <div><dt>Value</dt><dd>{money(ticket.orders.total_order_value)}</dd></div>
              </dl>
              <Link to={`/orders/${ticket.orders.id}`} className="link">
                Open order
              </Link>
            </section>
          )}
        </div>
      </div>
    </>
  )
}
