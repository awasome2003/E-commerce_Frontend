import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { money, date, fullName } from '../lib/format'
import { useSession } from '../context/SessionContext'
import { PageHeader, Badge, ErrorNote, Spinner } from '../components/ui'
import NegotiatedPricing from '../components/NegotiatedPricing'

export default function CustomerDetail() {
  const { id } = useParams()
  const { can } = useSession()
  const [customer, setCustomer] = useState(null)
  const [pricing, setPricing] = useState(null)
  const [error, setError] = useState('')
  const [editingDistance, setEditingDistance] = useState(null)
  const [busy, setBusy] = useState(false)

  function load() {
    api.getCustomer(id).then(setCustomer).catch((err) => setError(err.message))
  }

  // Named so the pricing panel can refetch after it writes, without reloading
  // the customer record too.
  function loadPricing() {
    api.getCustomerPricing(id).then(setPricing).catch(() => setPricing(null))
  }

  useEffect(() => {
    load()
    loadPricing()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function saveDistance(outletId, value) {
    setBusy(true)
    setError('')
    try {
      // Blank means "unknown", which per-km delivery must distinguish from 0 km.
      await api.updateOutletDistance(outletId, value === '' ? null : Number(value))
      setEditingDistance(null)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (error && !customer) return <ErrorNote error={error} />
  if (!customer) return <Spinner />

  return (
    <>
      <PageHeader title={fullName(customer)} subtitle={`Customer #${customer.id}`}>
        <Link to="/admin/customers" className="btn btn-ghost btn-sm">
          Back to customers
        </Link>
      </PageHeader>

      <div className="tiles">
        <div className="tile">
          <span className="tile-label">Credit limit</span>
          <span className="tile-value">{money(customer.credit_limit)}</span>
          <span className="tile-hint">
            {customer.no_of_days != null ? `${customer.no_of_days} day terms` : 'no terms set'}
          </span>
        </div>
        <div className="tile">
          <span className="tile-label">Total spent</span>
          <span className="tile-value">{money(customer.total_spent)}</span>
        </div>
        <div className="tile">
          <span className="tile-label">Orders</span>
          <span className="tile-value">{customer._count.orders}</span>
        </div>
        <div className="tile">
          <span className="tile-label">Outlets</span>
          <span className="tile-value">{customer._count.user_outlets}</span>
        </div>
      </div>

      <div className="grid-2">
        <section className="card">
          <h2 className="card-title">Account</h2>
          <dl className="facts">
            <div><dt>Email</dt><dd>{customer.email || '—'}</dd></div>
            <div><dt>Phone</dt><dd>{customer.phone_number || '—'}</dd></div>
            <div><dt>Category</dt><dd>{customer.master_customer_category?.title || '—'}</dd></div>
            <div><dt>Joined</dt><dd>{date(customer.created_at)}</dd></div>
            <div><dt>GST</dt><dd>{customer.gst_number || '—'}</dd></div>
            <div><dt>PAN</dt><dd>{customer.pan_number || '—'}</dd></div>
          </dl>

          <h3 className="card-subtitle">Billing</h3>
          <dl className="facts">
            <div><dt>Name</dt><dd>{customer.billing_name || '—'}</dd></div>
            <div><dt>Address</dt><dd>{customer.billing_address || '—'}</dd></div>
            <div><dt>Contact</dt><dd>{customer.billing_contact || '—'}</dd></div>
            <div><dt>State</dt><dd>{customer.billing_state || '—'}</dd></div>
          </dl>
        </section>

        <div className="stack">
          <section className="card">
            <h2 className="card-title">Outlets</h2>
            {customer.user_outlets?.length ? (
              <ul className="outlets">
                {customer.user_outlets.map((o) => (
                  <li key={o.id} className="outlet">
                    <div className="outlet-head">
                      <strong>{o.outlet_name}</strong>
                      {o.outlet_state && <Badge tone="grey">{o.outlet_state}</Badge>}
                    </div>
                    <div className="muted-xs">{o.outlet_address}</div>
                    <div className="muted-xs">
                      {o.outlet_gstin ? `GSTIN ${o.outlet_gstin}` : ''}
                      {o.outlet_fssai ? ` · FSSAI ${o.outlet_fssai}` : ''}
                    </div>
                    {o.outlet_phones?.map((p, i) => (
                      <div key={i} className="muted-xs">
                        {p.contact_person_name} · {p.phone_number}
                      </div>
                    ))}

                    {/* Per-km delivery has no other source for this: the schema
                        holds no coordinates and addresses are free text. */}
                    <div className="distance-row">
                      {editingDistance?.id === o.id ? (
                        <>
                          <input
                            className="input input-inline"
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="km"
                            value={editingDistance.value}
                            onChange={(e) => setEditingDistance({ ...editingDistance, value: e.target.value })}
                            autoFocus
                          />
                          <button type="button" className="link link-btn" disabled={busy} onClick={() => saveDistance(o.id, editingDistance.value)}>
                            Save
                          </button>
                          <button type="button" className="link link-btn" onClick={() => setEditingDistance(null)}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="muted-xs">
                            Distance:{' '}
                            {o.distance_km === null ? (
                              <Badge tone="amber">not set</Badge>
                            ) : (
                              <strong>{o.distance_km} km</strong>
                            )}
                          </span>
                          {can('Customers', 'update') && (
                            <button
                              type="button"
                              className="link link-btn"
                              onClick={() => setEditingDistance({ id: o.id, value: o.distance_km ?? '' })}
                            >
                              {o.distance_km === null ? 'Set' : 'Edit'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No outlets registered.</p>
            )}
          </section>

          {!pricing ? (
            <section className="card">
              <h2 className="card-title">Negotiated pricing</h2>
              <p className="muted">Loading…</p>
            </section>
          ) : (
            <NegotiatedPricing
              customerId={id}
              pricing={pricing}
              onChanged={loadPricing}
              can={can}
            />
          )}
        </div>
      </div>
    </>
  )
}
