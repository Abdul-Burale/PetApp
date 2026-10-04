import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Product } from '../types/product'

export interface CartItem { product: Product; quantity: number }
interface CartContextValue { items: CartItem[]; count: number; total: number; isOpen: boolean; add: (product: Product, quantity?: number) => void; update: (id: string, quantity: number) => void; remove: (id: string) => void; reconcile: (products: Product[]) => void; setIsOpen: (open: boolean) => void }
const CartContext = createContext<CartContextValue | undefined>(undefined)
const key = 'mypetfood-cart'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => { try { return JSON.parse(localStorage.getItem(key) ?? '[]') as CartItem[] } catch { return [] } })
  const [isOpen, setIsOpen] = useState(false)
  useEffect(() => { localStorage.setItem(key, JSON.stringify(items)) }, [items])
  const add = useCallback((product: Product, quantity = 1) => { setItems(current => { const existing = current.find(item => item.product.id === product.id); return existing ? current.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item) : [...current, { product, quantity }] }); setIsOpen(true) }, [])
  const update = useCallback((id: string, quantity: number) => setItems(current => quantity < 1 ? current.filter(item => item.product.id !== id) : current.map(item => item.product.id === id ? { ...item, quantity } : item)), [])
  const remove = useCallback((id: string) => setItems(current => current.filter(item => item.product.id !== id)), [])
  const reconcile = useCallback((products: Product[]) => setItems(current => {
    const next = current.flatMap(item => { const product = products.find(candidate => candidate.id === item.product.id); return product ? [{ ...item, product }] : [] })
    return next.length === current.length && next.every((item, index) => item.product === current[index].product && item.quantity === current[index].quantity) ? current : next
  }), [])
  const value = useMemo(() => ({
    items, isOpen, setIsOpen,
    count: items.reduce((sum, item) => sum + item.quantity, 0), total: items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    add, update, remove, reconcile,
  }), [add, isOpen, items, reconcile, remove, update])
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
export const useCart = () => { const context = useContext(CartContext); if (!context) throw new Error('useCart must be used inside CartProvider'); return context }
