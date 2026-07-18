import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { money, money2 } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { PageHeader, ErrorNote, Spinner, Badge } from '../components/ui'
import PricePreview from '../components/PricePreview'

/** Client-side enum identifiers; Prisma maps these back to "S1-DRY" etc. */
const WAREHOUSES = ['S1_DRY', 'S1_FRZN', 'S1_CHLD']

const NUMERIC = new Set([
  'inst_price',
  'tax',
  'category_id',
  'sub_category_id',
  'brand_id',
  'manufacturer_id',
  'quantity_per_package',
  'weight_per_purchasing_unit',
  'weight_per_sales_unit',
  'inst_price',
  'is_active',
])

export default function ProductEdit() {
  const { id } = useParams()
  const { can } = useAuth()
  const editable = can('Products', 'update')

  const [product, setProduct] = useState(null)
  const [form, setForm] = useState({})
  const [lookups, setLookups] = useState({ categories: [], subCategories: [], brands: [], manufacturers: [] })
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api
      .getProduct(id)
      .then((p) => {
        setProduct(p)
        setForm({
          product_name: p.product_name ?? '',
          product_description: p.product_description ?? '',
          inst_price: money2(p.inst_price ?? 0),
          tax: p.tax ?? '',
          hsn_code: p.hsn_code ?? '',
          item_number: p.item_number ?? '',
          moq: p.moq ?? '',
          warehouse: p.warehouse ?? '',
          category_id: p.category_id ?? '',
          sub_category_id: p.sub_category_id ?? '',
          brand_id: p.brand_id ?? '',
          manufacturer_id: p.manufacturer_id ?? '',
          quantity_per_package: p.quantity_per_package ?? '',
          is_active: p.is_active ?? 1,
        })
      })
      .catch((err) => setError(err.message))
  }, [id])

  useEffect(() => {
    Promise.all([api.categories(), api.brands(), api.manufacturers()])
      .then(([categories, brands, manufacturers]) =>
        setLookups((prev) => ({ ...prev, categories, brands, manufacturers })),
      )
      .catch(() => {})
  }, [])

  // Sub-categories belong to a category, so the list reloads whenever it changes.
  useEffect(() => {
    if (!form.category_id) {
      setLookups((prev) => ({ ...prev, subCategories: [] }))
      return
    }
    api
      .subCategories(form.category_id)
      .then((subCategories) => setLookups((prev) => ({ ...prev, subCategories })))
      .catch(() => {})
  }, [form.category_id])

  function set(key, value) {
    setSaved(false)
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      // Empty selects/inputs must go back as null, not "", or MySQL will reject
      // them against int columns and the enum.
      const body = {}
      for (const [key, value] of Object.entries(form)) {
        if (value === '') body[key] = null
        else if (NUMERIC.has(key)) body[key] = Number(value)
        else body[key] = value
      }
      const updated = await api.updateProduct(id, body)
      setProduct((prev) => ({ ...prev, ...updated }))
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (error && !product) return <ErrorNote error={error} />
  if (!product) return <Spinner />

  return (
    <>
      <PageHeader title={product.product_name} subtitle={`Product #${product.id}`}>
        <Link to="/products" className="btn btn-ghost btn-sm">
          Back to products
        </Link>
      </PageHeader>

      <ErrorNote error={error} />
      {saved && <div className="note note-success">Changes saved.</div>}

      <div className="grid-2">
        <form className="card" onSubmit={handleSubmit}>
          <h2 className="card-title">Details</h2>

          <label className="field">
            <span>Name</span>
            <input className="input" value={form.product_name} onChange={(e) => set('product_name', e.target.value)} disabled={!editable} />
          </label>

          <label className="field">
            <span>Description</span>
            <textarea className="input" rows={4} value={form.product_description} onChange={(e) => set('product_description', e.target.value)} disabled={!editable} />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Selling price (₹)</span>
              <input className="input" type="number" step="0.01" value={form.inst_price} onChange={(e) => set('inst_price', e.target.value)} disabled={!editable} />
            </label>
            <label className="field">
              <span>Tax (%)</span>
              <input className="input" type="number" value={form.tax} onChange={(e) => set('tax', e.target.value)} disabled={!editable} />
            </label>
          </div>

          {/* product_price is legacy: zero across the whole active catalogue and
              never what carts or orders charge. Shown read-only so an old value
              on a migrated row is visible without inviting edits. */}
          <div className="note note-muted">
            Legacy <code>product_price</code>: {money(product.product_price)} — not used for
            pricing. Carts and orders bill the selling price above.
          </div>

          <div className="field-row">
            <label className="field">
              <span>HSN code</span>
              <input className="input" value={form.hsn_code} onChange={(e) => set('hsn_code', e.target.value)} disabled={!editable} />
            </label>
            <label className="field">
              <span>Item number</span>
              <input className="input" value={form.item_number} onChange={(e) => set('item_number', e.target.value)} disabled={!editable} />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Category</span>
              <select className="input" value={form.category_id} onChange={(e) => { set('category_id', e.target.value); set('sub_category_id', '') }} disabled={!editable}>
                <option value="">—</option>
                {lookups.categories.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Sub-category</span>
              <select className="input" value={form.sub_category_id} onChange={(e) => set('sub_category_id', e.target.value)} disabled={!editable || !form.category_id}>
                <option value="">—</option>
                {lookups.subCategories.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Brand</span>
              <select className="input" value={form.brand_id} onChange={(e) => set('brand_id', e.target.value)} disabled={!editable}>
                <option value="">—</option>
                {lookups.brands.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Manufacturer</span>
              <select className="input" value={form.manufacturer_id} onChange={(e) => set('manufacturer_id', e.target.value)} disabled={!editable}>
                <option value="">—</option>
                {lookups.manufacturers.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Warehouse</span>
              <select className="input" value={form.warehouse} onChange={(e) => set('warehouse', e.target.value)} disabled={!editable}>
                <option value="">—</option>
                {WAREHOUSES.map((w) => <option key={w} value={w}>{w.replace(/_/g, '-')}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Status</span>
              <select className="input" value={form.is_active} onChange={(e) => set('is_active', e.target.value)} disabled={!editable}>
                <option value={1}>Active</option>
                <option value={0}>Inactive</option>
              </select>
            </label>
          </div>

          {editable && (
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          )}
        </form>

        <div className="stack">
          <PricePreview productId={product.id} />

          <section className="card">
            <h2 className="card-title">Quantity pricing</h2>
            {product.product_pricing?.length ? (
              <table className="table table-compact">
                <thead>
                  <tr><th>Label</th><th className="right">Qty</th><th className="right">Price</th></tr>
                </thead>
                <tbody>
                  {product.product_pricing.map((tier) => (
                    <tr key={tier.id}>
                      <td>{tier.label || '—'}</td>
                      <td className="right">{tier.quantity ?? '—'}</td>
                      <td className="right">{money(tier.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted">No quantity tiers. The base price applies at every quantity.</p>
            )}
          </section>

          <section className="card">
            <h2 className="card-title">Media</h2>
            {product.product_images?.length ? (
              <div className="media-grid">
                {product.product_images.map((img) => (
                  <figure key={img.id} className="media-item">
                    {img.type === 'slider_image' ? (
                      <img src={img.image_url} alt="" loading="lazy" />
                    ) : (
                      <div className="media-video">Video</div>
                    )}
                    <figcaption><Badge tone="grey">{img.type?.replace(/_/g, ' ') || 'image'}</Badge></figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <p className="muted">No images uploaded.</p>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
