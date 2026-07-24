import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { shopApi } from '../lib/shop-api'
import { useSession } from './SessionContext'

const CartContext = createContext(null)

/**
 * The customer's cart.
 *
 * Authentication lives in [SessionContext]; this only holds shopping state, and
 * only does anything for a session that may use the storefront.
 *
 * Every mutation returns the whole re-priced cart, so state is replaced rather
 * than patched — crossing a bulk break changes the price of a line the user did
 * not touch, and patching would show a stale number.
 */
export function CartProvider({ children }) {
  const { areas, user } = useSession()
  const [cart, setCart] = useState(null)

  const refreshCart = useCallback(async () => {
    if (!areas.shop) {
      setCart(null)
      return
    }
    try {
      setCart(await shopApi.getCart())
    } catch {
      setCart(null)
    }
  }, [areas.shop])

  // Reload whenever the signed-in shopper changes (login, logout, switch).
  useEffect(() => {
    refreshCart()
  }, [refreshCart, user?.id])

  const addToCart = useCallback(async (productId, quantity = 1) => {
    setCart(await shopApi.addToCart(productId, quantity))
  }, [])

  const updateQuantity = useCallback(async (id, quantity) => {
    setCart(await shopApi.updateCartItem(id, quantity))
  }, [])

  const removeItem = useCallback(async (id) => {
    setCart(await shopApi.removeCartItem(id))
  }, [])

  // Two different counts: `productCount` is how many distinct products are in
  // the cart (what the header badge shows — "1 product" not "3 pieces"), while
  // `itemCount` is the total quantity across them.
  const productCount = cart?.items?.length ?? 0
  const itemCount = cart?.items?.reduce((n, i) => n + i.quantity, 0) ?? 0

  return (
    <CartContext.Provider
      value={{ cart, productCount, itemCount, refreshCart, addToCart, updateQuantity, removeItem }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}

/**
 * A single product's line in the cart, for cart-aware product controls (the
 * catalogue card, table row, and detail page). Returns the live quantity already
 * in the cart plus +/- actions that edit it directly. `busy` guards against the
 * races that rapid clicks would otherwise cause, since each mutation re-prices
 * and replaces the whole cart.
 */
export function useCartLine(productId) {
  const { cart, updateQuantity, removeItem } = useCart()
  const [busy, setBusy] = useState(false)
  const item = cart?.items?.find((i) => i.product?.id === productId) ?? null

  const inc = useCallback(async () => {
    if (!item) return
    setBusy(true)
    try {
      await updateQuantity(item.id, item.quantity + 1)
    } finally {
      setBusy(false)
    }
  }, [item, updateQuantity])

  const dec = useCallback(async () => {
    if (!item) return
    setBusy(true)
    try {
      if (item.quantity <= 1) await removeItem(item.id)
      else await updateQuantity(item.id, item.quantity - 1)
    } finally {
      setBusy(false)
    }
  }, [item, updateQuantity, removeItem])

  return { item, qty: item?.quantity ?? 0, inCart: !!item, busy, inc, dec }
}
