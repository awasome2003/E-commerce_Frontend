import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { shopApi } from '../../lib/shop-api'
import { useCart } from '../../context/CartContext'
import { money } from '../../lib/format'
import { Pagination, ErrorNote, Spinner, Badge } from '../../components/ui'

/** Prices come from the server per customer — never computed here. */
const SOURCE_NOTE = {
  user_flat: 'Your price',
  user_tier: 'Your bulk price',
  category_flat: 'Your price',
  category_tier: 'Your bulk price',
  global_tier: 'Bulk price',
}

export default function Catalogue() {
  const { addToCart } = useCart()
  const [data, setData] = useState(null)
  const [filters, setFilters] = useState({ categories: [], brands: [] })
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(null)

  useEffect(() => {
    shopApi.filters().then(setFilters).catch(() => {})
  }, [])

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 350)
    return () => clearTimeout(id)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debounced, categoryId])

  useEffect(() => {
    let cancelled = false
    setError('')
    shopApi
      .listProducts({ search: debounced, category_id: categoryId, page, limit: 24 })
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [debounced, categoryId, page])

  async function add(product) {
    setAdding(product.id)
    try {
      await addToCart(product.id, 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setAdding(null)
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Products</h1>
          <p className="page-sub">Prices shown are yours — bulk rates apply automatically.</p>
        </div>
      </header>

      <div className="filters">
        <input
          className="input"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {filters.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      <ErrorNote error={error} />

      {!data ? (
        <Spinner />
      ) : (
        <>
          <div className="product-grid">
            {data.items.map((p) => (
              <article key={p.id} className="product-card">
                <Link to={`/products/${p.id}`} className="product-media">
                  {p.product_images?.[0]?.image_url ? (
                    <img src={p.product_images[0].image_url} alt="" loading="lazy" />
                  ) : (
                    <div className="product-media-empty" />
                  )}
                </Link>

                <div className="product-body">
                  <Link to={`/products/${p.id}`} className="product-name">
                    {p.product_name}
                  </Link>
                  <div className="muted-xs">{p.master_brands?.title || p.master_category?.title || ''}</div>

                  {p.purchasable ? (
                    <>
                      <div className="product-price">
                        {money(p.unit_price)}
                        <span className="muted-xs"> / piece</span>
                      </div>
                      {SOURCE_NOTE[p.price_source] && (
                        <Badge tone={p.price_source.startsWith('user') ? 'violet' : 'blue'}>
                          {SOURCE_NOTE[p.price_source]}
                        </Badge>
                      )}
                      <button
                        type="button"
                        className="btn btn-primary btn-sm btn-block"
                        onClick={() => add(p)}
                        disabled={adding === p.id}
                      >
                        {adding === p.id ? 'Adding…' : 'Add to cart'}
                      </button>
                    </>
                  ) : (
                    // Never render ₹0 for a product with no price — see pricing-rules.js
                    <div className="muted-xs">Price on request</div>
                  )}
                </div>
              </article>
            ))}
          </div>

          {data.items.length === 0 && <p className="empty">No products match your search.</p>}

          <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
        </>
      )}
    </>
  )
}
