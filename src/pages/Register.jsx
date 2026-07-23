import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { ErrorNote } from '../components/ui'

const EMPTY = {
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  password: '',
  confirm: '',
}

/** Vendor self-registration. Always creates a Customer; staff are made by staff. */
export default function Register() {
  const { user, loading, register, homePath } = useSession()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return <div className="page-loading">Loading…</div>
  if (user) return <Navigate to={location.state?.from?.pathname || homePath} replace />

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    // Checked here only for a friendlier message; the server validates too.
    if (form.password !== form.confirm) {
      setError('The two passwords do not match.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setBusy(true)
    try {
      await register({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone_number: form.phone_number,
        password: form.password,
      })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <form className="login-card login-card-wide" onSubmit={handleSubmit}>
        <div className="brand brand-lg">
          <span className="brand-mark">TJ</span>
          <span className="brand-text">TJUK</span>
        </div>
        <p className="login-sub">Create a trade account to browse and order.</p>

        <ErrorNote error={error} />

        <div className="field-row">
          <label className="field">
            <span>First name *</span>
            <input className="input" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required />
          </label>
          <label className="field">
            <span>Last name</span>
            <input className="input" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
          </label>
        </div>

        <label className="field">
          <span>Email *</span>
          <input type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="username" required />
        </label>

        <label className="field">
          <span>Phone</span>
          <input className="input" value={form.phone_number} onChange={(e) => set('phone_number', e.target.value)} />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Password *</span>
            <input type="password" className="input" value={form.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" required />
          </label>
          <label className="field">
            <span>Confirm password *</span>
            <input type="password" className="input" value={form.confirm} onChange={(e) => set('confirm', e.target.value)} autoComplete="new-password" required />
          </label>
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>

        <p className="muted-xs login-note">
          You can order straight away. Credit terms are arranged separately with our team.
        </p>

        <p className="login-alt">
          Already have an account?{' '}
          <Link to="/login" state={location.state} className="link">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
