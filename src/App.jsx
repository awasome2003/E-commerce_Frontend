import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SessionProvider } from './context/SessionContext'
import { CartProvider } from './context/CartContext'
import RequireArea from './components/RequireArea'
import Layout from './components/Layout'
import ShopLayout from './components/ShopLayout'

import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import ProductEdit from './pages/ProductEdit'
import ProductNew from './pages/ProductNew'
import Requests from './pages/Requests'
import RequestsPage from './pages/shop/RequestsPage'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
import Tickets from './pages/Tickets'
import TicketDetail from './pages/TicketDetail'
import Coupons from './pages/Coupons'
import Banners from './pages/Banners'
import Settings from './pages/Settings'
import Notifications from './pages/Notifications'
import Documents from './pages/Documents'

import Catalogue from './pages/shop/Catalogue'
import ProductPage from './pages/shop/ProductPage'
import CartPage from './pages/shop/CartPage'
import OutletsPage from './pages/shop/OutletsPage'
import CheckoutPage from './pages/shop/CheckoutPage'
import MyOrders from './pages/shop/MyOrders'
import MyOrderDetail from './pages/shop/MyOrderDetail'
import NotificationsPage from './pages/shop/NotificationsPage'

/**
 * One app, one session, two areas.
 *
 *   /login, /register   the single door for everyone
 *   /admin/*            staff area  — requires `areas.staff`
 *   /*                  storefront  — requires `areas.shop`
 *
 * Both areas are gated by the same permission matrix the API enforces, so the UI
 * can never offer something the server would refuse. Nothing routes on role names.
 */
export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <CartProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* ------------------------------------------------ staff area */}
            <Route
              path="/admin"
              element={
                <RequireArea area="staff">
                  <Layout />
                </RequireArea>
              }
            >
              <Route index element={<Dashboard />} />

              <Route path="products">
                <Route index element={<RequireArea area="staff" module="Products"><Products /></RequireArea>} />
                {/* Must precede ":id", which would otherwise capture "new" and
                    send it to the edit page as a product id. */}
                <Route path="new" element={<RequireArea area="staff" module="Products" action="create"><ProductNew /></RequireArea>} />
                <Route path=":id" element={<RequireArea area="staff" module="Products"><ProductEdit /></RequireArea>} />
              </Route>

              <Route path="orders">
                <Route index element={<RequireArea area="staff" module="Orders"><Orders /></RequireArea>} />
                <Route path=":id" element={<RequireArea area="staff" module="Orders"><OrderDetail /></RequireArea>} />
              </Route>

              <Route path="customers">
                <Route index element={<RequireArea area="staff" module="Customers"><Customers /></RequireArea>} />
                <Route path=":id" element={<RequireArea area="staff" module="Customers"><CustomerDetail /></RequireArea>} />
              </Route>

              <Route path="tickets">
                <Route index element={<RequireArea area="staff" module="Support"><Tickets /></RequireArea>} />
                <Route path=":id" element={<RequireArea area="staff" module="Support"><TicketDetail /></RequireArea>} />
              </Route>

              <Route path="requests" element={<RequireArea area="staff" module="Requests"><Requests /></RequireArea>} />
              <Route path="documents" element={<RequireArea area="staff" module="Orders"><Documents /></RequireArea>} />
              <Route path="notifications" element={<RequireArea area="staff" module="Notification"><Notifications /></RequireArea>} />
              <Route path="coupons" element={<RequireArea area="staff" module="Coupon"><Coupons /></RequireArea>} />
              <Route path="banners" element={<RequireArea area="staff" module="Banner Ads"><Banners /></RequireArea>} />
              <Route path="settings" element={<RequireArea area="staff" module="Settings"><Settings /></RequireArea>} />
            </Route>

            {/* ------------------------------------------------- storefront */}
            <Route
              path="/"
              element={
                <RequireArea area="shop">
                  <ShopLayout />
                </RequireArea>
              }
            >
              <Route index element={<Catalogue />} />
              <Route path="products/:id" element={<ProductPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="outlets" element={<OutletsPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="requests" element={<RequestsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="orders" element={<MyOrders />} />
              <Route path="orders/:id" element={<MyOrderDetail />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </SessionProvider>
    </BrowserRouter>
  )
}
