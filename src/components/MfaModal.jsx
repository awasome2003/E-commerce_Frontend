import { useState } from 'react'
import { X, Check, Loader2, ShieldCheck, Copy } from 'lucide-react'
import { useSession } from '../context/SessionContext'

/**
 * Two-factor (TOTP) enrolment & removal, shared by storefront and admin. Styled
 * in the storefront's Tailwind vocabulary and wrapped in `.sf`.
 *
 * Enrol: setup (mint a secret) → the user adds it to their authenticator by the
 * setup key → confirm with a code → ten one-time backup codes are shown once.
 * (A scannable QR is an easy enhancement — render `otpauth` with a QR component.)
 */
export default function MfaModal({ onClose }) {
  const { user, mfaSetup, mfaEnable, mfaDisable } = useSession()
  const enabled = !!user?.mfa_enabled

  const [step, setStep] = useState(enabled ? 'enabled' : 'intro')
  const [secret, setSecret] = useState('')
  const [otpauth, setOtpauth] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [backupCodes, setBackupCodes] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const field = 'w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-700'
  const primaryBtn =
    'w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60'

  async function beginSetup() {
    setError('')
    setBusy(true)
    try {
      const res = await mfaSetup()
      setSecret(res.secret)
      setOtpauth(res.otpauth_uri)
      setStep('setup')
    } catch (err) {
      setError(err.message || 'Could not start setup.')
    } finally {
      setBusy(false)
    }
  }

  async function confirmEnable(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await mfaEnable(code.trim())
      setBackupCodes(res.backup_codes || [])
      setCode('')
      setStep('backup')
    } catch (err) {
      setError(err.message || 'That code was not accepted.')
    } finally {
      setBusy(false)
    }
  }

  async function confirmDisable(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await mfaDisable(password, code.trim())
      setStep('done-off')
      setTimeout(onClose, 1200)
    } catch (err) {
      setError(err.message || 'Could not disable two-factor authentication.')
    } finally {
      setBusy(false)
    }
  }

  function copySecret() {
    navigator.clipboard
      ?.writeText(secret)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => {})
  }

  const grouped = secret.replace(/(.{4})/g, '$1 ').trim()

  return (
    <div className="sf fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck size={18} className="text-amber-500" /> Two-factor authentication
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        {error && <div className="mb-3 rounded-xl bg-rose-50 text-rose-700 text-sm px-3.5 py-2.5">{error}</div>}

        {/* --- already enabled --- */}
        {step === 'enabled' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3.5 py-2.5">
              <Check size={16} className="stroke-[3]" /> Two-factor authentication is on for your account.
            </div>
            <p className="text-xs text-slate-500">
              You'll be asked for a code from your authenticator app each time you sign in.
            </p>
            <button onClick={() => setStep('disable')} className="w-full py-2.5 border border-rose-200 text-rose-600 font-semibold rounded-xl hover:bg-rose-50">
              Turn off two-factor
            </button>
          </div>
        )}

        {/* --- disable (password + code) --- */}
        {step === 'disable' && (
          <form onSubmit={confirmDisable} className="space-y-3">
            <p className="text-sm text-slate-600">Confirm your password and a current code to turn 2FA off.</p>
            <input className={field} type="password" placeholder="Your password" autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
            <input className={field} type="text" inputMode="numeric" placeholder="Authenticator or backup code"
              autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required />
            <button type="submit" disabled={busy} className={primaryBtn}>
              {busy ? <><Loader2 size={16} className="animate-spin" /> Working…</> : 'Turn off two-factor'}
            </button>
          </form>
        )}

        {/* --- intro (not enabled) --- */}
        {step === 'intro' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Add a second step to your sign-in using an authenticator app (Google Authenticator, Authy,
              1Password, …). Even if your password leaks, your account stays protected.
            </p>
            <button onClick={beginSetup} disabled={busy} className={primaryBtn}>
              {busy ? <><Loader2 size={16} className="animate-spin" /> Starting…</> : 'Begin setup'}
            </button>
          </div>
        )}

        {/* --- setup: show secret + confirm a code --- */}
        {step === 'setup' && (
          <form onSubmit={confirmEnable} className="space-y-3">
            <p className="text-sm text-slate-600">
              In your authenticator app choose <b>Add account → Enter a setup key</b>, then type this key:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono tracking-wider text-slate-800 break-all select-all">
                {grouped}
              </code>
              <button type="button" onClick={copySecret} title="Copy" className="w-10 h-10 shrink-0 grid place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
                {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              </button>
            </div>
            <a href={otpauth} className="block text-xs text-amber-600 hover:underline break-all">
              On this device? Tap to open your authenticator
            </a>
            <label className="block text-sm text-slate-600 pt-1">
              Then enter the 6-digit code it shows:
              <input className={`${field} mt-1.5`} type="text" inputMode="numeric" autoComplete="one-time-code"
                placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} autoFocus required />
            </label>
            <button type="submit" disabled={busy} className={primaryBtn}>
              {busy ? <><Loader2 size={16} className="animate-spin" /> Verifying…</> : 'Verify & turn on'}
            </button>
          </form>
        )}

        {/* --- backup codes (shown once) --- */}
        {step === 'backup' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3.5 py-2.5">
              <Check size={16} className="stroke-[3]" /> Two-factor authentication is on.
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Save your backup codes</p>
              <p className="text-xs text-slate-500 mb-2">
                Each works once, if you lose your authenticator. Store them somewhere safe — they won't be shown again.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((c) => (
                  <code key={c} className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-mono text-center text-slate-800 select-all">
                    {c}
                  </code>
                ))}
              </div>
            </div>
            <button onClick={onClose} className={primaryBtn}>I've saved my backup codes</button>
          </div>
        )}

        {/* --- disabled confirmation --- */}
        {step === 'done-off' && (
          <div className="py-6 text-center space-y-2">
            <div className="w-12 h-12 mx-auto grid place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <Check size={24} className="stroke-[3]" />
            </div>
            <p className="text-sm font-semibold text-slate-800">Two-factor turned off</p>
          </div>
        )}
      </div>
    </div>
  )
}
