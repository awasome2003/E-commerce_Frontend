import { useEffect, useState } from 'react'
import { Store, MapPin, Phone, Plus } from 'lucide-react'
import { shopApi } from '../../lib/shop-api'
import {
  PageHeader, Card, Spinner, ErrorBox, EmptyState, Badge,
  btnPrimary, btnGhost, fieldLabel, inputClass,
} from '../../components/shop/ui'

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
 * page is the first thing they must complete. Also rendered inline on checkout
 * via `compact` (form only, no list / header) so an outlet can be added without
 * leaving the flow.
 */
export default function OutletsPage({ compact = false, onCreated }) {
  const [outlets, setOutlets] = useState(null)
  const [form, setForm] = useState(compact ? { ...EMPTY } : null)
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
      setForm(compact ? { ...EMPTY } : null)
      load()
      onCreated?.(created.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!outlets) return <Spinner />

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  // Built only when a draft exists — the JSX below reads form.* eagerly, so
  // constructing it with form === null (the full page's initial state) would throw.
  const formEl = form && (
    <form onSubmit={save} className={compact ? 'space-y-4' : ''}>
      {!compact && <h2 className="font-bold text-slate-800 mb-4">New outlet</h2>}
      <div className={compact ? 'space-y-4' : 'space-y-4'}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={fieldLabel}>Outlet name *</label>
            <input className={inputClass} value={form.outlet_name} onChange={(e) => set({ outlet_name: e.target.value })} required />
          </div>
          <div>
            <label className={fieldLabel}>State</label>
            <input className={inputClass} value={form.outlet_state} onChange={(e) => set({ outlet_state: e.target.value })} />
          </div>
        </div>

        <div>
          <label className={fieldLabel}>Address *</label>
          <textarea className={inputClass} rows={2} value={form.outlet_address} onChange={(e) => set({ outlet_address: e.target.value })} required />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={fieldLabel}>Landmark</label>
            <input className={inputClass} value={form.outlet_landmark} onChange={(e) => set({ outlet_landmark: e.target.value })} />
          </div>
          <div>
            <label className={fieldLabel}>GSTIN</label>
            <input className={inputClass} value={form.outlet_gstin} onChange={(e) => set({ outlet_gstin: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={fieldLabel}>FSSAI</label>
            <input className={inputClass} value={form.outlet_fssai} onChange={(e) => set({ outlet_fssai: e.target.value })} />
          </div>
          <div>
            <label className={fieldLabel}>Contact person *</label>
            <input className={inputClass} value={form.contact_person_name} onChange={(e) => set({ contact_person_name: e.target.value })} required />
          </div>
        </div>

        <div>
          <label className={fieldLabel}>Phone *</label>
          <input className={inputClass} value={form.phone_number} onChange={(e) => set({ phone_number: e.target.value })} required />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button type="submit" className={btnPrimary} disabled={busy}>{busy ? 'Saving…' : 'Save outlet'}</button>
          {!compact && (
            <button type="button" className={btnGhost} onClick={() => setForm(null)}>Cancel</button>
          )}
        </div>
      </div>
    </form>
  )

  // Compact = embedded in checkout: form only.
  if (compact) {
    return (
      <>
        <ErrorBox error={error} />
        {formEl}
      </>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Your outlets" subtitle="Orders are delivered to one of these.">
        {!form && (
          <button className={btnPrimary} onClick={() => setForm({ ...EMPTY })}><Plus size={16} /> Add outlet</button>
        )}
      </PageHeader>

      <ErrorBox error={error} />

      {form && <Card className="p-6">{formEl}</Card>}

      {outlets.length === 0 && !form ? (
        <EmptyState icon={Store} title="No outlets yet" message="Add one before placing your first order.">
          <button className={btnPrimary} onClick={() => setForm({ ...EMPTY })}><Plus size={16} /> Add your first outlet</button>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {outlets.map((o) => (
            <Card key={o.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-9 h-9 grid place-items-center rounded-xl bg-amber-50 text-amber-600 shrink-0"><Store size={17} /></span>
                  <strong className="text-slate-800 truncate">{o.outlet_name}</strong>
                </div>
                {o.outlet_state && <Badge tone="slate">{o.outlet_state}</Badge>}
              </div>
              <div className="flex items-start gap-2 text-sm text-slate-500">
                <MapPin size={15} className="text-slate-400 mt-0.5 shrink-0" />
                <span>{o.outlet_address}</span>
              </div>
              {o.outlet_gstin && <div className="text-xs text-slate-400 pl-[23px]">GSTIN {o.outlet_gstin}</div>}
              {o.outlet_phones.map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-sm text-slate-500">
                  <Phone size={14} className="text-slate-400 shrink-0" />
                  <span>{p.contact_person_name} · {p.phone_number}</span>
                </div>
              ))}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
