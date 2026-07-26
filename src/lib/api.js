import { getToken, setToken } from './token'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

export { getToken, setToken } from './token'

/**
 * Thrown for any non-2xx response.
 *
 * `status` lets callers treat 401/403 specially, and `data` carries the whole
 * response body — the 409 from an ambiguous login puts the candidate accounts
 * there, and the login screen needs them to offer a choice.
 */
export class ApiError extends Error {
  constructor(message, status, data = {}) {
    super(message)
    this.status = status
    this.data = data
    this.accounts = data.accounts
  }
}

async function request(path, { method = 'GET', body, params } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'

  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const query = params
    ? new URLSearchParams(
        Object.entries(params).filter(
          ([, v]) => v !== undefined && v !== null && v !== '',
        ),
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
    // A 401 on any authenticated call means the token was revoked (logout
    // elsewhere / password change) or expired — reset to a clean signed-out
    // state. Credential endpoints are excluded so a wrong password stays inline.
    if (
      res.status === 401 &&
      token &&
      !path.startsWith('/auth/login') &&
      !path.startsWith('/auth/register')
    ) {
      setToken(null)
      window.location.reload()
    }
    throw new ApiError(data.message || `Request failed (${res.status})`, res.status, data)
  }
  return data
}

export const api = {
  /**
   * The one sign-in for staff and customers alike. `user_id` is only needed when
   * a previous attempt returned 409 because the credentials matched more than
   * one account.
   */
  login: (email, password, user_id) =>
    request('/auth/login', { method: 'POST', body: { email, password, user_id } }),
  register: (body) => request('/auth/register', { method: 'POST', body }),
  me: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
  changePassword: (current_password, new_password) =>
    request('/auth/password', { method: 'POST', body: { current_password, new_password } }),

  // Opt-in TOTP two-factor auth.
  verifyMfa: (mfa_token, code) =>
    request('/auth/mfa/verify', { method: 'POST', body: { mfa_token, code } }),
  mfaSetup: () => request('/auth/mfa/setup', { method: 'POST' }),
  mfaEnable: (code) => request('/auth/mfa/enable', { method: 'POST', body: { code } }),
  mfaDisable: (password, code) =>
    request('/auth/mfa/disable', { method: 'POST', body: { password, code } }),

  // DPDP data-principal rights (self-service, over one's own account).
  getMyProfile: () => request('/shop/account/profile'),
  updateMyProfile: (fields) => request('/shop/account/profile', { method: 'PATCH', body: fields }),
  exportMyData: () => request('/shop/account/export'),
  eraseAccount: (password) => request('/shop/account/erasure', { method: 'POST', body: { password } }),

  // Forgot / reset password (pre-auth).
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token, new_password) =>
    request('/auth/reset-password', { method: 'POST', body: { token, new_password } }),

  dashboard: () => request('/dashboard'),

  listProducts: (params) => request('/products', { params }),
  getProduct: (id) => request(`/products/${id}`),
  updateProduct: (id, body) => request(`/products/${id}`, { method: 'PUT', body }),
  createProduct: (body) => request('/products', { method: 'POST', body }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  previewPrice: (params) => request('/products/price-preview', { params }),

  listOrders: (params) => request('/orders', { params }),
  getOrder: (id) => request(`/orders/${id}`),
  updateOrderStatus: (id, order_status) =>
    request(`/orders/${id}/status`, { method: 'PATCH', body: { order_status } }),
  updateOrderPayment: (id, payment_recevied) =>
    request(`/orders/${id}/payment`, { method: 'PATCH', body: { payment_recevied } }),

  listCustomers: (params) => request('/customers', { params }),
  getCustomer: (id) => request(`/customers/${id}`),
  getCustomerPricing: (id) => request(`/customers/${id}/pricing`),
  addCustomerFlatPrice: (id, body) => request(`/customers/${id}/pricing/flat`, { method: 'POST', body }),
  updateCustomerFlatPrice: (id, rowId, body) =>
    request(`/customers/${id}/pricing/flat/${rowId}`, { method: 'PUT', body }),
  deleteCustomerFlatPrice: (id, rowId) =>
    request(`/customers/${id}/pricing/flat/${rowId}`, { method: 'DELETE' }),
  addCustomerTier: (id, body) => request(`/customers/${id}/pricing/tiers`, { method: 'POST', body }),
  updateCustomerTier: (id, rowId, body) =>
    request(`/customers/${id}/pricing/tiers/${rowId}`, { method: 'PUT', body }),
  deleteCustomerTier: (id, rowId) =>
    request(`/customers/${id}/pricing/tiers/${rowId}`, { method: 'DELETE' }),

  addProductTier: (id, body) => request(`/products/${id}/tiers`, { method: 'POST', body }),
  updateProductTier: (id, rowId, body) =>
    request(`/products/${id}/tiers/${rowId}`, { method: 'PUT', body }),
  deleteProductTier: (id, rowId) => request(`/products/${id}/tiers/${rowId}`, { method: 'DELETE' }),
  updateCustomer: (id, body) => request(`/customers/${id}`, { method: 'PUT', body }),

  listTickets: (params) => request('/tickets', { params }),
  getTicket: (id) => request(`/tickets/${id}`),
  addTicketMessage: (id, message) =>
    request(`/tickets/${id}/messages`, { method: 'POST', body: { message } }),
  updateTicketStatus: (id, ticket_status_id) =>
    request(`/tickets/${id}/status`, { method: 'PATCH', body: { ticket_status_id } }),

  listRequests: (params) => request('/requests', { params }),
  getRequest: (id) => request(`/requests/${id}`),
  quoteRequest: (id, body) => request(`/requests/${id}/quote`, { method: 'POST', body }),
  approveRequest: (id, body) => request(`/requests/${id}/approve`, { method: 'POST', body }),
  rejectRequest: (id, body) => request(`/requests/${id}/reject`, { method: 'POST', body }),

  listCoupons: (params) => request('/coupons', { params }),
  getCoupon: (id) => request(`/coupons/${id}`),
  createCoupon: (body) => request('/coupons', { method: 'POST', body }),
  updateCoupon: (id, body) => request(`/coupons/${id}`, { method: 'PUT', body }),
  deleteCoupon: (id) => request(`/coupons/${id}`, { method: 'DELETE' }),

  listBanners: () => request('/banners'),
  createBanner: (body) => request('/banners', { method: 'POST', body }),
  updateBanner: (id, body) => request(`/banners/${id}`, { method: 'PUT', body }),
  deleteBanner: (id) => request(`/banners/${id}`, { method: 'DELETE' }),

  getPermissionMatrix: () => request('/settings/permissions'),
  updatePermissions: (roleId, modules) =>
    request(`/settings/permissions/${roleId}`, { method: 'PUT', body: { modules } }),
  listRoles: () => request('/settings/roles'),
  createRole: (title) => request('/settings/roles', { method: 'POST', body: { title } }),
  updateRole: (id, title) => request(`/settings/roles/${id}`, { method: 'PUT', body: { title } }),
  deleteRole: (id) => request(`/settings/roles/${id}`, { method: 'DELETE' }),

  getDeliverySettings: () => request('/delivery-settings'),
  updateDeliverySettings: (body) => request('/delivery-settings', { method: 'PUT', body }),
  previewDelivery: (params) => request('/delivery-settings/preview', { params }),
  updateOutletDistance: (id, distance_km) =>
    request(`/customers/outlets/${id}/distance`, { method: 'PATCH', body: { distance_km } }),

  listNotifications: (params) => request('/notifications', { params }),

  listPurchaseOrders: (params) => request('/documents/purchase-orders', { params }),
  listInvoices: (params) => request('/documents/invoices', { params }),

  categories: () => request('/masters/categories'),
  subCategories: (category_id) => request('/masters/sub-categories', { params: { category_id } }),
  brands: () => request('/masters/brands'),
  manufacturers: () => request('/masters/manufacturers'),
  customerCategories: () => request('/masters/customer-categories'),
  ticketStatuses: () => request('/masters/ticket-statuses'),
  ticketCategories: () => request('/masters/ticket-categories'),
}
