import { useState } from 'react'
import { api } from '../lib/api'
import { money } from '../lib/format'
import { Badge, ErrorNote } from './ui'

/**
 * Editing one customer's price layers.
 *
 * Two shapes, matching the two tables behind them: a flat price that applies at
 * any quantity, and quantity tiers that apply from a threshold upwards.
 *
 * Rows scoped to the customer's CATEGORY are shown but never editable here —
 * they are shared with every other customer in that category, and changing one
 * from a single customer's page would quietly reprice everybody else. The server
 * refuses it too; this just stops the attempt being made.
 *
 * Prices are per unit. A tier's quantity is a lower threshold, not a bundle
 * size — see lib/pricing-rules.js.
 */

const BLANK = { product_id: null, product_name: '', search: '', results: [], quantity: '', price: '', label: '' }

function ScopeBadge({ row }) {
  return row.user_id ? (
    <Badge tone="violet">This customer</Badge>
  ) : (
    <Badge tone="blue">Category</Badge>
  )
}

export default function NegotiatedPricing({ customerId, pricing, onChanged, can }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [edits, setEdits] = useState({})
  const [adding, setAdding] = useState(null) // 'flat' | 'tier' | null
  const [draft, setDraft] = useState({ ...BLANK })

  const canCreate = can('Customers', 'create')
  const canUpdate = can('Customers', 'update')
  const canDelete = can('Customers', 'delete')

  function editKey(kind, id) {
    return `${kind}:${id}`
  }

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

  async function search(term) {
    setDraft((d) => ({ ...d, search: term, product_id: null, product_name: term }))
    if (term.trim().length < 2) return setDraft((d) => ({ ...d, results: [] }))
    try {
      const res = await api.listProducts({ search: term, limit: 5 })
      setDraft((d) => ({ ...d, results: res.items ?? [] }))
    } catch {
      setDraft((d) => ({ ...d, results: [] }))
    }
  }

  function submitAdd(event) {
    event.preventDefault()
    if (!draft.product_id) return setError('Pick a product from the list.')

    return run(async () => {
      if (adding === 'flat') {
        await api.addCustomerFlatPrice(customerId, {
          product_id: draft.product_id,
          item_price: draft.price,
        })
      } else {
        await api.addCustomerTier(customerId, {
          product_id: draft.product_id,
          quantity: draft.quantity,
          price: draft.price,
          label: draft.label,
        })
      }
      setDraft({ ...BLANK })
      setAdding(null)
    })
  }

  const flat = pricing?.flat_overrides ?? []
  const tiers = pricing?.tiered_overrides ?? []
  const empty = flat.length === 0 && tiers.length === 0

  return (
    <section className="card">
      <div className="row-between">
        <h2 className="card-title">Negotiated pricing</h2>
        {canCreate && (
          <div className="row-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(adding === 'flat' ? null : 'flat'); setDraft({ ...BLANK }) }}>
              + Fixed price
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(adding === 'tier' ? null : 'tier'); setDraft({ ...BLANK }) }}>
              + Quantity tier
            </button>
          </div>
        )}
      </div>

      <ErrorNote error={error} />

      {adding && (
        <form className="price-add" onSubmit={submitAdd}>
          <label className="field">
            <span>Product</span>
            <input
              className="input"
              placeholder="Search by name, item number or HSN…"
              value={draft.search}
              onChange={(e) => search(e.target.value)}
            />
            {draft.results.length > 0 && (
              <ul className="suggest">
                {draft.results.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          product_id: p.id,
                          product_name: p.product_name,
                          search: p.product_name,
                          results: [],
                        }))
                      }
                    >
                      {p.product_name} <span className="muted">{money(p.inst_price)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </label>

          <div className="field-row">
            {adding === 'tier' && (
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
            )}
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

          {adding === 'tier' && (
            <label className="field">
              <span>Label (optional, display only)</span>
              <input
                className="input"
                value={draft.label}
                onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
              />
            </label>
          )}

          <p className="muted">
            {adding === 'flat'
              ? 'Applies at every quantity, and beats any public bulk tier — most specific wins, not cheapest.'
              : 'Applies once the customer orders this many or more. The price is per unit.'}
          </p>

          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
            {busy ? 'Saving…' : 'Add'}
          </button>
        </form>
      )}

      {empty && !adding && (
        <p className="muted">No overrides. This customer pays the catalogue price on every product.</p>
      )}

      {flat.length > 0 && (
        <>
          <h3 className="card-subtitle">Fixed price</h3>
          <table className="table table-compact">
            <thead>
              <tr>
                <th>Product</th>
                <th className="right">Catalogue</th>
                <th className="right">Their price</th>
                <th>Scope</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {flat.map((row) => {
                const key = editKey('flat', row.id)
                const mine = Boolean(row.user_id)
                const value = edits[key] ?? row.item_price
                return (
                  <tr key={row.id}>
                    <td>{row.products.product_name}</td>
                    <td className="right">{money(row.products.inst_price)}</td>
                    <td className="right">
                      {mine && canUpdate ? (
                        <input
                          className="input input-sm"
                          type="number"
                          step="0.01"
                          value={value}
                          onChange={(e) => setEdits((p) => ({ ...p, [key]: e.target.value }))}
                        />
                      ) : (
                        <strong>{money(row.item_price)}</strong>
                      )}
                    </td>
                    <td><ScopeBadge row={row} /></td>
                    <td className="right">
                      {mine ? (
                        <div className="row-actions">
                          {canUpdate && String(value) !== String(row.item_price) && (
                            <button
                              className="btn btn-ghost btn-sm"
                              disabled={busy}
                              onClick={() =>
                                run(() => api.updateCustomerFlatPrice(customerId, row.id, { item_price: value }))
                              }
                            >
                              Save
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="btn btn-danger btn-sm"
                              disabled={busy}
                              onClick={() => run(() => api.deleteCustomerFlatPrice(customerId, row.id))}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="muted" title="Shared with everyone in this category">
                          shared
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}

      {tiers.length > 0 && (
        <>
          <h3 className="card-subtitle">Quantity tiers</h3>
          <table className="table table-compact">
            <thead>
              <tr>
                <th>Product</th>
                <th>Label</th>
                <th className="right">From qty</th>
                <th className="right">Price / unit</th>
                <th>Scope</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tiers.map((row) => {
                const key = editKey('tier', row.id)
                const mine = Boolean(row.user_id)
                const value = edits[key] ?? row.price
                return (
                  <tr key={row.id}>
                    <td>{row.products.product_name}</td>
                    <td>{row.label || '—'}</td>
                    <td className="right">{row.quantity}</td>
                    <td className="right">
                      {mine && canUpdate ? (
                        <input
                          className="input input-sm"
                          type="number"
                          step="0.01"
                          value={value}
                          onChange={(e) => setEdits((p) => ({ ...p, [key]: e.target.value }))}
                        />
                      ) : (
                        <strong>{money(row.price)}</strong>
                      )}
                    </td>
                    <td><ScopeBadge row={row} /></td>
                    <td className="right">
                      {mine ? (
                        <div className="row-actions">
                          {canUpdate && String(value) !== String(row.price) && (
                            <button
                              className="btn btn-ghost btn-sm"
                              disabled={busy}
                              onClick={() => run(() => api.updateCustomerTier(customerId, row.id, { price: value }))}
                            >
                              Save
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="btn btn-danger btn-sm"
                              disabled={busy}
                              onClick={() => run(() => api.deleteCustomerTier(customerId, row.id))}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="muted" title="Shared with everyone in this category">
                          shared
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}
    </section>
  )
}
