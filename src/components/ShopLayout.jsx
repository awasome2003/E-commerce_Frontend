import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Bell, ShoppingCart, KeyRound } from 'lucide-react'
import { useSession } from '../context/SessionContext'
import { useCart } from '../context/CartContext'
import { shopApi } from '../lib/shop-api'
import { fullName } from '../lib/format'
import ChangePasswordModal from './ChangePasswordModal'

/**
 * The storefront shell — reference "B2B food portal" look (Poppins + amber).
 *
 * Access is decided by [RequireArea] before this renders, so there is no guest
 * view and no auth logic here — only the chrome. The whole storefront is wrapped
 * in `.sf` so the scoped Poppins font + link resets in tailwind.css apply.
 */
const NAV = [
  { to: '/', label: 'Products', end: true },
  { to: '/orders', label: 'My orders' },
  { to: '/requests', label: 'Requests' },
  { to: '/outlets', label: 'Outlets' },
]

export default function ShopLayout() {
  const { user, areas, logout } = useSession()
  const { productCount } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const [unread, setUnread] = useState(0)
  const [showPwd, setShowPwd] = useState(false)

  // Refresh the unread count on every route change — clears after visiting the
  // notifications page (which marks them read).
  useEffect(() => {
    let cancelled = false
    shopApi.listNotifications().then((r) => !cancelled && setUnread(r.unread ?? 0)).catch(() => {})
    return () => { cancelled = true }
  }, [location.pathname])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const linkClass = ({ isActive }) =>
    `px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
      isActive ? 'bg-amber-50 text-amber-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
    }`

  return (
    <div className="sf min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="max-w-[1280px] mx-auto px-5 h-16 flex items-center gap-4">
          <NavLink to="/" className="flex items-center gap-2.5 shrink-0">
            <span className="w-9 h-9 grid place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white font-extrabold text-sm shadow-sm">
              TJ
            </span>
            <span className="font-bold text-slate-800 hidden sm:block">Wholesale</span>
          </NavLink>

          <nav className="flex items-center gap-1 flex-1">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={linkClass}>
                {n.label}
              </NavLink>
            ))}
            <NavLink to="/cart" className={linkClass}>
              <span className="inline-flex items-center gap-1.5">
                <ShoppingCart size={16} />
                Cart
                {productCount > 0 && (
                  <span className="ml-0.5 min-w-5 h-5 px-1.5 grid place-items-center rounded-full bg-amber-500 text-white text-[11px] font-bold">
                    {productCount}
                  </span>
                )}
              </span>
            </NavLink>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <NavLink
              to="/notifications"
              title="Notifications"
              className={({ isActive }) =>
                `relative w-9 h-9 grid place-items-center rounded-xl transition-colors ${
                  isActive ? 'bg-amber-50 text-amber-600' : 'text-slate-500 hover:bg-slate-50'
                }`
              }
            >
              <Bell size={19} />
              {unread > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 grid place-items-center rounded-full bg-rose-500 text-white text-[10px] font-bold ring-2 ring-white">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </NavLink>
            {areas.staff && (
              <button
                onClick={() => navigate('/admin')}
                className="hidden sm:block px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Admin
              </button>
            )}
            <span className="hidden md:block text-sm text-slate-500 max-w-[140px] truncate">{fullName(user)}</span>
            <button
              onClick={() => setShowPwd(true)}
              title="Change password"
              className="w-9 h-9 grid place-items-center rounded-xl text-slate-500 hover:bg-slate-50"
            >
              <KeyRound size={18} />
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1280px] mx-auto px-5 py-7">
        <Outlet />
      </main>

      {showPwd && <ChangePasswordModal onClose={() => setShowPwd(false)} />}
    </div>
  )
}
