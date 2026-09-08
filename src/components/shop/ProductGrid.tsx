import type { Product } from '../../types/product'
import { ProductCard } from './ProductCard'
export function ProductGrid({ products }: { products: Product[] }) { return products.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4"><>{products.map(product => <ProductCard product={product} key={product.id} />)}</></div> : <p className="col-span-full border border-dashed border-line p-10 text-center text-gray-600">We couldn't find any products matching that search.</p> }
