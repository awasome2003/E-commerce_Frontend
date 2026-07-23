import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from '../context/SessionContext'

/**
 * Gate for a whole area of the app.
 *
 * `area` is 'staff' or 'shop', both derived server-side from the permission
 * matrix. A signed-in user who lands in the wrong area is sent to the one they
 * do belong to rather than shown a dead end.
 *
 * `module`/`action` additionally gate a single screen on one permission.
 */
export default function RequireArea({ area, module, action = 'read', children }) {
  const { user, areas, loading, can, homePath } = useSession()
  const location = useLocation()

  if (loading) return <div className="page-loading">Loading…</div>
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  if (area && !areas[area]) {
    // Signed in, but this area is not theirs.
    return <Navigate to={homePath} replace />
  }

  if (module && !can(module, action)) {
    return (
      <div className="empty">
        <h2>No access</h2>
        <p>
          Your role (<strong>{user.role}</strong>) does not have <strong>{action}</strong>{' '}
          permission on <strong>{module}</strong>.
        </p>
      </div>
    )
  }

  return children
}
