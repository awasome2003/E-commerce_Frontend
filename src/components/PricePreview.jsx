import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { money, customerLabel } from '../lib/format'
import { Badge } from './ui'

/**
 * Pick a customer and a quantity, see what they would pay and why.
 *
 * The point is the *why*: the customer and category layers of the ladder have
 * never competed in a real order, so history cannot validate them. Showing every
 * candidate — winner and losers — is how someone who knows the business can
 * check the rules.
 */

const SOURCE_LABEL = {
  user_tier: "This customer's bulk deal",
  user_flat: "This customer's own price",
  category_tier: "Their category's bulk deal",
  category_flat: "Their category's price",
  global_tier: 'Public bulk deal',
  base: 'Normal price',
}

export default function PricePreview({ productId }) {
  const [customers, setCustomers] = useState([])
  const [userId, setUserId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .listCustomers({ limit: 100 })
      .then((res) => setCustomers(res.items))
      .catch(() => setCustomers([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    setError('')
    api
      .previewPrice({ product_id: productId, user_id: userId || undefined, quantity })
      .then((res) => !cancelled && setResult(res))
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [productId, userId, quantity])

  return (
    <section className="card">
      <h2 className="card-title">Price preview</h2>

      <div className="field-row">
        <label className="field">
          <span>Customer</span>
          <select className="input" value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Anyone (no customer)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {customerLabel(c)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Quantity (pieces)</span>
          <input
            className="input"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(Number(e.target.value) || 1, 1))}
          />
        </label>
      </div>

      {error && <div className="note note-error">{error}</div>}

      {result && (
        <>
          {result.unit_price === null ? (
            <div className="note note-error">
              No usable price for this product — it has no selling price and no override. It cannot
              be sold as configured.
            </div>
          ) : (
            <div className="preview-result">
              <div>
                <span className="tile-label">They pay</span>
                <span className="preview-price">{money(result.unit_price)}</span>
                <span className="muted-xs">per piece</span>
              </div>
              <div>
                <span className="tile-label">Line total</span>
                <span className="preview-total">{money(result.line_total)}</span>
                <span className="muted-xs">
                  {result.quantity} × {money(result.unit_price)}
                </span>
              </div>
              <div>
                <span className="tile-label">Because</span>
                <Badge tone="violet">{SOURCE_LABEL[result.source] ?? result.source}</Badge>
                {result.tax_included !== null && (
                  <span className="muted-xs">
                    includes {money(result.tax_included)} tax ({result.tax_percent}%)
                  </span>
                )}
              </div>
            </div>
          )}

          <h3 className="card-subtitle">Every rule considered</h3>
          <table className="table table-compact">
            <thead>
              <tr>
                <th>Rule</th>
                <th>Label</th>
                <th className="right">Price</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {result.candidates.map((c, i) => (
                <tr key={i} className={c.applies ? 'row-win' : ''}>
                  <td>{SOURCE_LABEL[c.source] ?? c.source}</td>
                  <td className="muted-xs">{c.note || '—'}</td>
                  <td className="right">{c.price === null ? '—' : money(c.price)}</td>
                  <td className="right">
                    {c.applies ? <Badge tone="green">applied</Badge> : <span className="muted-xs">not used</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted-xs">
            The most specific rule wins — not the cheapest. A customer with their own price pays it
            even when a public bulk deal is lower.
          </p>
        </>
      )}
    </section>
  )
}
