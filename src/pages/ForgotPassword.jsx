import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { ErrorNote } from '../components/ui'

/**
 * Request a password-reset link. The response is deliberately the same whether or
 * not the email is registered (anti-enumeration), so we always show "check your
 * inbox" on success.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <div className="brand brand-lg">
          <span className="brand-mark">TJ</span>
          <span className="brand-text">TJUK</span>
        </div>
        <p className="login-sub">Reset your password.</p>

        <ErrorNote error={error} />

        {sent ? (
          <>
            <div className="note note-muted">
              If that email is registered, we've sent a reset link. Check your inbox — it expires in
              60 minutes.
            </div>
            <Link to="/login" className="btn btn-ghost btn-block">
              Back to sign in
            </Link>
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
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
            <p className="login-alt">
              <Link to="/login" className="link">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </form>
    </div>
  )
}
