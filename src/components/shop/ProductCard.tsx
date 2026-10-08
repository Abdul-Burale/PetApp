import { Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Product } from '../../types/product'
import { ProductImage } from './ProductImage'

export function ProductCard({ product }: { product: Product }) {
  return <article className="group relative flex flex-col overflow-hidden border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-card">
    <Link to={`/product/${product.slug}`} aria-label={`Open product: ${product.name}`} className="flex flex-1 cursor-pointer flex-col focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand">
      <div className="relative aspect-square overflow-hidden bg-sand">
        <ProductImage src={product.image} alt={product.name} className="h-full w-full object-contain p-3 transition duration-500 group-hover:scale-105" />
        {product.badge && <span className="absolute left-3 top-3 bg-brand px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">{product.badge}</span>}
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">{product.pet} · {product.category}</p>
        <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-5 group-hover:text-brand sm:text-base">{product.name}</h3>
        {product.rating !== null && product.reviewCount > 0 && <div className="mt-2 flex items-center gap-1 text-xs"><Star size={14} className="fill-accent text-accent" aria-hidden="true" /><span className="font-semibold">{product.rating.toFixed(1)}</span><span className="text-gray-500">({product.reviewCount})</span></div>}
        {!product.available && <p className="mt-2 text-xs text-gray-500">Currently unavailable</p>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <span className="text-base font-bold sm:text-lg">£{product.price.toFixed(2)}</span>
        </div>
      </div>
    </Link>
  </article>
}
