import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { ErrorNote } from '../components/ui'

/**
 * Complete a password reset from the emailed link (`/reset-password?token=…`).
 * On success every session is revoked server-side, so we send the user to sign in.
 */
export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()

  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (next.length < 8) return setError('New password must be at least 8 characters.')
    if (next !== confirm) return setError('The passwords do not match.')
    setBusy(true)
    try {
      await api.resetPassword(token, next)
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 1500)
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
        <p className="login-sub">Choose a new password.</p>

        <ErrorNote error={error} />

        {!token ? (
          <div className="note note-muted">
            This reset link is missing its token. Use the link from your email, or{' '}
            <Link to="/forgot-password" className="link">request a new one</Link>.
          </div>
        ) : done ? (
          <div className="note note-muted">Your password has been reset. Taking you to sign in…</div>
        ) : (
          <>
            <label className="field">
              <span>New password</span>
              <input
                type="password"
                className="input"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
            <label className="field">
              <span>Confirm new password</span>
              <input
                type="password"
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Saving…' : 'Reset password'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}
