import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { money, date } from '../lib/format'
import { PageHeader, Pagination, ErrorNote, Spinner } from '../components/ui'

/**
 * Purchase orders and GST invoices — read-only.
 *
 * These are issued documents: their totals and addresses are frozen at issue
 * time and deliberately duplicate the order. Nothing here edits them.
 */
export default function Documents() {
  const [tab, setTab] = useState('invoices')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 350)
    return () => clearTimeout(id)
  }, [search])

  useEffect(() => {
    setPage(1)
    setData(null)
  }, [tab, debounced])

  useEffect(() => {
    let cancelled = false
    setError('')
    const load = tab === 'invoices' ? api.listInvoices : api.listPurchaseOrders
    load({ search: debounced, page, limit: 25 })
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [tab, debounced, page])

  return (
    <>
      <PageHeader title="Documents" subtitle="Issued invoices and purchase orders" />

      <div className="tabs">
        <button type="button" className={`tab${tab === 'invoices' ? ' is-active' : ''}`} onClick={() => setTab('invoices')}>
          Invoices
        </button>
        <button type="button" className={`tab${tab === 'purchase-orders' ? ' is-active' : ''}`} onClick={() => setTab('purchase-orders')}>
          Purchase orders
        </button>
      </div>

      <div className="filters">
        <input
          className="input"
          placeholder={tab === 'invoices' ? 'Search customer, outlet or GST…' : 'Search PO number, bill-to or GSTIN…'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <ErrorNote error={error} />

      {!data ? (
        <Spinner />
      ) : (
        <div className="card">
          {tab === 'invoices' ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Outlet</th>
                  <th>GST</th>
                  <th className="right">Sub-total</th>
                  <th className="right">Final</th>
                  <th>Order</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <div className="cell-title">#{i.invoice_number ?? i.id}</div>
                      <div className="muted-xs">{date(i.invoice_date)}</div>
                    </td>
                    <td>{i.customer_name || '—'}</td>
                    <td>{i.outlet_name || '—'}</td>
                    <td className="muted-xs">{i.gst_number || '—'}</td>
                    <td className="right">{money(i.sub_total)}</td>
                    <td className="right">{money(i.final_amount)}</td>
                    <td>
                      {i.order_id ? (
                        <Link to={`/admin/orders/${i.order_id}`} className="link">
                          #{i.order_id}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="right">
                      {i.invoice_url && (
                        <a href={i.invoice_url} target="_blank" rel="noreferrer" className="link">
                          PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>PO</th>
                  <th>Bill to</th>
                  <th>Ship to</th>
                  <th>GSTIN</th>
                  <th className="right">Sub-total</th>
                  <th className="right">Final</th>
                  <th>Order</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="cell-title">{p.po_number}</div>
                      <div className="muted-xs">{date(p.po_date)}</div>
                    </td>
                    <td>{p.bill_to_name}</td>
                    <td>
                      {p.ship_to_name}
                      <div className="muted-xs">{p.ship_to_state}</div>
                    </td>
                    <td className="muted-xs">{p.bill_to_gstin || '—'}</td>
                    <td className="right">{money(p.sub_total)}</td>
                    <td className="right">{money(p.final_amount)}</td>
                    <td>
                      <Link to={`/admin/orders/${p.order_id}`} className="link">
                        #{p.order_id}
                      </Link>
                    </td>
                    <td className="right">
                      {p.receipt_url && (
                        <a href={p.receipt_url} target="_blank" rel="noreferrer" className="link">
                          PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {data.items.length === 0 && <p className="empty-row">Nothing matches this search.</p>}
          <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
        </div>
      )}
    </>
  )
}
