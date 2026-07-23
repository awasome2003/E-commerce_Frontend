/**
 * One token for the whole app.
 *
 * Staff and customers used to sign in at different doors and keep separate
 * tokens. There is now a single login, and where a user may go is decided by the
 * permission matrix — so a single session is both correct and simpler.
 */
const TOKEN_KEY = 'tjuk_token'

// Keys written by the previous two-door design. Cleared on load so an old
// session cannot linger and confuse things.
const LEGACY_KEYS = ['tjuk_admin_token', 'tjuk_shop_token']

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function clearLegacyTokens() {
  for (const key of LEGACY_KEYS) localStorage.removeItem(key)
}
