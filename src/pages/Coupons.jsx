import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { money } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { PageHeader, Badge, ErrorNote, Spinner } from '../components/ui'

/**
 * PROVISIONAL, pending client confirmation: `percent` means % off, `flat` means
 * rupees off. The API owns this mapping (coupon.controller.js); this only labels it.
 */
function valueLabel(coupon) {
  if (coupon.type === 'percent') return `${coupon.value}% off`
  if (coupon.type === 'flat') return `${money(coupon.value)} off`
  return '—'
}

const EMPTY = { code: '', title: '', description: '', discount_type: 'percent', value: '', is_active: 1 }

export default function Coupons() {
  const { can } = useAuth()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)

  function load() {
    setError('')
    api.listCoupons().then(setRows).catch((err) => setError(err.message))
  }

  useEffect(load, [])

  async function save(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const body = {
        code: editing.code,
        title: editing.title || null,
        description: editing.description || null,
        discount_type: editing.discount_type,
        value: editing.value,
        is_active: Number(editing.is_active),
      }
      if (editing.id) await api.updateCoupon(editing.id, body)
      else await api.createCoupon(body)
      setEditing(null)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(id) {
    setError('')
    try {
      await api.deleteCoupon(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <PageHeader title="Coupons" subtitle="Discount codes">
        {can('Coupon', 'create') && !editing && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({ ...EMPTY })}>
            New coupon
          </button>
        )}
      </PageHeader>

      {/* Coupons are not connected to orders anywhere in the schema. */}
      <div className="note note-muted">
        Coupons can be managed here but cannot yet be redeemed — nothing in the database links a
        coupon to an order. Redemption needs a schema change.
      </div>

      <ErrorNote error={error} />

      {editing && (
        <form className="card" onSubmit={save}>
          <h2 className="card-title">{editing.id ? `Edit coupon #${editing.id}` : 'New coupon'}</h2>

          <div className="field-row">
            <label className="field">
              <span>Code</span>
              <input
                className="input"
                value={editing.code}
                onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Title</span>
              <input
                className="input"
                value={editing.title ?? ''}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Discount type</span>
              <select
                className="input"
                value={editing.discount_type}
                onChange={(e) => setEditing({ ...editing, discount_type: e.target.value })}
              >
                <option value="percent">Percent off (%)</option>
                <option value="flat">Flat amount off (₹)</option>
              </select>
            </label>
            <label className="field">
              <span>Value</span>
              <input
                className="input"
                type="number"
                step="0.01"
                value={editing.value ?? ''}
                onChange={(e) => setEditing({ ...editing, value: e.target.value })}
              />
            </label>
          </div>

          <label className="field">
            <span>Description</span>
            <textarea
              className="input"
              rows={2}
              value={editing.description ?? ''}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            />
          </label>

          <label className="field">
            <span>Status</span>
            <select
              className="input"
              value={editing.is_active}
              onChange={(e) => setEditing({ ...editing, is_active: e.target.value })}
            >
              <option value={1}>Active</option>
              <option value={0}>Inactive</option>
            </select>
          </label>

          <div className="row-gap">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save coupon'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {!rows ? (
        <Spinner />
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Title</th>
                <th>Discount</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>
                    <code className="code">{c.code}</code>
                    {c.duplicate_code && (
                      <div className="muted-xs warn">Duplicate code — ambiguous at redemption</div>
                    )}
                  </td>
                  <td>{c.title || '—'}</td>
                  <td>{valueLabel(c)}</td>
                  <td>
                    <Badge tone={c.is_active === 1 ? 'green' : 'grey'}>
                      {c.is_active === 1 ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="right">
                    {can('Coupon', 'update') && (
                      <button
                        type="button"
                        className="link link-btn"
                        onClick={() =>
                          setEditing({
                            id: c.id,
                            code: c.code,
                            title: c.title ?? '',
                            description: c.description ?? '',
                            discount_type: c.type ?? 'percent',
                            value: c.value ?? '',
                            is_active: c.is_active,
                          })
                        }
                      >
                        Edit
                      </button>
                    )}
                    {can('Coupon', 'delete') && (
                      <button type="button" className="link link-btn link-danger" onClick={() => remove(c.id)}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-row">
                    No coupons yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
