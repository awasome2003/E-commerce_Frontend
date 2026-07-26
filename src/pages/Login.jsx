import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { ErrorNote } from '../components/ui'

/**
 * The one sign-in for everyone.
 *
 * There is no separate staff door: the server decides from the permission matrix
 * whether this account belongs in the admin panel or the storefront, and we route
 * accordingly. If the account has two-factor auth on, the password step returns
 * `mfa_required` and we ask for a code before completing the sign-in.
 */
export default function Login() {
  const { user, loading, login, verifyMfa, homePath } = useSession()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // Populated when one email+password matches several accounts.
  const [choices, setChoices] = useState(null)
  // Set once a password login returns `mfa_required`; drives the code step.
  const [mfaToken, setMfaToken] = useState(null)
  const [code, setCode] = useState('')

  if (loading) return <div className="page-loading">Loading…</div>
  if (user) return <Navigate to={location.state?.from?.pathname || homePath} replace />

  function go(res) {
    const destination = location.state?.from?.pathname || (res.areas?.staff ? '/admin' : '/')
    navigate(destination, { replace: true })
  }

  async function attempt(userId) {
    setError('')
    setBusy(true)
    try {
      const res = await login(email, password, userId)
      if (res?.mfa_required) {
        setChoices(null)
        setMfaToken(res.mfa_token)
      } else {
        go(res)
      }
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

  async function verify() {
    setError('')
    setBusy(true)
    try {
      go(await verifyMfa(mfaToken, code.trim()))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function backToSignIn() {
    setMfaToken(null)
    setCode('')
    setPassword('')
    setError('')
  }

  return (
    <div className="login">
      <form
        className="login-card"
        onSubmit={(e) => {
          e.preventDefault()
          if (mfaToken) verify()
          else attempt()
        }}
      >
        <div className="brand brand-lg">
          <span className="brand-mark">TJ</span>
          <span className="brand-text">TJUK</span>
        </div>
        <p className="login-sub">
          {mfaToken ? 'Two-factor verification.' : 'Sign in to your account.'}
        </p>

        <ErrorNote error={error} />

        {mfaToken ? (
          <>
            <div className="note note-muted">
              Enter the 6-digit code from your authenticator app. You can also enter one of your
              backup codes.
            </div>
            <label className="field">
              <span>Verification code</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
                required
              />
            </label>
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Verifying…' : 'Verify'}
            </button>
            <button type="button" className="link link-btn" onClick={backToSignIn}>
              Back to sign in
            </button>
          </>
        ) : choices ? (
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
              <Link to="/forgot-password" className="link">
                Forgot your password?
              </Link>
            </p>
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
