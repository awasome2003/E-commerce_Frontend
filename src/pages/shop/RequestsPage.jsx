import { useEffect, useState } from 'react'
import { Plus, X, Trash2, ChevronDown, MessageSquarePlus, CheckCircle2 } from 'lucide-react'
import { shopApi } from '../../lib/shop-api'
import { money } from '../../lib/format'
import {
  PageHeader, Card, Spinner, ErrorBox, EmptyState, Badge, StatusBadge,
  btnPrimary, btnGhost, fieldLabel, inputClass,
} from '../../components/shop/ui'

/**
 * Ask for something the cart cannot express: an item we do not stock, or a
 * basket you want priced before committing.
 *
 * A line is either a catalogue product (searched by name) or free text. Both are
 * allowed in the same request, because in practice a restock order and a
 * "do you carry this?" question arrive together.
 */

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
    <div className="space-y-5">
      <PageHeader title="My requests" subtitle="Ask for an item we don't stock, or get a basket priced.">
        <button className={btnPrimary} onClick={() => setOpen((v) => !v)}>
          {open ? <><X size={16} /> Close</> : <><Plus size={16} /> New request</>}
        </button>
      </PageHeader>

      <ErrorBox error={error} />

      {open && (
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-5">
            <h2 className="font-bold text-slate-800">New request</h2>

            <div>
              <label className={fieldLabel}>Deliver to</label>
              <div className="relative max-w-sm">
                <select className={inputClass + ' appearance-none pr-10 cursor-pointer'} value={outletId} onChange={(e) => setOutletId(e.target.value)}>
                  <option value="">— not sure yet —</option>
                  {outlets.map((o) => <option key={o.id} value={o.id}>{o.outlet_name}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-3">
              {lines.map((line, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-1 relative">
                    <label className={fieldLabel}>Item {index + 1}</label>
                    <input
                      className={inputClass}
                      placeholder="Search the catalogue, or type any product name"
                      value={line.search}
                      onChange={(e) => search(index, e.target.value)}
                    />
                    {line.product_id ? (
                      <small className="block mt-1 text-xs text-emerald-600">In catalogue — we can price this straight away.</small>
                    ) : (
                      line.search.trim().length > 1 && (
                        <small className="block mt-1 text-xs text-slate-400">Not from the catalogue — sent as a request to stock it.</small>
                      )
                    )}
                    {line.results.length > 0 && (
                      <ul className="absolute z-10 left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                        {line.results.map((p) => (
                          <li key={p.id}>
                            <button type="button" onClick={() => choose(index, p)}
                              className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-amber-50 flex items-center justify-between gap-2">
                              <span className="text-slate-700 truncate">{p.product_name}</span>
                              <span className="text-xs text-slate-400 shrink-0">{money(p.unit_price)}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="w-24">
                    <label className={fieldLabel}>Qty</label>
                    <input className={inputClass} type="number" min="1" value={line.quantity}
                      onChange={(e) => setLine(index, { quantity: e.target.value })} />
                  </div>

                  {lines.length > 1 && (
                    <button type="button" onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                      className="mt-7 w-10 h-[42px] grid place-items-center rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button type="button" onClick={() => setLines((prev) => [...prev, { ...BLANK_LINE }])}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:text-amber-700">
              <Plus size={15} /> Add another item
            </button>

            <div>
              <label className={fieldLabel}>Note</label>
              <textarea className={inputClass} rows={3} placeholder="Anything we should know — dates, pack sizes, budget"
                value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            <button type="submit" className={btnPrimary} disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
          </form>
        </Card>
      )}

      {!requests ? (
        <Spinner />
      ) : requests.length === 0 ? (
        <EmptyState icon={MessageSquarePlus} title="No requests yet" message="Ask us for anything you cannot find in the catalogue." />
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <Card key={r.id} className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-bold text-slate-800">Request #{r.id}</h2>
                <StatusBadge status={r.status} />
              </div>

              {r.note && <p className="text-sm text-slate-500">{r.note}</p>}

              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[11px] font-semibold uppercase tracking-wide">
                      <th className="px-4 py-2.5">Item</th>
                      <th className="px-4 py-2.5 text-right">Qty</th>
                      <th className="px-4 py-2.5 text-right">Quoted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {r.product_request_items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2.5">
                          <span className="text-slate-700">{item.products?.product_name ?? item.product_name}</span>
                          {!item.product_id && <Badge tone="slate" className="ml-2">not stocked</Badge>}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-600">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-slate-800">
                          {item.quoted_price === null ? '—' : money(item.quoted_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {r.admin_reply && (
                <div className="rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-600 px-4 py-3">{r.admin_reply}</div>
              )}

              {r.order_id && (
                <div className="rounded-xl bg-emerald-50 text-emerald-700 text-sm px-4 py-3 flex items-center gap-2">
                  <CheckCircle2 size={17} /> Approved — this is now order #{r.order_id}.
                </div>
              )}

              {r.status !== 'Approved' && (
                <button className={btnGhost + ' !py-2 text-sm'} onClick={() => cancel(r.id)}>Withdraw</button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
