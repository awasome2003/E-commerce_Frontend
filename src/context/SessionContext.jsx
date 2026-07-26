import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'
import { getToken, setToken, clearLegacyTokens } from '../lib/token'

const SessionContext = createContext(null)

/**
 * The single session for the whole app — staff and customers.
 *
 * There is one login and one token; what a user may do, and which area they land
 * in, comes entirely from the permission matrix the server returns. Nothing here
 * inspects role names.
 */
export function SessionProvider({ children }) {
  const [user, setUser] = useState(null)
  const [permissions, setPermissions] = useState({})
  const [areas, setAreas] = useState({ staff: false, shop: false })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Drop tokens written by the old two-door design so a stale one cannot
    // masquerade as a live session.
    clearLegacyTokens()

    if (!getToken()) {
      setLoading(false)
      return
    }
    // Ask the server who the token belongs to rather than trusting its contents —
    // a revoked account or changed role takes effect immediately.
    api
      .me()
      .then((res) => {
        setUser(res.user)
        setPermissions(res.permissions ?? {})
        setAreas(res.areas ?? { staff: false, shop: false })
      })
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  const accept = useCallback((res) => {
    setToken(res.token)
    setUser(res.user)
    setPermissions(res.permissions ?? {})
    setAreas(res.areas ?? { staff: false, shop: false })
    return res
  }, [])

  /**
   * Sign in. Pass `userId` only to resolve a 409 where the credentials matched
   * more than one account. If the account has MFA on, the server returns
   * `{ mfa_required, mfa_token }` and NO session — the caller then completes the
   * second factor via [verifyMfa]; we must not `accept()` that response.
   */
  const login = useCallback(
    async (email, password, userId) => {
      const res = await api.login(email, password, userId)
      if (res?.mfa_required) return res
      return accept(res)
    },
    [accept],
  )

  /** Complete a two-step login by submitting a TOTP or backup code. */
  const verifyMfa = useCallback(
    async (mfaToken, code) => accept(await api.verifyMfa(mfaToken, code)),
    [accept],
  )

  const register = useCallback(async (details) => accept(await api.register(details)), [accept])

  const logout = useCallback(() => {
    // Best-effort server-side revocation (bumps token_version) before dropping the
    // local token; sign-out is not blocked on the network.
    api.logout().catch(() => {})
    setToken(null)
    setUser(null)
    setPermissions({})
    setAreas({ staff: false, shop: false })
  }, [])

  /** Change the signed-in user's password; swaps in the fresh token it returns. */
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const res = await api.changePassword(currentPassword, newPassword)
    if (res?.token) setToken(res.token)
    return res
  }, [])

  // --- two-factor auth management (opt-in TOTP) ----------------------------
  const mfaSetup = useCallback(() => api.mfaSetup(), [])
  const mfaEnable = useCallback(async (code) => {
    const res = await api.mfaEnable(code)
    setUser((u) => (u ? { ...u, mfa_enabled: true } : u))
    return res
  }, [])
  const mfaDisable = useCallback(async (password, code) => {
    await api.mfaDisable(password, code)
    setUser((u) => (u ? { ...u, mfa_enabled: false } : u))
  }, [])

  // --- DPDP data-principal rights ------------------------------------------
  /** Correct the signed-in customer's own details; keeps the displayed name in sync. */
  const updateProfile = useCallback(async (fields) => {
    const updated = await api.updateMyProfile(fields)
    setUser((u) => (u ? { ...u, first_name: updated.first_name, last_name: updated.last_name } : u))
    return updated
  }, [])

  /** Erase the signed-in account, then drop the (now-invalid) session so the app
   *  routes back to sign-in. */
  const eraseAccount = useCallback(async (password) => {
    await api.eraseAccount(password)
    setToken(null)
    setUser(null)
    setPermissions({})
    setAreas({ staff: false, shop: false })
  }, [])

  /** True if the signed-in role has `action` on `module`. */
  const can = useCallback(
    (module, action = 'read') => Boolean(permissions?.[module]?.[action]),
    [permissions],
  )

  /** Where this user belongs after signing in. */
  const homePath = areas.staff ? '/admin' : '/'

  return (
    <SessionContext.Provider
      value={{ user, permissions, areas, loading, login, register, logout, changePassword, verifyMfa, mfaSetup, mfaEnable, mfaDisable, eraseAccount, can, homePath }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>')
  return ctx
}
