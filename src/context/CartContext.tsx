import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Product } from '../types/product'

export interface CartItem { product: Product; quantity: number }
interface CartContextValue { items: CartItem[]; count: number; total: number; isOpen: boolean; add: (product: Product, quantity?: number) => void; update: (id: string, quantity: number) => void; remove: (id: string) => void; setIsOpen: (open: boolean) => void }
const CartContext = createContext<CartContextValue | undefined>(undefined)
const key = 'happy-paws-cart'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => { try { return JSON.parse(localStorage.getItem(key) ?? '[]') as CartItem[] } catch { return [] } })
  const [isOpen, setIsOpen] = useState(false)
  useEffect(() => { localStorage.setItem(key, JSON.stringify(items)) }, [items])
  const value = useMemo(() => ({
    items, isOpen, setIsOpen,
    count: items.reduce((sum, item) => sum + item.quantity, 0), total: items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    add: (product: Product, quantity = 1) => { setItems(current => { const existing = current.find(item => item.product.id === product.id); return existing ? current.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item) : [...current, { product, quantity }] }); setIsOpen(true) },
    update: (id: string, quantity: number) => setItems(current => quantity < 1 ? current.filter(item => item.product.id !== id) : current.map(item => item.product.id === id ? { ...item, quantity } : item)),
    remove: (id: string) => setItems(current => current.filter(item => item.product.id !== id))
  }), [items, isOpen])
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
export const useCart = () => { const context = useContext(CartContext); if (!context) throw new Error('useCart must be used inside CartProvider'); return context }
