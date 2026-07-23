import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useSession } from '../context/SessionContext'
import { PageHeader, ErrorNote } from '../components/ui'
import ProductFields, { EMPTY_PRODUCT, toBody, useProductLookups } from '../components/ProductForm'

/**
 * Create a product.
 *
 * Deliberately covers the catalogue row only. Quantity tiers, negotiated prices
 * and images all hang off a product id that does not exist yet, so they are set
 * afterwards — the page redirects to the edit screen on success, which is where
 * those live.
 */
export default function ProductNew() {
  const navigate = useNavigate()
  const { can } = useSession()
  const allowed = can('Products', 'create')

  const [form, setForm] = useState(EMPTY_PRODUCT)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const lookups = useProductLookups(form.category_id)

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    // Mirrors the server's check so the failure is immediate and points at the
    // field, rather than coming back as a generic 400.
    if (!form.product_name.trim()) return setError('Name is required.')
    if (form.inst_price === '' || Number.isNaN(Number(form.inst_price))) {
      return setError('Selling price is required.')
    }

    setBusy(true)
    try {
      const created = await api.createProduct(toBody(form))
      navigate(`/admin/products/${created.id}`, { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  if (!allowed) {
    return <ErrorNote error="You do not have permission to create products." />
  }

  return (
    <>
      <PageHeader title="New product" subtitle="Add an item to the catalogue">
        <Link to="/admin/products" className="btn btn-ghost btn-sm">
          Back to products
        </Link>
      </PageHeader>

      <ErrorNote error={error} />

      <form className="card" onSubmit={handleSubmit}>
        <h2 className="card-title">Details</h2>

        <ProductFields form={form} set={set} lookups={lookups} editable />

        <div className="note note-muted">
          Quantity tiers, customer-specific prices and images are added after the
          product exists — you will land on its page once it is saved.
        </div>

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Creating…' : 'Create product'}
        </button>
      </form>
    </>
  )
}
