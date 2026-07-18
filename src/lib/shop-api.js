import { ApiError } from './api'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

/**
 * The storefront keeps its own token under its own key.
 *
 * Staff and customers are different audiences with different logins, and one
 * email in this database belongs to both an admin and a customer. Sharing a
 * token key would mean signing into the shop silently signs you out of the panel
 * — and worse, could leave the wrong identity in play.
 */
const TOKEN_KEY = 'tjuk_shop_token'

export function getShopToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setShopToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

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
  if (!res.ok) throw new ApiError(data.message || `Request failed (${res.status})`, res.status)
  return data
}

export const shopApi = {
  login: (email, password) => request('/shop/auth/login', { method: 'POST', body: { email, password } }),
  register: (body) => request('/shop/auth/register', { method: 'POST', body }),
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

  listOrders: () => request('/shop/orders'),
  getOrder: (id) => request(`/shop/orders/${id}`),
}
