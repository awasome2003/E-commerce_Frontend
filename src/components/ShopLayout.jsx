import { NavLink, Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useShop } from '../context/ShopContext'
import { fullName } from '../lib/format'

/**
 * The storefront shell.
 *
 * The whole storefront needs an account — catalogue included. Prices here are
 * negotiated per customer and are not public information, so there is no guest
 * view: an unauthenticated visitor is sent to sign in or register.
 */
export default function ShopLayout() {
  const { customer, itemCount, loading, logout } = useShop()
  const navigate = useNavigate()
  const location = useLocation()

  if (loading) return <div className="page-loading">Loading…</div>
  if (!customer) return <Navigate to="/login" state={{ from: location }} replace />

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
          <NavLink to="/outlets" className={({ isActive }) => `shop-link${isActive ? ' is-active' : ''}`}>
            Outlets
          </NavLink>
          <NavLink to="/cart" className={({ isActive }) => `shop-link${isActive ? ' is-active' : ''}`}>
            Cart
            {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
          </NavLink>
        </nav>

        <div className="shop-who">
          <span className="muted-xs">{fullName(customer)}</span>
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
