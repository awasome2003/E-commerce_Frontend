import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { useCart } from '../context/CartContext'
import { shopApi } from '../lib/shop-api'
import { fullName } from '../lib/format'

/**
 * The storefront shell.
 *
 * Access is decided by [RequireArea] before this renders, so there is no guest
 * view and no auth logic here — only the chrome.
 */
export default function ShopLayout() {
  const { user, areas, logout } = useSession()
  const { itemCount } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const [unread, setUnread] = useState(0)

  // Refresh the unread count on every route change — so it clears after the
  // customer visits the notifications page (which marks them read).
  useEffect(() => {
    let cancelled = false
    shopApi
      .listNotifications()
      .then((res) => !cancelled && setUnread(res.unread ?? 0))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="shop">
      <header className="shop-bar">
        <NavLink to="/" className="brand">
          <span className="brand-mark">TJ</span>
          <span className="brand-text">Wholesale</span>
        </NavLink>

        <nav className="shop-nav">
          <NavLink to="/" end className={({ isActive }) => `shop-link${isActive ? ' is-active' : ''}`}>
            Products
          </NavLink>
          <NavLink to="/orders" className={({ isActive }) => `shop-link${isActive ? ' is-active' : ''}`}>
            My orders
          </NavLink>
          <NavLink to="/requests" className={({ isActive }) => `shop-link${isActive ? ' is-active' : ''}`}>
            Requests
          </NavLink>
          <NavLink to="/outlets" className={({ isActive }) => `shop-link${isActive ? ' is-active' : ''}`}>
            Outlets
          </NavLink>
          <NavLink to="/cart" className={({ isActive }) => `shop-link${isActive ? ' is-active' : ''}`}>
            Cart
            {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
          </NavLink>
        </nav>

        <div className="shop-who">
          <NavLink
            to="/notifications"
            className={({ isActive }) => `shop-bell${isActive ? ' is-active' : ''}`}
            title="Notifications"
            aria-label="Notifications"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unread > 0 && <span className="bell-count">{unread > 99 ? '99+' : unread}</span>}
          </NavLink>
          {/* Only shown to an account that also holds staff permissions. */}
          {areas.staff && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/admin')}>
              Admin
            </button>
          )}
          <span className="muted-xs">{fullName(user)}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="shop-main">
        <Outlet />
      </main>
    </div>
  )
}
