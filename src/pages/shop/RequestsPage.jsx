import { useEffect, useState } from 'react'
import { shopApi } from '../../lib/shop-api'
import { money } from '../../lib/format'
import { PageHeader, ErrorNote, Spinner, Badge } from '../../components/ui'

/**
 * Ask for something the cart cannot express: an item we do not stock, or a
 * basket you want priced before committing.
 *
 * A line is either a catalogue product (searched by name) or free text. Both are
 * allowed in the same request, because in practice a restock order and a
 * "do you carry this?" question arrive together.
 */

const TONE = {
  Pending: 'grey',
  Quoted: 'blue',
  Approved: 'green',
  Rejected: 'red',
}

const BLANK_LINE = { product_id: null, product_name: '', quantity: 1, search: '', results: [] }

export default function RequestsPage() {
  const [requests, setRequests] = useState(null)
  const [outlets, setOutlets] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)

  const [outletId, setOutletId] = useState('')
  const [note, setNote] = useState('')
  const [lines, setLines] = useState([{ ...BLANK_LINE }])

  function load() {
    shopApi.listRequests().then(setRequests).catch((err) => setError(err.message))
  }

  useEffect(() => {
    load()
    shopApi
      .listOutlets()
      .then((rows) => {
        setOutlets(rows)
        // Default to the first outlet rather than blank: an approved request has
        // to be delivered somewhere, and a request with no outlet cannot be
        // converted into an order without going back to the customer.
        if (rows.length > 0) setOutletId((current) => current || String(rows[0].id))
      })
      .catch(() => setOutlets([]))
  }, [])

  function setLine(index, patch) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }

  // Searching is what lets a line resolve to a real product_id; without it every
  // line would be free text and nothing could ever convert into an order.
  async function search(index, term) {
    setLine(index, { search: term, product_id: null, product_name: term })
    if (term.trim().length < 2) return setLine(index, { results: [] })
    try {
      const res = await shopApi.listProducts({ search: term, limit: 5 })
      setLine(index, { results: res.items ?? [] })
    } catch {
      setLine(index, { results: [] })
    }
  }

  function choose(index, product) {
    setLine(index, {
      product_id: product.id,
      product_name: product.product_name,
      search: product.product_name,
      results: [],
    })
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await shopApi.createRequest({
        outlet_id: outletId || null,
        note,
        items: lines.map((l) => ({
          product_id: l.product_id,
          product_name: l.product_id ? null : l.product_name.trim(),
          quantity: Number(l.quantity),
        })),
      })
      setLines([{ ...BLANK_LINE }])
      setNote('')
      setOpen(false)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function cancel(id) {
    setError('')
    try {
      await shopApi.cancelRequest(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <PageHeader title="My requests" subtitle="Ask for an item we don't stock, or get a basket priced">
        <button className="btn btn-primary btn-sm" onClick={() => setOpen((v) => !v)}>
          {open ? 'Close' : 'New request'}
        </button>
      </PageHeader>

      <ErrorNote error={error} />

      {open && (
        <form className="card" onSubmit={submit}>
          <h2 className="card-title">New request</h2>

          <label className="field">
            <span>Deliver to</span>
            <select className="input" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
              <option value="">— not sure yet —</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>{o.outlet_name}</option>
              ))}
            </select>
          </label>

          {lines.map((line, index) => (
            <div key={index} className="request-line">
              <label className="field">
                <span>Item {index + 1}</span>
                <input
                  className="input"
                  placeholder="Search the catalogue, or type any product name"
                  value={line.search}
                  onChange={(e) => search(index, e.target.value)}
                />
                {line.product_id ? (
                  <small className="muted">In catalogue — we can price this straight away.</small>
                ) : (
                  line.search.trim().length > 1 && (
                    <small className="muted">Not selected from the catalogue — sent as a request to stock it.</small>
                  )
                )}
                {line.results.length > 0 && (
                  <ul className="suggest">
                    {line.results.map((p) => (
                      <li key={p.id}>
                        <button type="button" onClick={() => choose(index, p)}>
                          {p.product_name} <span className="muted">{money(p.unit_price)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </label>

              <label className="field field-narrow">
                <span>Qty</span>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={line.quantity}
                  onChange={(e) => setLine(index, { quantity: e.target.value })}
                />
              </label>

              {lines.length > 1 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setLines((prev) => [...prev, { ...BLANK_LINE }])}
          >
            + Add another item
          </button>

          <label className="field">
            <span>Note</span>
            <textarea
              className="input"
              rows={3}
              placeholder="Anything we should know — dates, pack sizes, budget"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Sending…' : 'Send request'}
          </button>
        </form>
      )}

      {!requests ? (
        <Spinner />
      ) : requests.length === 0 ? (
        <div className="empty">
          <h2>No requests yet</h2>
          <p>Ask us for anything you cannot find in the catalogue.</p>
        </div>
      ) : (
        <div className="stack">
          {requests.map((r) => (
            <section key={r.id} className="card">
              <div className="row-between">
                <h2 className="card-title">Request #{r.id}</h2>
                <Badge tone={TONE[r.status] ?? 'grey'}>{r.status}</Badge>
              </div>

              {r.note && <p className="muted">{r.note}</p>}

              <table className="table table-compact">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="right">Qty</th>
                    <th className="right">Quoted</th>
                  </tr>
                </thead>
                <tbody>
                  {r.product_request_items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.products?.product_name ?? item.product_name}
                        {!item.product_id && <Badge tone="grey">not stocked</Badge>}
                      </td>
                      <td className="right">{item.quantity}</td>
                      <td className="right">
                        {item.quoted_price === null ? '—' : money(item.quoted_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {r.admin_reply && <div className="note note-muted">{r.admin_reply}</div>}

              {r.order_id && (
                <div className="note note-success">
                  Approved — this is now order #{r.order_id}.
                </div>
              )}

              {r.status !== 'Approved' && (
                <button className="btn btn-ghost btn-sm" onClick={() => cancel(r.id)}>
                  Withdraw
                </button>
              )}
            </section>
          ))}
        </div>
      )}
    </>
  )
}
