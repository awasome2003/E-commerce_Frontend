import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { money, money2 } from '../lib/format'
import { useSession } from '../context/SessionContext'
import { PageHeader, ErrorNote, Spinner, Badge } from '../components/ui'
import PricePreview from '../components/PricePreview'
import ProductFields, { toBody, useProductLookups } from '../components/ProductForm'
import ProductTiers from '../components/ProductTiers'

export default function ProductEdit() {
  const { id } = useParams()
  const { can } = useSession()
  const editable = can('Products', 'update')

  const [product, setProduct] = useState(null)
  const [form, setForm] = useState({})
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

  const lookups = useProductLookups(form.category_id)

  /**
   * Refetch after a tier is added or removed.
   *
   * Deliberately updates `product` only. Rebuilding `form` here would discard
   * whatever the admin had typed but not yet saved.
   */
  function reload() {
    api.getProduct(id).then(setProduct).catch((err) => setError(err.message))
  }

  function set(key, value) {
    setSaved(false)
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const updated = await api.updateProduct(id, toBody(form))
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
        <Link to="/admin/products" className="btn btn-ghost btn-sm">
          Back to products
        </Link>
      </PageHeader>

      <ErrorNote error={error} />
      {saved && <div className="note note-success">Changes saved.</div>}

      <div className="grid-2">
        <form className="card" onSubmit={handleSubmit}>
          <h2 className="card-title">Details</h2>

          <ProductFields form={form} set={set} lookups={lookups} editable={editable} />

          {/* product_price is legacy: zero across the whole active catalogue and
              never what carts or orders charge. Shown read-only so an old value
              on a migrated row is visible without inviting edits. */}
          <div className="note note-muted">
            Legacy <code>product_price</code>: {money(product.product_price)} — not used for
            pricing. Carts and orders bill the selling price above.
          </div>

          {editable && (
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          )}
        </form>

        <div className="stack">
          <PricePreview productId={product.id} />

          <ProductTiers
            productId={product.id}
            tiers={product.product_pricing}
            onChanged={reload}
            can={can}
          />

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
