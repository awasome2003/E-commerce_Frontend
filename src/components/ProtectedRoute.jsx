import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, module, action = 'read' }) {
  const { user, loading, can } = useAuth()
  const location = useLocation()

  if (loading) return <div className="page-loading">Loading…</div>
  if (!user) return <Navigate to="/admin/login" state={{ from: location }} replace />

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
