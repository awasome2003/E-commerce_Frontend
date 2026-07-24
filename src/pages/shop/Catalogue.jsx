import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, SlidersHorizontal, LayoutGrid, List, ShoppingCart, RefreshCw,
  Eye, ChevronDown, Filter, Info, Package, Trash2,
} from 'lucide-react'
import { shopApi } from '../../lib/shop-api'
import { useCart, useCartLine } from '../../context/CartContext'
import { money } from '../../lib/format'

/**
 * Storefront catalogue — reference "B2B food portal" design, on real data.
 *
 * Prices come from the server per customer (never computed here). Filters are
 * limited to what the API actually supports (category, brand, search) — no fake
 * rating / stock / discount controls the data can't back.
 */
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
  const [brandId, setBrandId] = useState('')
  const [page, setPage] = useState(1)
  const [gridView, setGridView] = useState(true)
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  useEffect(() => {
    shopApi.filters().then(setFilters).catch(() => {})
  }, [])

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 350)
    return () => clearTimeout(id)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debounced, categoryId, brandId])

  useEffect(() => {
    let cancelled = false
    setError('')
    setData(null)
    shopApi
      .listProducts({ search: debounced, category_id: categoryId, brand_id: brandId, page, limit: 24 })
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [debounced, categoryId, brandId, page])

  const activeCategory = useMemo(
    () => filters.categories.find((c) => String(c.id) === String(categoryId))?.title || 'All Products',
    [filters.categories, categoryId],
  )

  function clearAll() {
    setCategoryId('')
    setBrandId('')
    setSearch('')
  }

  const FilterPanel = (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">Categories</span>
          <ChevronDown size={16} className="text-slate-400" />
        </div>
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          <button
            onClick={() => setCategoryId('')}
            className={`w-full text-left text-sm px-3 py-2 rounded-xl transition-all ${
              categoryId === '' ? 'bg-amber-50 text-amber-600 font-semibold' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Categories
          </button>
          {filters.categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryId(String(c.id))}
              className={`w-full text-left text-sm px-3 py-2 rounded-xl transition-all truncate ${
                String(categoryId) === String(c.id)
                  ? 'bg-amber-50 text-amber-600 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-5 border-t border-slate-100">
        <span className="text-sm font-semibold text-slate-700">Brand</span>
        <div className="relative">
          <select
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className="w-full appearance-none bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2.5 text-sm cursor-pointer"
          >
            <option value="">All Brands</option>
            {filters.brands.map((b) => (
              <option key={b.id} value={b.id}>{b.title}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-500 leading-relaxed">
        Your account&apos;s negotiated and bulk prices are applied automatically as you browse.
      </div>

      <button
        onClick={clearAll}
        className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors shadow-sm"
      >
        Clear filters
      </button>
    </div>
  )

  return (
    <div className="sf space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Product Catalog</h2>
          <p className="text-sm text-slate-400 mt-0.5">Browse and order from all listed wholesale products.</p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search product…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white text-sm text-slate-700 rounded-full border border-slate-200 shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Sidebar */}
        <div className="hidden lg:block bg-white rounded-2xl border border-slate-100 p-5 shadow-sm h-fit sticky top-19">
          <div className="flex items-center justify-between pb-4 mb-1">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
              <SlidersHorizontal size={16} className="text-amber-500" />
              Filters
            </h3>
            <button onClick={clearAll} className="text-xs font-semibold text-amber-600 hover:text-amber-700">Clear All</button>
          </div>
          {FilterPanel}
        </div>

        {/* Main */}
        <div className="lg:col-span-3 space-y-4">
          {/* Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-500">
              <span className="text-slate-400">Categories / </span>
              <span className="font-semibold text-slate-700">{activeCategory}</span>
              <span className="block text-xs text-slate-400 mt-0.5">
                Showing <strong className="text-slate-700">{data ? data.total : '…'}</strong> items
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowMobileFilters((v) => !v)}
                className="lg:hidden inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-50"
              >
                <Filter size={15} /> Filter
              </button>
              <div className="hidden sm:flex items-center border border-slate-200 rounded-xl p-1">
                <button
                  onClick={() => setGridView(true)}
                  className={`p-1.5 rounded-lg transition-all ${gridView ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Grid view"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setGridView(false)}
                  className={`p-1.5 rounded-lg transition-all ${!gridView ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Table view"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {showMobileFilters && (
            <div className="lg:hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-5">{FilterPanel}</div>
          )}

          {error && (
            <div className="rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-3">{error}</div>
          )}

          {!data ? (
            <SkeletonGrid />
          ) : data.items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center space-y-3">
              <Info size={40} className="mx-auto text-slate-300" />
              <h4 className="font-semibold text-slate-800">No products found</h4>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">Try a different search term or clear the filters.</p>
              <button onClick={clearAll} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl">
                Clear filters
              </button>
            </div>
          ) : gridView ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {data.items.map((p) => <ProductCard key={p.id} p={p} onAdd={addToCart} />)}
            </div>
          ) : (
            <ProductTable items={data.items} onAdd={addToCart} />
          )}

          {data && data.pages > 1 && (
            <Pager page={data.page} pages={data.pages} onChange={setPage} />
          )}
        </div>
      </div>
    </div>
  )
}

function priceTag(source) {
  if (!SOURCE_NOTE[source]) return null
  const mine = source.startsWith('user')
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${mine ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'}`}>
      {SOURCE_NOTE[source]}
    </span>
  )
}

function ProductCard({ p, onAdd }) {
  const [qty, setQty] = useState(1)
  const [state, setState] = useState('idle') // idle | adding
  const line = useCartLine(p.id)
  const img = p.product_images?.[0]?.image_url
  const perBox = Number(p.quantity_per_package) || 0

  async function add() {
    if (!p.purchasable) return
    setState('adding')
    try {
      await onAdd(p.id, qty)
    } finally {
      setState('idle')
    }
  }

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 hover:border-amber-300 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden">
      <Link to={`/products/${p.id}`} className="relative aspect-[16/10] bg-slate-50 overflow-hidden block">
        {img ? (
          <img src={img} alt="" loading="lazy" referrerPolicy="no-referrer"
            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full grid place-items-center text-slate-300"><Package size={40} /></div>
        )}
        <span className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 grid place-items-center rounded-full bg-white border border-slate-100 shadow-sm text-slate-500 hover:text-amber-500">
          <Eye size={14} />
        </span>
      </Link>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center justify-between text-xs">
          <span className="uppercase tracking-widest font-semibold text-slate-400 truncate">
            {p.master_brands?.title || p.master_category?.title || '—'}
          </span>
          {p.item_number && <span className="text-slate-400 shrink-0">#{p.item_number}</span>}
        </div>

        <Link to={`/products/${p.id}`} className="mt-2 font-bold text-slate-800 text-base leading-snug hover:text-amber-600 transition-colors line-clamp-2 min-h-[2.75rem]" title={p.product_name}>
          {p.product_name}
        </Link>

        <div className="grid grid-cols-2 gap-y-1 gap-x-4 mt-3 text-sm min-h-5">
          {perBox > 1 && <span className="text-slate-500">Pack: <strong className="text-slate-800">{perBox}/box</strong></span>}
          {p.moq && <span className="text-slate-500">MOQ: <strong className="text-amber-600">{p.moq}</strong></span>}
        </div>

        {/* Pinned to the card's bottom so every Add button lines up across the
            row regardless of how many lines the name above wrapped to. */}
        <div className="mt-auto pt-4 border-t border-slate-100">
          {p.purchasable ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-800">{money(p.unit_price)}</span>
                    <span className="text-xs text-slate-400">/ pc</span>
                  </div>
                  <div className="mt-1">{priceTag(p.price_source)}</div>
                </div>
                {/* Local "how many to add" picker — only until it's in the cart,
                    after which the amber control below edits the cart directly. */}
                {!line.inCart && (
                  <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-1 shrink-0">
                    <button onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}
                      className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 font-bold">−</button>
                    <span className="w-8 text-center font-semibold text-slate-800">{qty}</span>
                    <button onClick={() => setQty((q) => q + 1)}
                      className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 font-bold">+</button>
                  </div>
                )}
              </div>

              {line.inCart ? (
                <div className="mt-4 flex items-center justify-between rounded-xl bg-amber-500 text-white p-1 select-none">
                  <button onClick={line.dec} disabled={line.busy} title={line.qty <= 1 ? 'Remove from cart' : 'Decrease'}
                    className="w-11 h-9 grid place-items-center rounded-lg hover:bg-white/20 disabled:opacity-50 transition-colors">
                    {line.qty <= 1 ? <Trash2 size={16} /> : <span className="text-xl font-bold leading-none">−</span>}
                  </button>
                  <span className="text-sm font-bold">{line.qty} in cart</span>
                  <button onClick={line.inc} disabled={line.busy} title="Increase"
                    className="w-11 h-9 grid place-items-center rounded-lg hover:bg-white/20 disabled:opacity-50 transition-colors">
                    <span className="text-xl font-bold leading-none">+</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={add}
                  disabled={state === 'adding'}
                  className={`mt-4 w-full py-3 font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                    state === 'adding' ? 'bg-amber-600 text-white cursor-wait' : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
                >
                  {state === 'adding' ? <><RefreshCw size={15} className="animate-spin" /> Adding…</>
                    : <><ShoppingCart size={16} /> Add · {money(p.unit_price * qty)}</>}
                </button>
              )}
            </>
          ) : (
            <div className="text-sm text-slate-500 font-medium">Price on request</div>
          )}
        </div>
      </div>
    </div>
  )
}

function ProductTable({ items, onAdd }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[11px] font-semibold uppercase tracking-wide">
              <th className="p-4">Product</th>
              <th className="p-4 hidden md:table-cell">Brand</th>
              <th className="p-4 text-center">MOQ</th>
              <th className="p-4 text-right">Price</th>
              <th className="p-4 text-center">Order</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {items.map((p) => <TableRow key={p.id} p={p} onAdd={onAdd} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TableRow({ p, onAdd }) {
  const [state, setState] = useState('idle')
  const line = useCartLine(p.id)
  const img = p.product_images?.[0]?.image_url
  async function add() {
    if (!p.purchasable) return
    setState('adding')
    try { await onAdd(p.id, 1) } finally { setState('idle') }
  }
  return (
    <tr className="hover:bg-slate-50/60 transition-colors">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 shrink-0 grid place-items-center">
            {img ? <img src={img} alt="" referrerPolicy="no-referrer" className="w-full h-full object-contain p-1" /> : <Package size={18} className="text-slate-300" />}
          </div>
          <Link to={`/products/${p.id}`} className="font-semibold text-slate-800 hover:text-amber-600 line-clamp-1 max-w-[220px]" title={p.product_name}>
            {p.product_name}
          </Link>
        </div>
      </td>
      <td className="p-4 hidden md:table-cell text-slate-500 text-xs">{p.master_brands?.title || '—'}</td>
      <td className="p-4 text-center">
        {p.moq ? <span className="inline-block bg-amber-50 text-amber-700 font-semibold text-xs px-2.5 py-1 rounded-lg">{p.moq}</span> : '—'}
      </td>
      <td className="p-4 text-right">
        {p.purchasable ? <span className="font-bold text-slate-800">{money(p.unit_price)}</span> : <span className="text-xs text-slate-400">On request</span>}
      </td>
      <td className="p-4">
        <div className="flex justify-center">
          {line.inCart ? (
            <div className="flex items-center gap-0.5 bg-amber-500 text-white rounded-lg p-0.5 select-none">
              <button onClick={line.dec} disabled={line.busy}
                className="w-7 h-7 grid place-items-center rounded-md hover:bg-white/20 disabled:opacity-50">
                {line.qty <= 1 ? <Trash2 size={12} /> : <span className="text-base font-bold leading-none">−</span>}
              </button>
              <span className="w-7 text-center text-xs font-bold">{line.qty}</span>
              <button onClick={line.inc} disabled={line.busy}
                className="w-7 h-7 grid place-items-center rounded-md hover:bg-white/20 disabled:opacity-50">
                <span className="text-base font-bold leading-none">+</span>
              </button>
            </div>
          ) : (
            <button onClick={add} disabled={!p.purchasable || state === 'adding'}
              className="h-8 px-3 font-semibold text-xs rounded-lg flex items-center gap-1 transition-all bg-amber-500 hover:bg-amber-600 text-white disabled:bg-slate-100 disabled:text-slate-400">
              {state === 'adding' ? <RefreshCw size={11} className="animate-spin" /> : <><ShoppingCart size={11} /> Add</>}
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden animate-pulse">
          <div className="aspect-[16/10] bg-slate-100" />
          <div className="p-5 space-y-3">
            <div className="h-3 bg-slate-100 rounded w-1/3" />
            <div className="h-4 bg-slate-100 rounded w-3/4" />
            <div className="h-8 bg-slate-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

function Pager({ page, pages, onChange }) {
  return (
    <div className="flex items-center justify-center gap-1 pt-2">
      <button onClick={() => onChange(page - 1)} disabled={page <= 1}
        className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-white disabled:opacity-40">Prev</button>
      <span className="px-4 text-sm text-slate-500">Page <strong className="text-slate-800">{page}</strong> of {pages}</span>
      <button onClick={() => onChange(page + 1)} disabled={page >= pages}
        className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-white disabled:opacity-40">Next</button>
    </div>
  )
}
