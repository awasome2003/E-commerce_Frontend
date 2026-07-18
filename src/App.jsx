import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ShopProvider } from './context/ShopContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import ShopLayout from './components/ShopLayout'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import ProductEdit from './pages/ProductEdit'
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

import ShopLogin from './pages/shop/ShopLogin'
import ShopRegister from './pages/shop/ShopRegister'
import Catalogue from './pages/shop/Catalogue'
import ProductPage from './pages/shop/ProductPage'
import CartPage from './pages/shop/CartPage'
import OutletsPage from './pages/shop/OutletsPage'
import CheckoutPage from './pages/shop/CheckoutPage'
import MyOrders from './pages/shop/MyOrders'
import MyOrderDetail from './pages/shop/MyOrderDetail'

/**
 * Two apps in one bundle.
 *
 *   /        the storefront — where customers arrive
 *   /admin   the staff panel
 *
 * The storefront owns the home page because that is who arrives at the domain:
 * customers. It needs an account throughout, catalogue included — prices are
 * negotiated per customer and are not public information. Vendors can register
 * themselves at /register and are signed straight in.
 *
 * The two keep separate auth contexts and separate tokens. Staff and customers
 * are different audiences, and one email in this database belongs to both an
 * admin and a customer — a shared session would be ambiguous.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --------------------------------------------------- admin panel */}
        <Route
          path="/admin/*"
          element={
            <AuthProvider>
              <Routes>
                <Route path="login" element={<Login />} />

                <Route
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />

                  <Route path="products">
                    <Route index element={<ProtectedRoute module="Products"><Products /></ProtectedRoute>} />
                    <Route path=":id" element={<ProtectedRoute module="Products"><ProductEdit /></ProtectedRoute>} />
                  </Route>

                  <Route path="orders">
                    <Route index element={<ProtectedRoute module="Orders"><Orders /></ProtectedRoute>} />
                    <Route path=":id" element={<ProtectedRoute module="Orders"><OrderDetail /></ProtectedRoute>} />
                  </Route>

                  <Route path="customers">
                    <Route index element={<ProtectedRoute module="Customers"><Customers /></ProtectedRoute>} />
                    <Route path=":id" element={<ProtectedRoute module="Customers"><CustomerDetail /></ProtectedRoute>} />
                  </Route>

                  <Route path="tickets">
                    <Route index element={<ProtectedRoute module="Support"><Tickets /></ProtectedRoute>} />
                    <Route path=":id" element={<ProtectedRoute module="Support"><TicketDetail /></ProtectedRoute>} />
                  </Route>

                  <Route path="documents" element={<ProtectedRoute module="Orders"><Documents /></ProtectedRoute>} />
                  <Route path="notifications" element={<ProtectedRoute module="Notification"><Notifications /></ProtectedRoute>} />
                  <Route path="coupons" element={<ProtectedRoute module="Coupon"><Coupons /></ProtectedRoute>} />
                  <Route path="banners" element={<ProtectedRoute module="Banner Ads"><Banners /></ProtectedRoute>} />
                  <Route path="settings" element={<ProtectedRoute module="Settings"><Settings /></ProtectedRoute>} />
                </Route>

                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </AuthProvider>
          }
        />

        {/* ---------------------------------------------------- storefront */}
        <Route
          path="/*"
          element={
            <ShopProvider>
              <Routes>
                <Route path="login" element={<ShopLogin />} />
                <Route path="register" element={<ShopRegister />} />

                {/* ShopLayout guards everything below it — no guest view. */}
                <Route element={<ShopLayout />}>
                  <Route index element={<Catalogue />} />
                  <Route path="products/:id" element={<ProductPage />} />
                  <Route path="cart" element={<CartPage />} />
                  <Route path="outlets" element={<OutletsPage />} />
                  <Route path="checkout" element={<CheckoutPage />} />
                  <Route path="orders" element={<MyOrders />} />
                  <Route path="orders/:id" element={<MyOrderDetail />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ShopProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
