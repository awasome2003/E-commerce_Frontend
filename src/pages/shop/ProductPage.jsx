import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Check, RefreshCw, Package, Minus, Plus, Trash2, TrendingDown } from 'lucide-react'
import { shopApi } from '../../lib/shop-api'
import { useCart, useCartLine } from '../../context/CartContext'
import { money } from '../../lib/format'
import { Card, Spinner, ErrorBox, PriceTag, btnGhost } from '../../components/shop/ui'

export default function ProductPage() {
  const { id } = useParams()
  const { addToCart } = useCart()
  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState('')
  const [state, setState] = useState('idle') // idle | adding
  const line = useCartLine(product?.id)

  useEffect(() => {
    setProduct(null)
    shopApi.getProduct(id).then(setProduct).catch((err) => setError(err.message))
  }, [id])

  async function add() {
    setState('adding')
    setError('')
    try {
      await addToCart(product.id, quantity)
    } catch (err) {
      setError(err.message)
    } finally {
      setState('idle')
    }
  }

  if (error && !product) return <ErrorBox error={error} />
  if (!product) return <Spinner />

  // Once the item is in the cart, the quantity control mirrors and edits the
  // cart line directly; before that it's a local "how many to add" picker.
  const activeQty = line.inCart ? line.qty : quantity
  const applicable = [...(product.price_breaks ?? [])]
    .filter((b) => b.quantity <= activeQty)
    .sort((a, b) => b.quantity - a.quantity)[0]
  const computedEffective = applicable?.unit_price ?? product.unit_price
  const effective = line.inCart ? (line.item.unit_price ?? computedEffective) : computedEffective
  const lineTotal = line.inCart ? line.item.line_total : computedEffective * quantity
  const image =
    product.product_images?.find((i) => i.type === 'slider_image') || product.product_images?.[0]
  const perBox = Number(product.quantity_per_package) || 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-slate-400">
          <Link to="/" className="hover:text-amber-600">Products</Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-600">{product.master_category?.title || '—'}</span>
        </div>
        <Link to="/" className={btnGhost + ' !px-3.5 !py-2 text-sm'}>
          <ArrowLeft size={15} /> Back
        </Link>
      </div>

      <ErrorBox error={error} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
        {/* Media + description */}
        <Card className="lg:col-span-3 p-5 space-y-5">
          <div className="aspect-[16/10] bg-slate-50 rounded-xl overflow-hidden grid place-items-center">
            {image ? (
              <img src={image.image_url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-contain p-6" />
            ) : (
              <Package size={64} className="text-slate-200" />
            )}
          </div>
          {product.product_description && (
            <div>
              <h2 className="font-bold text-slate-800 mb-1.5">Description</h2>
              <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-line">{product.product_description}</p>
            </div>
          )}
        </Card>

        {/* Buy box */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6">
            <div className="text-xs uppercase tracking-widest font-semibold text-slate-400">
              {product.master_brands?.title || '—'}
            </div>
            <h1 className="text-xl font-bold text-slate-800 leading-snug mt-1">{product.product_name}</h1>

            {perBox > 1 && (
              <p className="text-sm text-slate-500 mt-3">
                Pack of <strong className="text-slate-700">{perBox}</strong>
                {product.moq ? <> · minimum order <strong className="text-amber-600">{product.moq}</strong></> : null}
              </p>
            )}

            <div className="border-t border-slate-100 my-5" />

            {product.purchasable ? (
              <>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-800">{money(effective)}</span>
                  <span className="text-sm text-slate-400 pb-1">/ piece</span>
                </div>
                {applicable && (
                  <div className="mt-2"><PriceTag source={applicable.source} /></div>
                )}

                <div className="flex items-center justify-between gap-3 mt-5">
                  <span className="text-sm font-medium text-slate-600">
                    {line.inCart ? 'In cart' : 'Quantity'}
                  </span>
                  <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-1">
                    <button
                      onClick={line.inCart ? line.dec : () => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={line.busy || (!line.inCart && quantity <= 1)}
                      title={line.inCart && line.qty <= 1 ? 'Remove from cart' : 'Decrease'}
                      className="w-9 h-9 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                    >
                      {line.inCart && line.qty <= 1 ? <Trash2 size={16} /> : <Minus size={16} />}
                    </button>
                    {line.inCart ? (
                      <span className="w-14 text-center font-semibold text-slate-800">{line.qty}</span>
                    ) : (
                      <input
                        type="number" min="1" value={quantity}
                        onChange={(e) => setQuantity(Math.max(Number(e.target.value) || 1, 1))}
                        className="w-14 text-center font-semibold text-slate-800 bg-transparent border-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    )}
                    <button
                      onClick={line.inCart ? line.inc : () => setQuantity((q) => q + 1)}
                      disabled={line.busy}
                      title="Increase"
                      className="w-9 h-9 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 py-3 px-4 rounded-xl bg-slate-50">
                  <span className="text-sm text-slate-500">Line total</span>
                  <strong className="text-lg text-slate-800">{money(lineTotal)}</strong>
                </div>

                {line.inCart ? (
                  <div className="mt-4 rounded-xl bg-emerald-50 text-emerald-700 px-4 py-3 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Check size={16} className="stroke-[3]" /> {line.qty} in your cart
                    </span>
                    <Link to="/cart" className="text-sm font-semibold text-amber-600 hover:text-amber-700">View cart →</Link>
                  </div>
                ) : (
                  <button
                    onClick={add}
                    disabled={state === 'adding'}
                    className={`mt-4 w-full py-3.5 font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                      state === 'adding' ? 'bg-amber-600 text-white cursor-wait' : 'bg-amber-500 hover:bg-amber-600 text-white'
                    }`}
                  >
                    {state === 'adding' ? <><RefreshCw size={16} className="animate-spin" /> Adding…</>
                      : <><ShoppingCart size={18} /> Add to cart</>}
                  </button>
                )}
              </>
            ) : (
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-500">
                This product has no price set. <Link to="/requests" className="text-amber-600 font-semibold">Request a quote</Link> — it cannot be ordered online yet.
              </div>
            )}
          </Card>

          {product.price_breaks?.length > 1 && (
            <Card className="p-5">
              <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm mb-3">
                <TrendingDown size={16} className="text-amber-500" /> Buy more, pay less
              </h2>
              <div className="space-y-1">
                {product.price_breaks.map((b) => {
                  const active = applicable?.quantity === b.quantity
                  return (
                    <div key={b.quantity} className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg ${active ? 'bg-amber-50' : ''}`}>
                      <span className={active ? 'font-semibold text-amber-700' : 'text-slate-600'}>{b.quantity}+ pieces</span>
                      <span className="flex items-center gap-2">
                        <strong className={active ? 'text-amber-700' : 'text-slate-800'}>{money(b.unit_price)}</strong>
                        {active && <Check size={14} className="text-amber-600 stroke-[3]" />}
                      </span>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
