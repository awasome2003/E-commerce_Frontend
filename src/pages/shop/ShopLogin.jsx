import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useShop } from '../../context/ShopContext'
import { ErrorNote } from '../../components/ui'

export default function ShopLogin() {
  const { customer, loading, login } = useShop()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return <div className="page-loading">Loading…</div>
  if (customer) return <Navigate to={location.state?.from?.pathname || '/'} replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
      // Back to whatever they were trying to do — usually the product they wanted.
      navigate(location.state?.from?.pathname || '/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="brand brand-lg">
          <span className="brand-mark">TJ</span>
          <span className="brand-text">Wholesale</span>
        </div>
        <p className="login-sub">Sign in to browse and order at your agreed prices.</p>

        <ErrorNote error={error} />

        <label className="field">
          <span>Email</span>
          <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        </label>

        <label className="field">
          <span>Password</span>
          <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
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
      </form>
    </div>
  )
}
