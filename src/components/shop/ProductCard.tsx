import { Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Product } from '../../types/product'
import { useCart } from '../../context/CartContext'

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart()
  return <article className="group relative flex flex-col overflow-hidden border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-card">
    <Link to={`/product/${product.slug}`} className="relative block aspect-square overflow-hidden bg-sand"><img src={product.image} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" onError={e => { e.currentTarget.style.display = 'none' }} />{product.badge && <span className="absolute left-3 top-3 bg-brand px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">{product.badge}</span>}</Link>
    <div className="flex flex-1 flex-col p-3 sm:p-4"><p className="text-xs font-semibold uppercase tracking-wide text-brand">{product.pet} · {product.category}</p><Link to={`/product/${product.slug}`} className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-5 hover:text-brand sm:text-base">{product.name}</Link><div className="mt-2 flex items-center gap-1 text-xs"><Star size={14} className="fill-accent text-accent" /><span className="font-semibold">{product.rating}</span><span className="text-gray-500">({product.reviewCount})</span></div><div className="mt-auto flex items-center justify-between gap-2 pt-3"><span className="text-base font-bold sm:text-lg">£{product.price.toFixed(2)}</span><button onClick={() => add(product)} className="btn-primary px-3 py-2 text-xs sm:px-4">Add</button></div></div>
  </article>
}
