import { Minus, Plus, Star, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ProductGrid } from '../components/shop/ProductGrid'
import { CatalogPagination, readCatalogNumber } from '../components/shop/CatalogPagination'
import { ProductImage } from '../components/shop/ProductImage'
import { SearchForm } from '../components/shop/SearchForm'
import { useCatalog } from '../context/CatalogContext'
import { useCart, maxCartQuantity } from '../context/CartContext'
import { useApiProduct } from '../hooks/useApiProduct'
import { catalogFilters, categories, filterCatalog, pets } from '../lib/catalog'
import type { Pet } from '../types/product'

function CatalogListing({ fixedPet }: { fixedPet?: Pet }) {
  const [params, setParams] = useSearchParams()
  const { products, loading, error, refresh } = useCatalog()
  const filters = catalogFilters(params, fixedPet)
  const list = filterCatalog(products, filters)
  const pageSize = readCatalogNumber(params.get('pageSize'), 12, [12, 24, 48])
  const pageCount = Math.max(1, Math.ceil(list.length / pageSize))
  const page = Math.min(readCatalogNumber(params.get('page'), 1), pageCount)
  const visibleProducts = list.slice((page - 1) * pageSize, page * pageSize)
  function goToProductsPage(nextPage: number) {
    setParams(current => { const next = new URLSearchParams(current); next.set('page', String(nextPage)); return next })
    document.getElementById('catalog-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  function updatePageSize(size: number) {
    setParams(current => { const next = new URLSearchParams(current); next.delete('page'); if (size === 12) next.delete('pageSize'); else next.set('pageSize', String(size)); return next })
  }
  function change(key: string, values: string[]) {
    setParams(current => {
      const next = new URLSearchParams(current)
      next.delete(key); values.forEach(value => next.append(key, value))
      next.delete('page')
      if (key === 'q' && next.get('sort') === 'relevance') next.delete('sort')
      return next
    })
  }
  const title = fixedPet ? `${fixedPet} products` : filters.query ? `Results for “${filters.query}”` : filters.offers ? 'Offers' : filters.pet ? `${filters.pet} products` : 'Shop pet supplies'
  const chips = [
    ...(filters.query ? [{ label: `Search: ${filters.query}`, remove: () => change('q', []) }] : []),
    ...filters.categories.map(category => ({ label: category, remove: () => change('category', filters.categories.filter(value => value !== category)) })),
    ...(!fixedPet && filters.pet ? [{ label: filters.pet, remove: () => change('pet', []) }] : []),
    ...(filters.offers ? [{ label: 'Offers', remove: () => change('offer', []) }] : []),
    ...(filters.availableOnly ? [{ label: 'Available now', remove: () => change('available', []) }] : []),
  ]
  return <main className="container-page py-8 sm:py-10">
    <nav aria-label="Breadcrumb" className="text-sm text-gray-500"><Link to="/">Home</Link> / {fixedPet ?? 'Shop'}</nav>
    <header className="mt-5 rounded-xl bg-sand p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-widest text-accent">{fixedPet ? `Shop for ${fixedPet.toLowerCase()}` : 'Find their everyday essentials'}</p><h1 className="mt-2 break-words text-3xl font-bold">{title}</h1><p className="mt-3 max-w-2xl text-gray-600">Browse food, treats, toys and care. Choose a category or search for what you need.</p></header>
    <section aria-label="Product filters" className="mt-7 space-y-4 rounded-xl border border-line bg-white p-4 sm:p-5">
      <div className="grid items-start gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
        <SearchForm label="Search this collection" initialQuery={filters.query} onSearch={query => change('q', query ? [query] : [])} />
        <label className="text-xs font-semibold">Sort products<select value={filters.sort} onChange={event => change('sort', [event.target.value])} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal"><option value="relevance">Relevance</option><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label>
      </div>
      <div className="flex flex-wrap items-start gap-4">
        <details className="min-w-44 rounded-lg border border-line"><summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold">Categories{filters.categories.length ? ` (${filters.categories.length})` : ''}</summary><fieldset className="space-y-2 border-t border-line p-4"><legend className="sr-only">Filter by category</legend>{categories.map(category => <label key={category} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={filters.categories.includes(category)} onChange={event => change('category', event.target.checked ? [...filters.categories, category] : filters.categories.filter(value => value !== category))} />{category}</label>)}</fieldset></details>
        {!fixedPet && <label className="flex items-center gap-2 text-sm font-semibold">Pet<select value={filters.pet ?? ''} onChange={event => change('pet', event.target.value ? [event.target.value] : [])} className="rounded-lg border border-line bg-white px-3 py-2.5 font-normal"><option value="">All pets</option>{pets.map(pet => <option key={pet}>{pet}</option>)}</select></label>}
        <label className="flex items-center gap-2 py-2.5 text-sm"><input type="checkbox" checked={filters.availableOnly} onChange={event => change('available', event.target.checked ? ['true'] : [])} />Available now</label>
        <label className="flex items-center gap-2 py-2.5 text-sm"><input type="checkbox" checked={filters.offers} onChange={event => change('offer', event.target.checked ? ['true'] : [])} />Offers only</label>
      </div>
      {chips.length > 0 && <div aria-label="Active filters" className="flex flex-wrap items-center gap-2 border-t border-line pt-4">{chips.map(chip => <button key={chip.label} type="button" onClick={chip.remove} aria-label={chip.label.startsWith('Search:') ? 'Clear search' : `Remove ${chip.label} filter`} className="inline-flex max-w-full items-center gap-2 rounded-full bg-sand px-3 py-2 text-sm text-brand"><span className="min-w-0 break-words">{chip.label}</span><X size={14} className="shrink-0" /></button>)}<button type="button" onClick={() => setParams(new URLSearchParams())} className="px-2 py-2 text-sm font-semibold text-brand underline">Clear all</button></div>}
    </section>
    <section id="catalog-products" aria-label="Products" className="scroll-mt-6">
      {loading && <p role="status" className="my-5 text-sm text-gray-600">Loading products…</p>}
      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6"><p>{error}</p><button onClick={() => void refresh()} className="btn-secondary mt-4">Retry loading products</button></div> : loading ? <div aria-hidden="true" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="aspect-square animate-pulse rounded-lg bg-sand" />)}</div> : list.length ? <ProductGrid products={visibleProducts} /> : <section className="rounded-xl border border-dashed border-line bg-sand/40 p-8 text-center"><h2 className="text-xl font-bold">No products match{filters.query ? ` “${filters.query}”` : ' these filters'}</h2><p className="mt-3 text-sm text-gray-600">Try fewer words, remove a filter, or browse by pet.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><button onClick={() => setParams(new URLSearchParams())} className="btn-secondary">Clear search and filters</button>{pets.map(pet => <Link key={pet} to={`/category/${pet.toLowerCase()}`} className="btn-secondary">Shop {pet.toLowerCase()}</Link>)}</div></section>}
      {!loading && !error && <CatalogPagination total={list.length} page={page} pageSize={pageSize} onPageChange={goToProductsPage} onPageSizeChange={updatePageSize} />}
    </section>
  </main>
}

export function ShopPage() { return <CatalogListing /> }
export function CategoryPage() {
  const { category } = useParams()
  const pet = pets.find(value => value.toLowerCase() === category?.toLowerCase())
  return pet ? <CatalogListing fixedPet={pet} /> : <main className="container-page py-16"><h1 className="section-title">Category not found</h1><Link to="/shop" className="btn-secondary mt-5">Browse all products</Link></main>
}

export function ProductPage() {
  const { slug = '' } = useParams()
  const { product, loading, error } = useApiProduct(slug)
  const { add } = useCart()
  const [quantity, setQuantity] = useState(1), [imageIndex, setImageIndex] = useState(0)
  useEffect(() => { setQuantity(1); setImageIndex(0) }, [slug])
  if (loading) return <main className="container-page py-20"><p role="status">Loading product…</p></main>
  if (!product) return <main className="container-page py-20"><h1 className="section-title">{error ? 'Product could not be loaded' : 'Product not found'}</h1>{error && <p role="alert" className="mt-3 text-gray-600">{error}</p>}<Link className="btn-secondary mt-5" to="/shop">Back to shop</Link></main>
  const images = product.images.length ? product.images : [{ url: product.image, altText: product.name, position: 0 }]
  const selectedImage = images[imageIndex] ?? images[0]
  return <main className="container-page py-8 sm:py-12">
    <nav aria-label="Breadcrumb" className="text-sm text-gray-500"><Link to="/">Home</Link> / <Link to={`/category/${product.pet.toLowerCase()}`}>{product.pet}</Link> / {product.name}</nav>
    <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-14"><section aria-label="Product images"><div className="aspect-square rounded-xl bg-sand p-4"><ProductImage src={selectedImage.url} alt={selectedImage.altText || product.name} className="h-full w-full object-contain" /></div>{images.length > 1 && <div className="mt-4 flex flex-wrap gap-3">{images.map((image, index) => <button key={`${image.url}-${index}`} onClick={() => setImageIndex(index)} aria-label={`Show product image ${index + 1}`} aria-pressed={imageIndex === index} className={`h-20 w-20 overflow-hidden rounded-lg border-2 p-1 ${imageIndex === index ? 'border-brand' : 'border-line'}`}><ProductImage src={image.url} alt="" className="h-full w-full object-contain" /></button>)}</div>}</section>
      <section className="py-2"><p className="text-xs font-bold uppercase tracking-wider text-brand">{product.pet} · {product.category}</p><h1 className="mt-2 break-words text-3xl font-bold tracking-tight sm:text-4xl">{product.name}</h1>
        {product.rating !== null && product.reviewCount > 0 && <div className="mt-4 flex items-center gap-2 text-sm"><Star size={17} className="fill-accent text-accent" aria-hidden="true" /><b>{product.rating.toFixed(1)}</b><span className="text-gray-500">{product.reviewCount} reviews</span></div>}
        <p className="mt-5 text-3xl font-bold">£{product.price.toFixed(2)}</p><p className={`mt-2 text-sm font-semibold ${product.available ? 'text-brand' : 'text-gray-600'}`}>{product.available ? 'Available to order' : 'Currently unavailable'}</p>
        <p className="mt-6 whitespace-pre-wrap break-words leading-7 text-gray-700">{product.description}</p><dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm text-gray-600"><div><dt className="inline font-semibold">Product reference: </dt><dd className="inline">{product.sku}</dd></div>{product.weightGrams > 0 && <div><dt className="inline font-semibold">Package weight: </dt><dd className="inline">{product.weightGrams >= 1000 ? `${product.weightGrams / 1000} kg` : `${product.weightGrams} g`}</dd></div>}</dl>
        <div className="mt-8 flex gap-3"><div className="flex items-center rounded-lg border border-line"><button aria-label="Decrease quantity" disabled={quantity === 1} onClick={() => setQuantity(value => Math.max(1, value - 1))} className="p-3 disabled:opacity-40"><Minus size={17} /></button><label className="sr-only" htmlFor="product-quantity">Quantity</label><input id="product-quantity" type="number" min={1} max={maxCartQuantity} value={quantity} onChange={event => setQuantity(Math.max(1, Math.min(maxCartQuantity, Math.floor(Number(event.target.value) || 1))))} className="w-14 bg-transparent text-center font-bold" /><button aria-label="Increase quantity" disabled={quantity >= maxCartQuantity} onClick={() => setQuantity(value => Math.min(maxCartQuantity, value + 1))} className="p-3 disabled:opacity-40"><Plus size={17} /></button></div><button disabled={!product.available} onClick={() => add(product, quantity)} className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-50">{product.available ? 'Add to basket' : 'Unavailable'}</button></div><p className="mt-2 text-xs italic text-gray-500">Up to {maxCartQuantity} per product. Availability is checked when requesting delivery.</p>
        <div className="mt-8 rounded-xl bg-sand p-5"><h2 className="font-bold">Delivery & returns</h2><p className="mt-2 text-sm leading-6 text-gray-600">Check delivery options for your postcode in the basket.</p><div className="mt-3 flex flex-wrap gap-5 text-sm font-semibold text-brand"><Link to="/delivery" className="underline">Delivery information</Link><Link to="/returns" className="underline">Returns information</Link><Link to="/contact" className="underline">Ask a question</Link></div></div>
      </section>
    </div>
  </main>
}
