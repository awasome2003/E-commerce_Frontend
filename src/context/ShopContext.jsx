import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { shopApi, getShopToken, setShopToken } from '../lib/shop-api'

const ShopContext = createContext(null)

/** Customer session + cart, shared across the storefront. */
export function ShopProvider({ children }) {
  const [customer, setCustomer] = useState(null)
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)

  // The cart needs an account; an anonymous visitor simply has none. This must
  // not error — browsing is public.
  const refreshCart = useCallback(async () => {
    if (!getShopToken()) {
      setCart(null)
      return
    }
    try {
      setCart(await shopApi.getCart())
    } catch {
      setCart(null)
    }
  }, [])

  useEffect(() => {
    if (!getShopToken()) {
      setLoading(false)
      return
    }
    shopApi
      .me()
      .then((res) => {
        setCustomer(res.user)
        return refreshCart()
      })
      .catch(() => setShopToken(null))
      .finally(() => setLoading(false))
  }, [refreshCart])

  const login = useCallback(
    async (email, password) => {
      const res = await shopApi.login(email, password)
      setShopToken(res.token)
      setCustomer(res.user)
      await refreshCart()
      return res
    },
    [refreshCart],
  )

  // Registration signs the new vendor straight in — the server returns a token
  // with the account, so there is no second login step.
  const register = useCallback(async (details) => {
    const res = await shopApi.register(details)
    setShopToken(res.token)
    setCustomer(res.user)
    setCart({ items: [], cart_total: 0, tax_included: 0 })
    return res
  }, [])

  const logout = useCallback(() => {
    setShopToken(null)
    setCustomer(null)
    setCart(null)
  }, [])

  // Every mutation returns the whole re-priced cart, so state is replaced rather
  // than patched — a bulk break can change the price of a line the user did not
  // touch, and patching would show a stale number.
  const addToCart = useCallback(async (productId, quantity = 1) => {
    setCart(await shopApi.addToCart(productId, quantity))
  }, [])

  const updateQuantity = useCallback(async (id, quantity) => {
    setCart(await shopApi.updateCartItem(id, quantity))
  }, [])

  const removeItem = useCallback(async (id) => {
    setCart(await shopApi.removeCartItem(id))
  }, [])

  const itemCount = cart?.items?.reduce((n, i) => n + i.quantity, 0) ?? 0

  return (
    <ShopContext.Provider
      value={{
        customer, cart, itemCount, loading,
        login, register, logout, refreshCart, addToCart, updateQuantity, removeItem,
      }}
    >
      {children}
    </ShopContext.Provider>
  )
}

export function useShop() {
  const ctx = useContext(ShopContext)
  if (!ctx) throw new Error('useShop must be used inside <ShopProvider>')
  return ctx
}
