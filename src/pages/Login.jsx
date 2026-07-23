import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { ErrorNote } from '../components/ui'

/**
 * The one sign-in for everyone.
 *
 * There is no separate staff door: the server decides from the permission matrix
 * whether this account belongs in the admin panel or the storefront, and we route
 * accordingly.
 */
export default function Login() {
  const { user, loading, login, homePath } = useSession()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // Populated when one email+password matches several accounts.
  const [choices, setChoices] = useState(null)

  if (loading) return <div className="page-loading">Loading…</div>
  if (user) return <Navigate to={location.state?.from?.pathname || homePath} replace />

  async function attempt(userId) {
    setError('')
    setBusy(true)
    try {
      const res = await login(email, password, userId)
      const destination =
        location.state?.from?.pathname || (res.areas?.staff ? '/admin' : '/')
      navigate(destination, { replace: true })
    } catch (err) {
      // 409 means the credentials are valid but match more than one account.
      if (err.status === 409 && err.accounts) {
        setChoices(err.accounts)
        setError('')
      } else {
        setError(err.message)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <form
        className="login-card"
        onSubmit={(e) => {
          e.preventDefault()
          attempt()
        }}
      >
        <div className="brand brand-lg">
          <span className="brand-mark">TJ</span>
          <span className="brand-text">TJUK</span>
        </div>
        <p className="login-sub">Sign in to your account.</p>

        <ErrorNote error={error} />

        {choices ? (
          <>
            {/* Never guess which identity someone meant — ask. */}
            <div className="note note-muted">
              Those details match more than one account. Which one do you want?
            </div>
            {choices.map((c) => (
              <button
                key={c.user_id}
                type="button"
                className="btn btn-ghost btn-block choice-btn"
                disabled={busy}
                onClick={() => attempt(c.user_id)}
              >
                {c.name} · {c.role}
              </button>
            ))}
            <button type="button" className="link link-btn" onClick={() => setChoices(null)}>
              Back
            </button>
          </>
        ) : (
          <>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>

            <p className="login-alt">
              New here?{' '}
              <Link to="/register" state={location.state} className="link">
                Create a trade account
              </Link>
            </p>
          </>
        )}
      </form>
    </div>
  )
}
