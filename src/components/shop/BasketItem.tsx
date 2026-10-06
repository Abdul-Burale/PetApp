import { Minus, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { maxCartQuantity, useCart, type CartItem } from '../../context/CartContext'
import { ProductImage } from './ProductImage'

export function BasketItem({ item, onNavigate }: { item: CartItem; onNavigate?: () => void }) {
  const { update, remove } = useCart()
  const { product, quantity } = item
  const unavailable = !product.available || Boolean(item.unavailableReason)
  return <article className="flex gap-3 py-4">
    <ProductImage src={product.image} alt={product.name} className="h-20 w-20 shrink-0 rounded bg-sand object-contain" />
    <div className="min-w-0 flex-1">
      {item.unavailableReason === 'removed' ? <h3 className="break-words font-bold leading-tight">{product.name}</h3> : <Link to={`/product/${product.slug}`} onClick={onNavigate} className="break-words font-bold leading-tight hover:text-brand">{product.name}</Link>}
      <p className="mt-1 text-sm">£{product.price.toFixed(2)}</p>
      {unavailable && <p className="mt-2 text-sm font-semibold text-red-800">{item.unavailableReason === 'removed' ? 'No longer available in the shop. Remove this item to continue.' : 'Currently unavailable. Remove this item to continue.'}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center rounded border border-line"><button aria-label={`Decrease quantity of ${product.name}`} disabled={quantity <= 1 || unavailable} onClick={() => update(product.id, quantity - 1)} className="p-2 disabled:opacity-30"><Minus size={15} /></button><span aria-label={`Quantity of ${product.name}`} className="min-w-8 text-center text-sm font-bold">{quantity}</span><button aria-label={`Increase quantity of ${product.name}`} disabled={quantity >= maxCartQuantity || unavailable} onClick={() => update(product.id, quantity + 1)} className="p-2 disabled:opacity-30"><Plus size={15} /></button></div>
        <button aria-label={`Remove ${product.name}`} onClick={() => remove(product.id)} className="inline-flex items-center gap-1 py-2 text-sm text-gray-600 underline"><Trash2 size={15} />Remove</button>
      </div>
      {quantity === maxCartQuantity && <p className="mt-2 text-xs text-gray-500">Maximum {maxCartQuantity} per product.</p>}
    </div>
  </article>
}
