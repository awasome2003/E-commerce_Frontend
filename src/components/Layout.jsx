import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fullName } from '../lib/format'

/**
 * Sidebar entries are filtered by the same permission matrix the API enforces,
 * so a role never sees a link that would 403 when clicked.
 */
// The panel lives under /admin; the storefront owns the home page.
const NAV = [
  { to: '/admin', label: 'Dashboard', module: null, end: true },
  { to: '/admin/products', label: 'Products', module: 'Products' },
  { to: '/admin/orders', label: 'Orders', module: 'Orders' },
  { to: '/admin/documents', label: 'Documents', module: 'Orders' },
  { to: '/admin/customers', label: 'Customers', module: 'Customers' },
  { to: '/admin/tickets', label: 'Support', module: 'Support' },
  { to: '/admin/notifications', label: 'Notifications', module: 'Notification' },
  { to: '/admin/coupons', label: 'Coupons', module: 'Coupon' },
  { to: '/admin/banners', label: 'Banner ads', module: 'Banner Ads' },
  { to: '/admin/settings', label: 'Settings', module: 'Settings' },
]

export default function Layout() {
  const { user, logout, can } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/admin/login', { replace: true })
  }

  const visible = NAV.filter((item) => !item.module || can(item.module, 'read'))

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">TJ</span>
          <span className="brand-text">Admin</span>
        </div>

        <nav className="nav">
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="who">
            <div className="who-name">{fullName(user)}</div>
            <div className="who-role">{user?.role}</div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
