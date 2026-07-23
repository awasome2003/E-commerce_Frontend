import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { money } from '../lib/format'
import { useSession } from '../context/SessionContext'
import { PageHeader, Pagination, Badge, ErrorNote, Spinner } from '../components/ui'

/** Debounce keeps a 1,700-row catalogue from firing a query per keystroke. */
function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export default function Products() {
  const { can } = useSession()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState([])

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [isActive, setIsActive] = useState('')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounced(search)

  useEffect(() => {
    api.categories().then(setCategories).catch(() => setCategories([]))
  }, [])

  // Any filter change invalidates the current page number.
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, categoryId, isActive])

  useEffect(() => {
    let cancelled = false
    setError('')
    api
      .listProducts({ search: debouncedSearch, category_id: categoryId, is_active: isActive, page, limit: 25 })
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [debouncedSearch, categoryId, isActive, page])

  return (
    <>
      <PageHeader title="Products" subtitle="Catalogue, pricing and tax details">
        {can('Products', 'create') && (
          <Link to="/admin/products/new" className="btn btn-primary btn-sm">
            New product
          </Link>
        )}
      </PageHeader>

      <div className="filters">
        <input
          className="input"
          placeholder="Search name, item number or HSN…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <select className="input" value={isActive} onChange={(e) => setIsActive(e.target.value)}>
          <option value="">Any status</option>
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>
      </div>

      <ErrorNote error={error} />

      {!data ? (
        <Spinner />
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Brand</th>
                <th className="right">Price</th>
                <th className="right">Tax</th>
                <th>Warehouse</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="cell-media">
                      {p.product_images?.[0]?.image_url ? (
                        <img src={p.product_images[0].image_url} alt="" className="thumb" loading="lazy" />
                      ) : (
                        <span className="thumb thumb-empty" />
                      )}
                      <div>
                        <div className="cell-title">{p.product_name}</div>
                        <div className="muted-xs">
                          #{p.id}
                          {p.item_number ? ` · Item ${p.item_number}` : ''}
                          {p.hsn_code ? ` · HSN ${p.hsn_code}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {p.master_category?.title || '—'}
                    <div className="muted-xs">{p.master_sub_category?.title || ''}</div>
                  </td>
                  <td>{p.master_brands?.title || '—'}</td>
                  <td className="right">{money(p.inst_price)}</td>
                  <td className="right">{p.tax != null ? `${p.tax}%` : '—'}</td>
                  <td>{p.warehouse ? p.warehouse.replace(/_/g, '-') : '—'}</td>
                  <td>
                    <Badge tone={p.is_active === 1 ? 'green' : 'grey'}>
                      {p.is_active === 1 ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="right">
                    <Link to={`/admin/products/${p.id}`} className="link">
                      {can('Products', 'update') ? 'Edit' : 'View'}
                    </Link>
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty-row">
                    No products match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
        </div>
      )}
    </>
  )
}
