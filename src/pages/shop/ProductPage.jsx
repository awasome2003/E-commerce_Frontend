import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { shopApi } from '../../lib/shop-api'
import { useCart } from '../../context/CartContext'
import { money } from '../../lib/format'
import { ErrorNote, Spinner, Badge } from '../../components/ui'

const SOURCE_NOTE = {
  user_flat: 'Your agreed price',
  user_tier: 'Your bulk deal',
  category_flat: 'Your agreed price',
  category_tier: 'Your bulk deal',
  global_tier: 'Bulk deal',
  base: 'Standard price',
}

export default function ProductPage() {
  const { id } = useParams()
  const { addToCart } = useCart()
  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState('')
  const [added, setAdded] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    shopApi.getProduct(id).then(setProduct).catch((err) => setError(err.message))
  }, [id])

  async function add() {
    setBusy(true)
    setError('')
    try {
      await addToCart(product.id, quantity)
      setAdded(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (error && !product) return <ErrorNote error={error} />
  if (!product) return <Spinner />

  // Which break applies at the quantity the customer is currently choosing.
  const applicable = [...(product.price_breaks ?? [])]
    .filter((b) => b.quantity <= quantity)
    .sort((a, b) => b.quantity - a.quantity)[0]
  const effective = applicable?.unit_price ?? product.unit_price

  const image = product.product_images?.find((i) => i.type === 'slider_image')

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{product.product_name}</h1>
          <p className="page-sub">
            {product.master_brands?.title || '—'} · {product.master_category?.title || '—'}
          </p>
        </div>
        <Link to="/" className="btn btn-ghost btn-sm">
          Back to products
        </Link>
      </header>

      <ErrorNote error={error} />

      <div className="grid-2">
        <section className="card">
          {image ? (
            <img src={image.image_url} alt="" className="product-hero" />
          ) : (
            <div className="product-media-empty product-hero" />
          )}
          {product.product_description && <p className="muted">{product.product_description}</p>}
        </section>

        <div className="stack">
          <section className="card">
            {product.purchasable ? (
              <>
                <div className="product-price product-price-lg">
                  {money(effective)}
                  <span className="muted-xs"> / piece</span>
                </div>
                {applicable && SOURCE_NOTE[applicable.source] && (
                  <Badge tone={applicable.source.startsWith('user') ? 'violet' : 'blue'}>
                    {SOURCE_NOTE[applicable.source]}
                  </Badge>
                )}

                <div className="qty-row">
                  <label className="field">
                    <span>Quantity (pieces)</span>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => {
                        setQuantity(Math.max(Number(e.target.value) || 1, 1))
                        setAdded(false)
                      }}
                    />
                  </label>
                  <div className="qty-total">
                    <span className="tile-label">Line total</span>
                    <strong>{money(effective * quantity)}</strong>
                  </div>
                </div>

                <button type="button" className="btn btn-primary btn-block" onClick={add} disabled={busy}>
                  {busy ? 'Adding…' : 'Add to cart'}
                </button>
                {added && <p className="note note-success">Added to your cart.</p>}

                {product.quantity_per_package > 1 && (
                  <p className="muted-xs">
                    {product.quantity_per_package} pieces per box
                    {product.moq ? ` · minimum order ${product.moq}` : ''}
                  </p>
                )}
              </>
            ) : (
              <p className="muted">
                This product has no price set. Contact us for a quote — it cannot be ordered online yet.
              </p>
            )}
          </section>

          {product.price_breaks?.length > 1 && (
            <section className="card">
              <h2 className="card-title">Buy more, pay less</h2>
              <table className="table table-compact">
                <thead>
                  <tr>
                    <th>From quantity</th>
                    <th className="right">Price each</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {product.price_breaks.map((b) => (
                    <tr key={b.quantity} className={applicable?.quantity === b.quantity ? 'row-win' : ''}>
                      <td>{b.quantity}+</td>
                      <td className="right">{money(b.unit_price)}</td>
                      <td className="right">
                        {applicable?.quantity === b.quantity && <Badge tone="green">applies</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      </div>
    </>
  )
}
