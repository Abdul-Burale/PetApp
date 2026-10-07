import { ArrowRight, BookOpen } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { ProductGrid } from '../components/shop/ProductGrid'
import { CatalogPagination, readCatalogNumber } from '../components/shop/CatalogPagination'
import { useCatalog } from '../context/CatalogContext'
import { getContentPage } from '../lib/api'
import { catalogFilters, filterCatalog } from '../lib/catalog'

const excerpt = (text: string, length: number) => text.trim().length > length ? `${text.trim().slice(0, length).trimEnd()}…` : text.trim()

export function HomePage() {
  const [params, setParams] = useSearchParams()
  const { products, loading, error, refresh } = useCatalog()
  const story = useQuery({ queryKey: ['content-page', 'our-story'], queryFn: () => getContentPage('our-story'), retry: false })
  const guides = useQuery({ queryKey: ['content-page', 'guides'], queryFn: () => getContentPage('guides'), retry: false })
  const listing = filterCatalog(products, catalogFilters(params))
  const pageSize = readCatalogNumber(params.get('pageSize'), 12, [12, 24, 48])
  const pageCount = Math.max(1, Math.ceil(listing.length / pageSize))
  const page = Math.min(readCatalogNumber(params.get('page'), 1), pageCount)
  const visibleProducts = listing.slice((page - 1) * pageSize, page * pageSize)
  function goToProductsPage(nextPage: number) {
    setParams(current => { const next = new URLSearchParams(current); next.set('page', String(nextPage)); return next })
    document.getElementById('home-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  function updatePageSize(size: number) {
    setParams(current => { const next = new URLSearchParams(current); next.delete('page'); if (size === 12) next.delete('pageSize'); else next.set('pageSize', String(size)); return next })
  }
  const storyCopy = story.data?.intro.trim() || story.data?.sections.find(section => section.body.trim())?.body.trim() || ''
  const publishedGuides = (guides.data?.sections ?? []).map((section, index) => ({ section, index })).filter(({ section }) => section.body.trim() || section.bullets.some(bullet => bullet.trim())).slice(0, 3)
  return <main className="container-page py-8 sm:py-10">
    <section id="home-products" aria-label="Shop products" className="scroll-mt-6">
      <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-accent">My Pet Food · Pet supplies</p><h1 className="section-title mt-2">Shop pet supplies</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">Browse our range of food, treats, toys and everyday care. Featured products appear first.</p></div>
      {loading ? <p role="status" className="rounded-xl bg-sand p-8 text-center text-gray-600">Loading products…</p> : error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6"><p>{error}</p><button onClick={() => void refresh()} className="btn-secondary mt-4">Retry loading products</button></div> : listing.length ? <ProductGrid products={visibleProducts} /> : <div className="rounded-xl border border-dashed border-line bg-sand p-8 text-center"><p className="font-semibold">No products are listed yet.</p><Link to="/shop" className="mt-3 inline-block text-sm text-brand underline">Browse the shop</Link></div>}
      {!loading && !error && <CatalogPagination total={listing.length} page={page} pageSize={pageSize} onPageChange={goToProductsPage} onPageSizeChange={updatePageSize} />}
    </section>
    {storyCopy && !story.isError && <section aria-label="About the business" className="bg-brand py-10 text-white sm:py-14"><div className="container-page grid gap-6 md:grid-cols-[1fr_1.5fr]"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-white/75">The people behind the shop</p><h2 className="mt-3 font-serif text-3xl">{story.data?.title}</h2></div><div><p className="whitespace-pre-wrap break-words text-lg leading-8 text-white/90">{excerpt(storyCopy, 240)}</p><Link to="/our-story" className="mt-5 inline-flex items-center gap-2 font-semibold underline underline-offset-4">Read our story <ArrowRight size={17} /></Link></div></div></section>}
    {publishedGuides.length > 0 && !guides.isError && <section aria-label="Helpful guides" className="container-page py-12 sm:py-16"><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-accent">A little reading for pet people</p><h2 className="section-title mt-2">Helpful guides</h2></div><Link to="/guides" className="text-sm font-bold text-brand underline">All pet care guides →</Link></div><div className="grid gap-5 md:grid-cols-3">{publishedGuides.map(({ section, index }) => <Link key={index} to={`/guides#section-${index + 1}`} className="rounded-xl border border-line bg-sand/50 p-6 transition hover:border-brand hover:bg-sand"><BookOpen className="text-accent" size={24} aria-hidden="true" /><h3 className="mt-4 break-words text-xl font-bold">{section.heading}</h3><p className="mt-3 break-words text-sm leading-7 text-gray-600">{excerpt(section.body || section.bullets[0] || '', 160)}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand">Read guide <ArrowRight size={16} /></span></Link>)}</div></section>}
  </main>
}
