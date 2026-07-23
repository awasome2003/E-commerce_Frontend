import { ApiError } from './api'
import { getToken } from './token'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

// The storefront shares the app's single session — see lib/token.js.
const getShopToken = getToken

async function request(path, { method = 'GET', body, params } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'

  const token = getShopToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const query = params
    ? new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
      ).toString()
    : ''

  const res = await fetch(`${BASE_URL}${path}${query ? `?${query}` : ''}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(data.message || `Request failed (${res.status})`, res.status, data)
  }
  return data
}

export const shopApi = {
  // Sign-in and registration live on the shared session (lib/api.js) — the
  // storefront no longer has its own door.
  me: () => request('/shop/me'),

  filters: () => request('/shop/filters'),
  listProducts: (params) => request('/shop/products', { params }),
  getProduct: (id) => request(`/shop/products/${id}`),

  getCart: () => request('/shop/cart'),
  addToCart: (product_id, quantity) => request('/shop/cart', { method: 'POST', body: { product_id, quantity } }),
  updateCartItem: (id, quantity) => request(`/shop/cart/${id}`, { method: 'PUT', body: { quantity } }),
  removeCartItem: (id) => request(`/shop/cart/${id}`, { method: 'DELETE' }),

  listOutlets: () => request('/shop/outlets'),
  createOutlet: (body) => request('/shop/outlets', { method: 'POST', body }),

  quoteCheckout: (outlet_id) => request('/shop/checkout/quote', { params: { outlet_id } }),
  checkout: (outlet_id, phone_id) => request('/shop/checkout', { method: 'POST', body: { outlet_id, phone_id } }),

  listRequests: () => request('/shop/requests'),
  getRequest: (id) => request(`/shop/requests/${id}`),
  createRequest: (body) => request('/shop/requests', { method: 'POST', body }),
  cancelRequest: (id) => request(`/shop/requests/${id}`, { method: 'DELETE' }),

  listOrders: () => request('/shop/orders'),
  getOrder: (id) => request(`/shop/orders/${id}`),

  listNotifications: () => request('/shop/notifications'),
  markNotificationsRead: () => request('/shop/notifications/read', { method: 'POST' }),
}
