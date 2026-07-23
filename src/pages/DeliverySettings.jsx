import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { money } from '../lib/format'
import { useSession } from '../context/SessionContext'
import { ErrorNote, Spinner, Badge } from '../components/ui'

const MODE_HELP = {
  PER_ORDER: 'Customers check out with no delivery charge; your staff set the real amount on each order afterwards. This is what happened before this screen existed.',
  FLAT: 'Every order pays the same delivery charge, whatever the cart size.',
  FREE_ABOVE: 'Delivery is free once the cart reaches your threshold; below it, the flat amount applies.',
  PER_KM: 'Charge is the per-km rate times the distance recorded on the outlet. Outlets with no distance are charged nothing and flagged for staff.',
}

const MODE_LABEL = {
  PER_ORDER: 'Set per order by staff',
  FLAT: 'Flat amount',
  FREE_ABOVE: 'Free above a threshold',
  PER_KM: 'Per kilometre',
}

export default function DeliverySettings() {
  const { can } = useSession()
  const editable = can('Settings', 'update')

  const [settings, setSettings] = useState(null)
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(null)
  const [sample, setSample] = useState(2000)

  function load() {
    return api
      .getDeliverySettings()
      .then((res) => {
        setSettings(res)
        setForm({
          mode: res.mode,
          flat_amount: res.flat_amount,
          free_above_amount: res.free_above_amount,
          per_km_rate: res.per_km_rate,
        })
      })
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    load()
  }, [])

  // Preview uses the saved settings, not the draft — it answers "what are
  // customers being charged right now".
  useEffect(() => {
    if (!settings) return
    api
      .previewDelivery({ cart_total: sample })
      .then(setPreview)
      .catch(() => setPreview(null))
  }, [settings, sample])

  async function save() {
    setError('')
    setBusy(true)
    try {
      await api.updateDeliverySettings(form)
      await load()
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (error && !settings) return <ErrorNote error={error} />
  if (!settings || !form) return <Spinner />

  const set = (key, value) => {
    setSaved(false)
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <>
      <ErrorNote error={error} />
      {saved && <div className="note note-success">Delivery settings saved.</div>}

      <section className="card">
        <h2 className="card-title">Delivery charges</h2>

        <div className="mode-list">
          {settings.modes.map((mode) => (
            <label key={mode} className={`mode-option${form.mode === mode ? ' is-selected' : ''}`}>
              <input
                type="radio"
                name="mode"
                value={mode}
                checked={form.mode === mode}
                disabled={!editable}
                onChange={() => set('mode', mode)}
              />
              <div>
                <strong>{MODE_LABEL[mode]}</strong>
                <div className="muted-xs">{MODE_HELP[mode]}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="field-row">
          {(form.mode === 'FLAT' || form.mode === 'FREE_ABOVE') && (
            <label className="field">
              <span>Flat amount (₹)</span>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={form.flat_amount}
                onChange={(e) => set('flat_amount', e.target.value)}
                disabled={!editable}
              />
            </label>
          )}
          {form.mode === 'FREE_ABOVE' && (
            <label className="field">
              <span>Free above (₹)</span>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={form.free_above_amount}
                onChange={(e) => set('free_above_amount', e.target.value)}
                disabled={!editable}
              />
            </label>
          )}
          {form.mode === 'PER_KM' && (
            <label className="field">
              <span>Rate per km (₹)</span>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={form.per_km_rate}
                onChange={(e) => set('per_km_rate', e.target.value)}
                disabled={!editable}
              />
            </label>
          )}
        </div>

        {form.mode === 'PER_KM' && settings.outlets_missing_distance > 0 && (
          // Without a distance the charge cannot be computed, so those outlets
          // would be delivered free. Say it plainly rather than let it happen quietly.
          <div className="note note-error">
            <strong>{settings.outlets_missing_distance}</strong> outlet(s) have no distance recorded.
            They will be charged nothing and flagged for staff until you set a distance on each
            customer's outlet.
          </div>
        )}

        {editable && (
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save delivery settings'}
          </button>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">What a customer pays now</h2>
        <div className="field-row">
          <label className="field">
            <span>Example cart total (₹)</span>
            <input
              className="input"
              type="number"
              min="0"
              value={sample}
              onChange={(e) => setSample(Math.max(Number(e.target.value) || 0, 0))}
            />
          </label>
        </div>

        {preview ? (
          <div className="preview-result">
            <div>
              <span className="tile-label">Delivery</span>
              <span className="preview-price">{money(preview.amount)}</span>
            </div>
            <div>
              <span className="tile-label">Mode</span>
              <Badge tone="violet">{MODE_LABEL[preview.mode] ?? preview.mode}</Badge>
              <span className="muted-xs">{preview.reason}</span>
            </div>
            {preview.needs_admin && (
              <div>
                <span className="tile-label">Note</span>
                <Badge tone="amber">Staff must confirm</Badge>
              </div>
            )}
          </div>
        ) : (
          <p className="muted">—</p>
        )}
        <p className="muted-xs">Reflects the saved settings, not unsaved edits above.</p>
      </section>
    </>
  )
}
