import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, ShoppingBag } from 'lucide-react'
import { shopApi } from '../../lib/shop-api'
import { dateTime } from '../../lib/format'
import { PageHeader, Spinner, ErrorBox, EmptyState } from '../../components/shop/ui'

/**
 * The customer's own notifications — order updates, request outcomes.
 *
 * Opening the page marks them read (clearing the header bell); the list still
 * highlights the ones that were unread when it loaded.
 */
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

  if (error) return <ErrorBox error={error} />
  if (!items) return <Spinner />

  return (
    <div className="space-y-5">
      <PageHeader title="Notifications" subtitle="Updates about your requests and orders." />

      {items.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" message="Updates about your requests and orders will appear here." />
      ) : (
        <div className="space-y-2.5">
          {items.map((n) => {
            const Icon = n.order_id ? ShoppingBag : Bell
            return (
              <article
                key={n.id}
                className={`flex items-start gap-4 p-4 rounded-2xl border transition-colors ${
                  n.is_read ? 'bg-white border-slate-100' : 'bg-amber-50/50 border-amber-100'
                }`}
              >
                <span className={`w-10 h-10 grid place-items-center rounded-xl shrink-0 ${
                  n.order_id ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  <Icon size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{n.title}</span>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" aria-label="unread" />}
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{n.message}</p>
                  <div className="text-xs text-slate-400 mt-1.5">
                    {dateTime(n.created_at)}
                    {n.order_id && (
                      <>
                        {' · '}
                        <Link to={`/orders/${n.order_id}`} className="font-semibold text-amber-600 hover:text-amber-700">
                          Order #{n.order_id}
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
