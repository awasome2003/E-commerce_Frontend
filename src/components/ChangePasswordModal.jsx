import { useState } from 'react'
import { X, Check, Loader2 } from 'lucide-react'
import { useSession } from '../context/SessionContext'

/**
 * Change-password dialog, shared by the storefront and admin. Uses the session's
 * `changePassword`, which swaps in the fresh token the API returns (so the
 * current device stays signed in while every *other* session is revoked).
 *
 * Styled with the storefront's Tailwind vocabulary and wrapped in `.sf`.
 */
export default function ChangePasswordModal({ onClose }) {
  const { changePassword } = useSession()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (next.length < 8) return setError('New password must be at least 8 characters.')
    if (next !== confirm) return setError('The new passwords do not match.')
    setBusy(true)
    try {
      await changePassword(current, next)
      setDone(true)
      setTimeout(onClose, 1200)
    } catch (err) {
      setError(err.message || 'Could not change password.')
    } finally {
      setBusy(false)
    }
  }

  const field = 'w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-700'

  return (
    <div className="sf fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-800">Change password</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        {done ? (
          <div className="py-6 text-center space-y-2">
            <div className="w-12 h-12 mx-auto grid place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <Check size={24} className="stroke-[3]" />
            </div>
            <p className="text-sm font-semibold text-slate-800">Password changed</p>
            <p className="text-xs text-slate-500">Other devices have been signed out.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {error && <div className="rounded-xl bg-rose-50 text-rose-700 text-sm px-3.5 py-2.5">{error}</div>}
            <input className={field} type="password" placeholder="Current password" autoComplete="current-password"
              value={current} onChange={(e) => setCurrent(e.target.value)} required />
            <input className={field} type="password" placeholder="New password (min 8 chars)" autoComplete="new-password"
              value={next} onChange={(e) => setNext(e.target.value)} required />
            <input className={field} type="password" placeholder="Confirm new password" autoComplete="new-password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            <button type="submit" disabled={busy}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
              {busy ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
