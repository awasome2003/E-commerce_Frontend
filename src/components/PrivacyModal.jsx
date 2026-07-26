import { useState } from 'react'
import { X, Download, Trash2, Loader2, AlertTriangle, Pencil, Check } from 'lucide-react'
import { useSession } from '../context/SessionContext'
import { api } from '../lib/api'

/**
 * DPDP data-principal self-service: correct your details (right to correction),
 * download a copy of your data (right to access), or delete your account (right
 * to erasure). Styled in the storefront's Tailwind vocabulary and wrapped in `.sf`.
 *
 * On successful erasure the session is cleared, so the app routes back to
 * sign-in and this modal unmounts — hence `busy` is only reset on error there.
 */
export default function PrivacyModal({ onClose }) {
  const { eraseAccount, updateProfile } = useSession()
  const [step, setStep] = useState('menu')
  const [password, setPassword] = useState('')
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const field = 'w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-700'
  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function openEdit() {
    setError('')
    setForm(null)
    setStep('edit')
    try {
      const p = await api.getMyProfile()
      setForm({
        first_name: p.first_name || '', last_name: p.last_name || '', email: p.email || '',
        phone_number: p.phone_number || '', gst_number: p.gst_number || '', pan_number: p.pan_number || '',
        billing_name: p.billing_name || '', billing_address: p.billing_address || '',
        billing_contact: p.billing_contact || '', billing_state: p.billing_state || '',
      })
    } catch (err) {
      setError(err.message || 'Could not load your details.')
      setStep('menu')
    }
  }

  async function saveEdit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { email, ...editable } = form // email is read-only here
      await updateProfile(editable)
      setStep('saved')
      setTimeout(() => setStep('menu'), 1200)
    } catch (err) {
      setError(err.message || 'Could not save your details.')
    } finally {
      setBusy(false)
    }
  }

  async function download() {
    setError('')
    setBusy(true)
    try {
      const data = await api.exportMyData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'tjuk-my-data.json'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message || 'Could not export your data.')
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await eraseAccount(password)
      // Session cleared → the app redirects to sign-in and this unmounts.
    } catch (err) {
      setError(err.message || 'Could not delete your account.')
      setBusy(false)
    }
  }

  const editField = (label, key, opts = {}) => (
    <label className="block text-xs text-slate-500">
      {label}
      <input className={`${field} mt-1`} value={form[key]} onChange={setField(key)} {...opts} />
    </label>
  )

  return (
    <div className="sf fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-800">Privacy &amp; my data</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        {error && <div className="mb-3 rounded-xl bg-rose-50 text-rose-700 text-sm px-3.5 py-2.5">{error}</div>}

        {step === 'menu' && (
          <div className="space-y-3">
            <button
              onClick={openEdit}
              className="w-full flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 text-left"
            >
              <span className="w-9 h-9 grid place-items-center rounded-lg bg-amber-50 text-amber-600"><Pencil size={18} /></span>
              <span>
                <span className="block text-sm font-semibold text-slate-800">Edit my details</span>
                <span className="block text-xs text-slate-500">Correct your name, contact, GST/PAN and billing.</span>
              </span>
            </button>

            <button
              onClick={download}
              disabled={busy}
              className="w-full flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 text-left disabled:opacity-60"
            >
              <span className="w-9 h-9 grid place-items-center rounded-lg bg-amber-50 text-amber-600">
                {busy ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-800">Download my data</span>
                <span className="block text-xs text-slate-500">A JSON copy of your profile, outlets and orders.</span>
              </span>
            </button>

            <button
              onClick={() => { setError(''); setStep('delete') }}
              className="w-full flex items-center gap-3 px-4 py-3 border border-rose-200 rounded-xl hover:bg-rose-50 text-left"
            >
              <span className="w-9 h-9 grid place-items-center rounded-lg bg-rose-50 text-rose-600"><Trash2 size={18} /></span>
              <span>
                <span className="block text-sm font-semibold text-rose-700">Delete my account</span>
                <span className="block text-xs text-slate-500">Permanently erase your personal data.</span>
              </span>
            </button>
          </div>
        )}

        {step === 'edit' && (
          form === null ? (
            <div className="py-8 grid place-items-center text-slate-400"><Loader2 size={22} className="animate-spin" /></div>
          ) : (
            <form onSubmit={saveEdit} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                {editField('First name', 'first_name', { required: true })}
                {editField('Last name', 'last_name')}
              </div>
              <label className="block text-xs text-slate-400">
                Email (change via support)
                <input className={`${field} mt-1 bg-slate-50 text-slate-400`} value={form.email} disabled />
              </label>
              {editField('Phone', 'phone_number')}
              <div className="grid grid-cols-2 gap-2.5">
                {editField('GST number', 'gst_number')}
                {editField('PAN', 'pan_number')}
              </div>
              {editField('Billing name', 'billing_name')}
              {editField('Billing address', 'billing_address')}
              <div className="grid grid-cols-2 gap-2.5">
                {editField('Billing contact', 'billing_contact')}
                {editField('Billing state', 'billing_state')}
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setStep('menu')} className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50">Back</button>
                <button type="submit" disabled={busy} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
                  {busy ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : 'Save'}
                </button>
              </div>
            </form>
          )
        )}

        {step === 'saved' && (
          <div className="py-6 text-center space-y-2">
            <div className="w-12 h-12 mx-auto grid place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check size={24} className="stroke-[3]" /></div>
            <p className="text-sm font-semibold text-slate-800">Your details were updated</p>
          </div>
        )}

        {step === 'delete' && (
          <form onSubmit={confirmDelete} className="space-y-3">
            <div className="flex gap-2.5 rounded-xl bg-rose-50 text-rose-700 text-sm px-3.5 py-2.5">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <p>
                This <b>permanently erases</b> your profile, outlets and contacts, and signs you out
                everywhere. Order records are kept only as long as the law requires, then removed. This
                cannot be undone.
              </p>
            </div>
            <input
              className={field}
              type="password"
              placeholder="Confirm your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy ? <><Loader2 size={16} className="animate-spin" /> Deleting…</> : 'Permanently delete my account'}
            </button>
            <button type="button" className="w-full text-sm text-slate-500 hover:text-slate-700" onClick={() => setStep('menu')}>
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
