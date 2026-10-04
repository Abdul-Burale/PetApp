import { Minus, Plus, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ProductGrid } from '../components/shop/ProductGrid'
import { useCatalog } from '../context/CatalogContext'
import { useCart } from '../context/CartContext'
import { useApiProduct } from '../hooks/useApiProduct'

const pets = ['Cats', 'Dogs', 'Birds'] as const

function CatalogState({ loading, error }: { loading: boolean; error: string | null }) {
  if (loading) return <p className="border border-line p-10 text-center text-gray-600">Loading products…</p>
  if (error) return <p role="alert" className="border border-red-200 bg-red-50 p-10 text-center text-sm text-red-800">{error}</p>
  return null
}

export function ShopPage() {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') ?? '')
  const { products, loading, error } = useCatalog()
  const category = params.get('category') ?? ''
  const pet = params.get('pet') ?? ''
  const [sort, setSort] = useState('featured')
  const list = useMemo(() => products
    .filter(product => `${product.name} ${product.category} ${product.pet}`.toLowerCase().includes(search.toLowerCase()))
    .filter(product => !category || product.category === category)
    .filter(product => !pet || product.pet === pet)
    .filter(product => !params.get('offer') || product.badge === 'Offer')
    .sort((a, b) => sort === 'low' ? a.price - b.price : sort === 'high' ? b.price - a.price : 0),
  [category, params, pet, products, search, sort])

  return <main className="container-page py-10"><p className="text-sm text-gray-500"><Link to="/">Home</Link> / Shop</p><h1 className="mt-2 text-3xl font-bold">{pet ? `${pet} products` : 'Shop pet supplies'}</h1><p className="mt-2 max-w-2xl text-gray-600">Carefully selected essentials for happy, healthy pets — delivered across the UK.</p><div className="mt-8 grid gap-3 border-y border-line py-4 md:grid-cols-[1fr_auto_auto]"><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search products" className="border border-line px-3 py-2.5 text-sm outline-none focus:border-brand"/><select value={category} onChange={event => setParams(current => { if (event.target.value) current.set('category', event.target.value); else current.delete('category'); return current })} className="border border-line bg-white px-3 py-2.5 text-sm"><option value="">All categories</option>{['Food', 'Treats', 'Toys', 'Health', 'Grooming', 'Accessories', 'Walking'].map(value => <option key={value}>{value}</option>)}</select><select value={sort} onChange={event => setSort(event.target.value)} className="border border-line bg-white px-3 py-2.5 text-sm"><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></div><p className="my-5 text-sm text-gray-600">{loading ? 'Loading…' : `${list.length} products`}</p>{loading || error ? <CatalogState loading={loading} error={error}/> : <ProductGrid products={list}/>}</main>
}

export function CategoryPage() {
  const { category = '' } = useParams()
  const { products, loading, error } = useCatalog()
  const pet = pets.find(value => value.toLowerCase() === category.toLowerCase())
  const list = products.filter(product => product.pet === pet)
  return <main className="container-page py-10"><p className="text-sm text-gray-500"><Link to="/">Home</Link> / {pet ?? 'Shop'}</p><div className="mt-4 border-l-4 border-accent bg-sand p-7"><p className="text-xs font-bold uppercase tracking-wider text-accent">Shop for {pet}</p><h1 className="mt-1 text-3xl font-bold">{pet ?? 'Pet supplies'}</h1><p className="mt-2 max-w-xl text-gray-700">{pet === 'Cats' ? 'Food, playtime favourites and home comforts for curious cats.' : pet === 'Dogs' ? 'Everyday essentials for wagging tails, adventures and quiet nights in.' : 'Thoughtful food, toys and care for bright, happy birds.'}</p></div><div className="mt-9">{loading || error ? <CatalogState loading={loading} error={error}/> : <ProductGrid products={list}/>}</div></main>
}

export function ProductPage() {
  const { slug = '' } = useParams()
  const { products, loading } = useCatalog()
  const { product: detailProduct, loading: detailLoading } = useApiProduct(slug)
  const product = detailProduct ?? products.find(value => value.slug === slug) ?? null
  const { add } = useCart()
  const [quantity, setQuantity] = useState(1)

  if (loading || detailLoading) return <main className="container-page py-20"><p className="text-center text-gray-600">Loading product…</p></main>
  if (!product) return <main className="container-page py-20"><h1 className="text-2xl font-bold">Product not found</h1><Link className="mt-4 inline-block text-brand underline" to="/shop">Back to shop</Link></main>

  return <main className="container-page py-8 sm:py-12"><p className="text-sm text-gray-500"><Link to="/">Home</Link> / <Link to={`/category/${product.pet.toLowerCase()}`}>{product.pet}</Link> / {product.name}</p><div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-14"><div className="aspect-square bg-sand"><img src={product.image} alt={product.name} className="h-full w-full object-cover"/></div><div className="py-2"><p className="text-xs font-bold uppercase tracking-wider text-brand">{product.pet} · {product.category}</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{product.name}</h1>{product.rating !== null && <div className="mt-4 flex items-center gap-2 text-sm"><Star size={17} className="fill-accent text-accent"/><b>{product.rating.toFixed(1)}</b><span className="text-gray-500">{product.reviewCount} reviews</span></div>}<p className="mt-5 text-2xl font-bold">£{product.price.toFixed(2)}</p><p className="mt-5 max-w-lg leading-7 text-gray-700">{product.description}</p><div className="mt-8 flex gap-3"><div className="flex items-center border border-line"><button aria-label="Decrease quantity" onClick={() => setQuantity(value => Math.max(1, value - 1))} className="p-3"><Minus size={17}/></button><span className="w-9 text-center font-bold">{quantity}</span><button aria-label="Increase quantity" onClick={() => setQuantity(value => value + 1)} className="p-3"><Plus size={17}/></button></div><button disabled={!product.available} onClick={() => add(product, quantity)} className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-50">{product.available ? 'Add to basket' : 'Unavailable'}</button></div><div className="mt-9 border-t border-line pt-6"><h2 className="font-bold">Delivery information</h2><p className="mt-2 text-sm leading-6 text-gray-600">Orders are carefully packed and dispatched from our UK store. Free standard delivery on orders over £45.</p></div></div></div></main>
}
