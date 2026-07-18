import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api, getToken, setToken } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [permissions, setPermissions] = useState({})
  const [loading, setLoading] = useState(true)

  // Restore the session on boot: the token in localStorage may be expired or
  // belong to a user who has since been removed, so ask the server rather than
  // decoding it client-side.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      return
    }
    api
      .me()
      .then((res) => {
        setUser(res.user)
        setPermissions(res.permissions)
      })
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await api.login(email, password)
    setToken(res.token)
    setUser(res.user)
    setPermissions(res.permissions)
    return res
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    setPermissions({})
  }, [])

  const can = useCallback(
    (module, action = 'read') => Boolean(permissions?.[module]?.[action]),
    [permissions],
  )

  return (
    <AuthContext.Provider value={{ user, permissions, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
