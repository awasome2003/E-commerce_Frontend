import { useState } from 'react'
import { api } from '../lib/api'
import { money } from '../lib/format'
import { ErrorNote } from './ui'

/**
 * Public quantity tiers for one product (`product_pricing`).
 *
 * These apply to every customer who has no more specific price, so they are the
 * lowest rung of the ladder above the catalogue price.
 *
 * Two things worth stating on screen, because both surprise people:
 *  - the quantity is a LOWER THRESHOLD, not a bundle size
 *  - the price is PER UNIT
 * Existing data proves both: a tier at qty 25 priced 9 billed 38 units at 342.
 *
 * Tiers are not required to get cheaper as quantity rises — this data contains
 * qty 30 at ₹250 and qty 50 at ₹450 — so nothing here reorders or "corrects"
 * them. They are listed by quantity, exactly as the engine reads them.
 */
export default function ProductTiers({ productId, tiers, onChanged, can }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [edits, setEdits] = useState({})
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ quantity: '', price: '', label: '' })

  const canCreate = can('Products', 'create')
  const canUpdate = can('Products', 'update')
  const canDelete = can('Products', 'delete')

  async function run(fn) {
    setError('')
    setBusy(true)
    try {
      await fn()
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function add(event) {
    event.preventDefault()
    return run(async () => {
      await api.addProductTier(productId, draft)
      setDraft({ quantity: '', price: '', label: '' })
      setAdding(false)
    })
  }

  const rows = tiers ?? []

  return (
    <section className="card">
      <div className="row-between">
        <h2 className="card-title">Quantity pricing</h2>
        {canCreate && (
          <button className="btn btn-ghost btn-sm" onClick={() => setAdding((v) => !v)}>
            {adding ? 'Cancel' : '+ Add tier'}
          </button>
        )}
      </div>

      <ErrorNote error={error} />

      {adding && (
        <form className="price-add" onSubmit={add}>
          <div className="field-row">
            <label className="field">
              <span>From quantity</span>
              <input
                className="input"
                type="number"
                min="1"
                value={draft.quantity}
                onChange={(e) => setDraft((d) => ({ ...d, quantity: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>Price per unit (₹)</span>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0.01"
                value={draft.price}
                onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
              />
            </label>
          </div>
          <label className="field">
            <span>Label (optional, display only)</span>
            <input
              className="input"
              placeholder="e.g. Case of 24"
              value={draft.label}
              onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
            />
          </label>
          <p className="muted">
            Applies once anyone orders this many or more, and the price is charged per unit.
            A customer with their own negotiated price keeps it instead.
          </p>
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
            {busy ? 'Saving…' : 'Add tier'}
          </button>
        </form>
      )}

      {rows.length === 0 ? (
        !adding && <p className="muted">No quantity tiers. The base price applies at every quantity.</p>
      ) : (
        <table className="table table-compact">
          <thead>
            <tr>
              <th>Label</th>
              <th className="right">From qty</th>
              <th className="right">Price / unit</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((tier) => {
              const value = edits[tier.id] ?? tier.price
              return (
                <tr key={tier.id}>
                  <td>{tier.label || '—'}</td>
                  <td className="right">{tier.quantity ?? '—'}</td>
                  <td className="right">
                    {canUpdate ? (
                      <input
                        className="input input-sm"
                        type="number"
                        step="0.01"
                        value={value}
                        onChange={(e) => setEdits((p) => ({ ...p, [tier.id]: e.target.value }))}
                      />
                    ) : (
                      <strong>{money(tier.price)}</strong>
                    )}
                  </td>
                  <td className="right">
                    <div className="row-actions">
                      {canUpdate && String(value) !== String(tier.price) && (
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={busy}
                          onClick={() => run(() => api.updateProductTier(productId, tier.id, { price: value }))}
                        >
                          Save
                        </button>
                      )}
                      {canDelete && (
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={busy}
                          onClick={() => run(() => api.deleteProductTier(productId, tier.id))}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}
