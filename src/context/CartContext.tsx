import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Product } from '../types/product'

export const maxCartQuantity = 99
export interface CartItem { product: Product; quantity: number; unavailableReason?: 'removed' }
interface CartContextValue { items: CartItem[]; count: number; total: number; isOpen: boolean; add: (product: Product, quantity?: number) => void; update: (id: string, quantity: number) => void; remove: (id: string) => void; removePurchased: (purchased: Array<{ productId: string; quantity: number }>) => void; reconcile: (products: Product[]) => void; setIsOpen: (open: boolean) => void }
const CartContext = createContext<CartContextValue | undefined>(undefined)
const key = 'mypetfood-cart'
const boundedQuantity = (quantity: number) => Math.min(maxCartQuantity, Math.max(1, Math.floor(Number.isFinite(quantity) ? quantity : 1)))

function readBasket(): CartItem[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    if (!Array.isArray(saved)) return []
    const items = new Map<string, CartItem>()
    for (const candidate of saved) {
      const item = candidate as CartItem | null
      if (!item?.product || typeof item.product.id !== 'string' || typeof item.product.name !== 'string' || typeof item.product.slug !== 'string' || !Number.isFinite(item.product.price) || item.product.price < 0) continue
      const previous = items.get(item.product.id)
      items.set(item.product.id, { product: item.product, quantity: boundedQuantity(boundedQuantity(Number(item.quantity)) + (previous?.quantity ?? 0)), ...(item.unavailableReason === 'removed' ? { unavailableReason: 'removed' as const } : {}) })
    }
    return [...items.values()]
  } catch { return [] }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readBasket)
  const [isOpen, setIsOpen] = useState(false)
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(items)) } catch { /* The basket remains usable if storage is unavailable. */ } }, [items])
  const add = useCallback((product: Product, quantity = 1) => {
    if (!product.available) return
    setItems(current => {
      const existing = current.find(item => item.product.id === product.id)
      return existing ? current.map(item => item.product.id === product.id ? { product, quantity: boundedQuantity(item.quantity + boundedQuantity(quantity)) } : item)
        : [...current, { product, quantity: boundedQuantity(quantity) }]
    })
    setIsOpen(true)
  }, [])
  const update = useCallback((id: string, quantity: number) => setItems(current => current.map(item => item.product.id === id ? { ...item, quantity: boundedQuantity(quantity) } : item)), [])
  const remove = useCallback((id: string) => setItems(current => current.filter(item => item.product.id !== id)), [])
  const removePurchased = useCallback((purchased: Array<{ productId: string; quantity: number }>) => setItems(current => current.flatMap(item => {
    const line = purchased.find(candidate => candidate.productId === item.product.id)
    if (!line) return [item]
    const remaining = item.quantity - line.quantity
    return remaining > 0 ? [{ ...item, quantity: remaining }] : []
  })), [])
  const reconcile = useCallback((products: Product[]) => setItems(current => {
    const next = current.map(item => {
      const product = products.find(candidate => candidate.id === item.product.id)
      return product ? { product, quantity: boundedQuantity(item.quantity) } : item.unavailableReason === 'removed' ? item : { ...item, unavailableReason: 'removed' as const }
    })
    return next.every((item, index) => item.product === current[index].product && item.quantity === current[index].quantity && item.unavailableReason === current[index].unavailableReason) ? current : next
  }), [])
  const value = useMemo(() => ({
    items, isOpen, setIsOpen,
    count: items.reduce((sum, item) => sum + item.quantity, 0), total: items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    add, update, remove, removePurchased, reconcile,
  }), [add, isOpen, items, reconcile, remove, removePurchased, update])
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
export const useCart = () => { const context = useContext(CartContext); if (!context) throw new Error('useCart must be used inside CartProvider'); return context }
