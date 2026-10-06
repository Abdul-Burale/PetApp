import { ShoppingBag, X } from 'lucide-react'
import { useId } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useCatalog } from '../../context/CatalogContext'
import { OverlayDialog } from '../layout/OverlayDialog'
import { BasketItem } from './BasketItem'

export function CartDrawer() {
  const { items, total, isOpen, setIsOpen } = useCart()
  const { loading, error } = useCatalog()
  const id = useId(), unavailable = items.some(item => !item.product.available || item.unavailableReason)
  const blocked = !items.length || unavailable || loading || Boolean(error)
  return <OverlayDialog open={isOpen} onClose={() => setIsOpen(false)} labelledBy={id}>
    <div className="flex items-center justify-between border-b border-line p-5"><h2 id={id} className="flex items-center gap-2 text-lg font-bold"><ShoppingBag size={20} />Your basket</h2><button onClick={() => setIsOpen(false)} aria-label="Close basket" className="rounded p-2 hover:bg-sand"><X /></button></div>
    <div className="min-h-0 flex-1 overflow-y-auto p-5">{items.length ? <div className="divide-y divide-line">{items.map(item => <BasketItem key={item.product.id} item={item} onNavigate={() => setIsOpen(false)} />)}</div> : <div className="py-12 text-center"><p className="text-gray-600">Your basket is empty.</p><Link to="/shop" onClick={() => setIsOpen(false)} className="btn-secondary mt-5">Browse products</Link></div>}</div>
    <div className="border-t border-line p-5"><div className="flex justify-between text-lg font-bold"><span>Subtotal</span><span>£{total.toFixed(2)}</span></div><p className="mt-3 text-sm leading-6 text-gray-600">Check delivery options and an estimated total in your basket.</p>
      {unavailable && <p role="alert" className="mt-3 text-sm text-red-800">Remove unavailable items before continuing.</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-800">Product availability could not be checked. Please open your basket and try again.</p>}
      {blocked ? <button disabled className="btn-primary mt-4 w-full opacity-50">{loading ? 'Checking availability…' : 'Checkout'}</button> : <Link to="/checkout" onClick={() => setIsOpen(false)} className="btn-primary mt-4 w-full">Checkout</Link>}
      <Link to="/basket" onClick={() => setIsOpen(false)} className="mt-3 block py-2 text-center text-sm font-bold text-brand underline">View basket</Link>
    </div>
  </OverlayDialog>
}
