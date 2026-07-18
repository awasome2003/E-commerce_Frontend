import { useEffect, useState } from 'react'
import { shopApi } from '../../lib/shop-api'
import { ErrorNote, Spinner } from '../../components/ui'

const EMPTY = {
  outlet_name: '',
  outlet_address: '',
  outlet_landmark: '',
  outlet_state: '',
  outlet_gstin: '',
  outlet_fssai: '',
  contact_person_name: '',
  phone_number: '',
}

/**
 * Outlets are required to order — every order carries an outlet_id.
 *
 * Only 27 of 54 existing customers have one, so for half the customer base this
 * page is the first thing they must complete.
 */
export default function OutletsPage({ compact = false, onCreated }) {
  const [outlets, setOutlets] = useState(null)
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function load() {
    shopApi.listOutlets().then(setOutlets).catch((err) => setError(err.message))
  }

  useEffect(load, [])

  async function save(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const created = await shopApi.createOutlet(form)
      setForm(null)
      load()
      onCreated?.(created.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!outlets) return <Spinner />

  return (
    <>
      {!compact && (
        <header className="page-head">
          <div>
            <h1>Your outlets</h1>
            <p className="page-sub">Orders are delivered to one of these.</p>
          </div>
          {!form && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setForm({ ...EMPTY })}>
              Add outlet
            </button>
          )}
        </header>
      )}

      <ErrorNote error={error} />

      {outlets.length === 0 && !form && (
        <div className="note note-muted">
          You have no outlets yet. Add one before placing your first order.
          <button type="button" className="link link-btn" onClick={() => setForm({ ...EMPTY })}>
            Add one now
          </button>
        </div>
      )}

      {form && (
        <form className="card" onSubmit={save}>
          <h2 className="card-title">New outlet</h2>

          <div className="field-row">
            <label className="field">
              <span>Outlet name *</span>
              <input className="input" value={form.outlet_name} onChange={(e) => setForm({ ...form, outlet_name: e.target.value })} required />
            </label>
            <label className="field">
              <span>State</span>
              <input className="input" value={form.outlet_state} onChange={(e) => setForm({ ...form, outlet_state: e.target.value })} />
            </label>
          </div>

          <label className="field">
            <span>Address *</span>
            <textarea className="input" rows={2} value={form.outlet_address} onChange={(e) => setForm({ ...form, outlet_address: e.target.value })} required />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Landmark</span>
              <input className="input" value={form.outlet_landmark} onChange={(e) => setForm({ ...form, outlet_landmark: e.target.value })} />
            </label>
            <label className="field">
              <span>GSTIN</span>
              <input className="input" value={form.outlet_gstin} onChange={(e) => setForm({ ...form, outlet_gstin: e.target.value })} />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>FSSAI</span>
              <input className="input" value={form.outlet_fssai} onChange={(e) => setForm({ ...form, outlet_fssai: e.target.value })} />
            </label>
            <label className="field">
              <span>Contact person *</span>
              <input className="input" value={form.contact_person_name} onChange={(e) => setForm({ ...form, contact_person_name: e.target.value })} required />
            </label>
          </div>

          <label className="field">
            <span>Phone *</span>
            <input className="input" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} required />
          </label>

          <div className="row-gap">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save outlet'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {outlets.length > 0 && (
        <ul className="outlets">
          {outlets.map((o) => (
            <li key={o.id} className="outlet">
              <div className="outlet-head">
                <strong>{o.outlet_name}</strong>
                {o.outlet_state && <span className="badge tone-grey">{o.outlet_state}</span>}
              </div>
              <div className="muted-xs">{o.outlet_address}</div>
              {o.outlet_gstin && <div className="muted-xs">GSTIN {o.outlet_gstin}</div>}
              {o.outlet_phones.map((p) => (
                <div key={p.id} className="muted-xs">
                  {p.contact_person_name} · {p.phone_number}
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
