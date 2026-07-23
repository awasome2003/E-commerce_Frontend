import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { shopApi } from '../../lib/shop-api'
import { dateTime } from '../../lib/format'
import { ErrorNote, Spinner } from '../../components/ui'

/**
 * The customer's own notifications — order updates, request outcomes.
 *
 * Opening the page marks them read (clearing the header bell); the list still
 * highlights the ones that were unread when it loaded.
 */
function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function BagIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

export default function NotificationsPage() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    shopApi
      .listNotifications()
      .then((res) => {
        setItems(res.items ?? [])
        if ((res.unread ?? 0) > 0) shopApi.markNotificationsRead().catch(() => {})
      })
      .catch((err) => setError(err.message))
  }, [])

  if (error) return <ErrorNote error={error} />
  if (!items) return <Spinner />

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Notifications</h1>
          <p className="page-sub">Updates about your requests and orders.</p>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="empty">
          <h2>No notifications</h2>
          <p>Updates about your requests and orders will appear here.</p>
        </div>
      ) : (
        <div className="notif-list">
          {items.map((n) => (
            <article key={n.id} className={`notif-item${n.is_read ? '' : ' is-unread'}`}>
              <span className={`notif-icon${n.order_id ? ' is-order' : ''}`}>
                {n.order_id ? <BagIcon /> : <BellIcon />}
              </span>
              <div className="notif-body">
                <div className="notif-top">
                  <span className="notif-title">{n.title}</span>
                  {!n.is_read && <span className="notif-dot" aria-label="unread" />}
                </div>
                <p className="notif-msg">{n.message}</p>
                <div className="muted-xs">
                  {dateTime(n.created_at)}
                  {n.order_id && (
                    <>
                      {' · '}
                      <Link to={`/orders/${n.order_id}`} className="link">
                        Order #{n.order_id}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
