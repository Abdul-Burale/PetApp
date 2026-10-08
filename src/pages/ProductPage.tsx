import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, ChevronLeft, ChevronRight, Minus, Plus, Star, Truck } from 'lucide-react'
import { ProductImage } from '../components/shop/ProductImage'
import { ProductGrid } from '../components/shop/ProductGrid'
import { useCatalog } from '../context/CatalogContext'
import { maxCartQuantity, useCart } from '../context/CartContext'
import { useApiProduct, type ProductDetail } from '../hooks/useApiProduct'
import { getSiteContent } from '../lib/api'

const weightLabel = (grams: number) => grams >= 1000 ? `${grams / 1000} kg` : `${grams} g`

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return <details className="group border-b border-line last:border-b-0">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden">
      {title}<ChevronDown aria-hidden="true" size={19} className="shrink-0 transition-transform group-open:rotate-180" />
    </summary>
    <div className="px-5 pb-6 text-sm leading-7 text-gray-600">{children}</div>
  </details>
}

function SellerInformation() {
  const site = useQuery({ queryKey: ['site-content'], queryFn: getSiteContent, retry: false })
  const contact = site.data?.contact
  const address = contact ? [contact.address.line1, contact.address.line2, contact.address.townCity, contact.address.county, contact.address.postcode, contact.address.country].filter(Boolean).join(', ') : ''
  return <>
    <p className="font-bold text-ink">Sold by My Pet Food</p>
    {site.isPending && <p>Loading contact details…</p>}
    {contact && !site.isError && <dl className="mt-3 space-y-3">
      {contact.email && <div><dt className="font-semibold text-ink">Email</dt><dd><a className="break-all text-brand underline" href={`mailto:${contact.email}`}>{contact.email}</a></dd></div>}
      {contact.phones.map((phone, index) => <div key={index}><dt className="font-semibold text-ink">{phone.label}</dt><dd><a className="text-brand underline" href={`tel:${phone.number.replace(/[^+\d]/g, '')}`}>{phone.number}</a></dd></div>)}
      {address && <div><dt className="font-semibold text-ink">Postal address</dt><dd className="break-words">{address}</dd></div>}
      {contact.openingHours && <div><dt className="font-semibold text-ink">Opening hours</dt><dd className="whitespace-pre-wrap">{contact.openingHours}</dd></div>}
    </dl>}
    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-semibold text-brand"><Link to="/contact" className="underline">Contact the shop</Link><Link to="/our-story" className="underline">Our story</Link></div>
  </>
}

function ProductExperience({ product }: { product: ProductDetail }) {
  const navigate = useNavigate()
  const { add, items, setIsOpen } = useCart()
  const { products } = useCatalog()
  const [quantity, setQuantity] = useState(1)
  const [imageIndex, setImageIndex] = useState(0)
  const detailsRef = useRef<HTMLElement>(null)
  const images = product.images.length ? product.images : [{ url: product.image, altText: product.name, position: 0 }]
  const selectedImage = images[imageIndex] ?? images[0]
  const alreadyInBasket = items.find(item => item.product.id === product.id)?.quantity ?? 0
  const remaining = Math.max(0, maxCartQuantity - alreadyInBasket)
  const selectedQuantity = Math.min(quantity, Math.max(1, remaining))
  const canAdd = product.available && remaining > 0
  const related = products.filter(candidate => candidate.id !== product.id && !product.sizeOptions.some(option => option.productId === candidate.id) && candidate.pet === product.pet && candidate.available)
    .sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category) || Number(Boolean(b.featured)) - Number(Boolean(a.featured)))
    .slice(0, 4)
  const specifications = [
    ['Product reference', product.sku], ['Pet', product.pet], ['Category', product.category],
    ...(product.sizeLabel ? [['Size', product.sizeLabel]] : []),
    ...(product.weightGrams > 0 ? [['Package weight', weightLabel(product.weightGrams)]] : []),
    ...([['Package length', product.lengthMm], ['Package width', product.widthMm], ['Package height', product.heightMm]] as const)
      .filter(([, value]) => typeof value === 'number' && value > 0).map(([label, value]) => [label, `${value} mm`]),
  ]

  function moveImage(direction: number) { setImageIndex(current => (current + direction + images.length) % images.length) }
  function buyNow() {
    if (!canAdd) return
    add(product, selectedQuantity)
    setIsOpen(false)
    navigate('/checkout')
  }
  function showReviews() {
    const reviews = detailsRef.current?.querySelector('details')
    if (reviews) { reviews.open = true; reviews.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  }

  return <main className="container-page py-6 sm:py-10">
    <nav aria-label="Breadcrumb" className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-gray-500">
      <Link to="/" className="hover:text-brand">Home</Link><span aria-hidden="true">/</span><Link to={`/category/${product.pet.toLowerCase()}`} className="hover:text-brand">{product.pet}</Link><span aria-hidden="true">/</span><span className="break-words text-ink">{product.name}</span>
    </nav>

    <div className="mt-6 grid items-start gap-7 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-10">
      <section aria-label="Product images" tabIndex={0} onKeyDown={event => {
        if (images.length < 2) return
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); moveImage(event.key === 'ArrowLeft' ? -1 : 1) }
      }} className="min-w-0 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-sand/50 p-6 sm:p-10">
          <ProductImage src={selectedImage.url} alt={selectedImage.altText || product.name} className="h-full w-full object-contain" />
          {images.length > 1 && <>
            <button type="button" aria-label="Previous product image" onClick={() => moveImage(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-line bg-white p-2.5 shadow-sm hover:bg-sand sm:left-4"><ChevronLeft size={22} /></button>
            <button type="button" aria-label="Next product image" onClick={() => moveImage(1)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-line bg-white p-2.5 shadow-sm hover:bg-sand sm:right-4"><ChevronRight size={22} /></button>
            <span role="status" aria-live="polite" className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/95 px-3 py-1 text-xs text-gray-600">Image {imageIndex + 1} of {images.length}</span>
          </>}
        </div>
        {images.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto p-1">{images.map((image, index) => <button key={`${image.url}-${index}`} type="button" onClick={() => setImageIndex(index)} aria-label={`Show product image ${index + 1}`} aria-pressed={imageIndex === index} className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-white p-1 ${imageIndex === index ? 'border-brand ring-1 ring-brand' : 'border-line hover:border-brand'}`}><ProductImage src={image.url} alt="" className="h-full w-full object-contain" /></button>)}</div>}
      </section>

      <section aria-label="Order this product" className="min-w-0 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
        <p className="text-xs font-bold uppercase tracking-wider text-brand">{product.pet} · {product.category}</p>
        <h1 className="mt-3 break-words text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{product.name}</h1>
        <button type="button" onClick={showReviews} className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-600 underline underline-offset-4">
          {product.rating !== null && product.reviewCount > 0 ? <><Star size={16} className="fill-accent text-accent" aria-hidden="true" /><span>{product.rating.toFixed(1)} · {product.reviewCount} {product.reviewCount === 1 ? 'review' : 'reviews'}</span></> : 'No reviews yet'}
        </button>
        <p className="mt-6 text-3xl font-bold">£{product.price.toFixed(2)}</p>
        <p className={`mt-2 text-sm font-semibold ${product.available ? 'text-brand' : 'text-gray-600'}`}>{product.available ? 'Available to order' : 'Currently unavailable'}</p>
        {(product.sizeLabel || product.sizeOptions.length > 0) && <section aria-label="Product sizes" className="mt-6">
          <h2 className="text-sm font-semibold">Size{product.sizeLabel ? `: ${product.sizeLabel}` : ''}</h2>
          {product.sizeOptions.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{product.sizeOptions.map(option => <Link key={option.productId} to={`/product/${encodeURIComponent(option.slug)}`} aria-current={option.productId === product.id ? 'page' : undefined} className={`rounded-lg border px-4 py-2 text-sm ${option.productId === product.id ? 'border-brand bg-brand font-bold text-white' : 'border-line hover:border-brand'}`}>{option.label}{!option.available && <span className="block text-xs">Unavailable</span>}</Link>)}</div> : <p className="mt-2 text-sm text-gray-600">{product.sizeLabel}</p>}
        </section>}
        {product.weightGrams > 0 && <dl className="mt-6 border-y border-line py-4 text-sm"><dt className="font-semibold text-gray-600">Package weight</dt><dd className="mt-2 inline-block rounded-lg border border-brand bg-sand px-4 py-2 font-bold text-brand">{weightLabel(product.weightGrams)}</dd></dl>}
        <p className="mt-4 text-sm text-gray-600">Need help with size or suitability? <Link to="/contact" className="font-semibold text-brand underline">Ask us</Link>.</p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <label htmlFor="product-quantity" className="text-sm font-semibold">Quantity</label>
          <div className="flex items-center rounded-lg border border-line">
            <button type="button" aria-label="Decrease quantity" disabled={!canAdd || selectedQuantity <= 1} onClick={() => setQuantity(selectedQuantity - 1)} className="p-3 disabled:opacity-40"><Minus size={17} /></button>
            <input id="product-quantity" type="number" min={1} max={Math.max(1, remaining)} disabled={!canAdd} value={selectedQuantity} onChange={event => setQuantity(Math.max(1, Math.min(remaining, Math.floor(Number(event.target.value) || 1))))} className="w-14 bg-transparent py-2 text-center font-bold" />
            <button type="button" aria-label="Increase quantity" disabled={!canAdd || selectedQuantity >= remaining} onClick={() => setQuantity(selectedQuantity + 1)} className="p-3 disabled:opacity-40"><Plus size={17} /></button>
          </div>
        </div>
        {alreadyInBasket > 0 && <p className="mt-2 text-sm text-gray-600">{alreadyInBasket} already in your basket. <Link to="/basket" className="text-brand underline">View basket</Link></p>}
        {remaining === 0 && <p className="mt-2 text-sm text-gray-600">Your basket has reached the limit of {maxCartQuantity} for this product.</p>}
        <div className="mt-5 grid gap-3">
          <button type="button" disabled={!canAdd} onClick={() => add(product, selectedQuantity)} className="btn w-full rounded-lg bg-[#f4c542] text-ink shadow-sm hover:bg-[#eab72d] focus:ring-[#b88700] disabled:cursor-not-allowed disabled:opacity-50">{product.available ? 'Add to basket' : 'Currently unavailable'}</button>
          <button type="button" disabled={!canAdd} onClick={buyNow} className="btn w-full rounded-lg bg-[#f4c542] text-ink shadow-sm hover:bg-[#eab72d] focus:ring-[#b88700] disabled:cursor-not-allowed disabled:opacity-50">Buy now</button>
        </div>
        <p className="mt-2 text-xs text-gray-500">Buy now adds this item and takes your basket to checkout.</p>
        <div className="mt-6 flex items-start gap-3 border-t border-line pt-5 text-sm"><Truck size={20} className="mt-1 shrink-0 text-brand" aria-hidden="true" /><div><p className="font-semibold">Delivery & returns</p><p className="mt-1 leading-6 text-gray-600">Check delivery options for your postcode in the basket.</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-brand"><Link to="/delivery" className="underline">Delivery information</Link><Link to="/returns" className="underline">Returns information</Link></div></div></div>
      </section>
    </div>

    {product.description && <section aria-labelledby="product-description-title" className="mt-7 rounded-xl bg-[#faf8f1] p-4 sm:p-5"><h2 id="product-description-title" className="text-lg font-bold">About this product</h2><p className="mt-2 max-w-4xl whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">{product.description}</p></section>}
    <section ref={detailsRef} aria-label="Product details" className="mt-8 overflow-hidden rounded-xl border border-line">
      <DetailSection title={`Reviews${product.reviewCount > 0 ? ` (${product.reviewCount})` : ''}`}>
        {product.reviewCount > 0 ? <><p className="font-semibold text-ink">{product.rating !== null ? `${product.rating.toFixed(1)} out of 5 · ` : ''}{product.reviewCount} customer {product.reviewCount === 1 ? 'review' : 'reviews'}</p><p className="mt-2">Written reviews are not currently available.</p></> : <p>No customer reviews yet.</p>}
      </DetailSection>
      <DetailSection title="Product specifications"><dl className="divide-y divide-line">{specifications.map(([label, value]) => <div key={label} className="grid gap-1 py-3 sm:grid-cols-[200px_1fr]"><dt className="font-semibold text-ink">{label}</dt><dd className="break-words">{value}</dd></div>)}</dl></DetailSection>
      <DetailSection title="Seller information"><SellerInformation /></DetailSection>
    </section>
    {related.length > 0 && <section aria-label="Similar products" className="mt-12"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h2 className="section-title">Similar products</h2><p className="mt-2 text-sm text-gray-600">More for your {product.pet.toLowerCase()}.</p></div><Link to={`/category/${product.pet.toLowerCase()}`} className="text-sm font-semibold text-brand underline">Shop all {product.pet.toLowerCase()}</Link></div><ProductGrid products={related} /></section>}
  </main>
}

export function ProductPage() {
  const { slug = '' } = useParams()
  const { product, loading, error } = useApiProduct(slug)
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [slug])
  useEffect(() => {
    const previous = document.title
    if (product) document.title = `${product.name} | My Pet Food`
    return () => { document.title = previous }
  }, [product?.name])
  if (loading) return <main className="container-page py-16"><p role="status">Loading product…</p></main>
  if (!product || error) return <main className="container-page py-16"><h1 className="section-title">Product could not be loaded</h1>{error && <p role="alert" className="mt-3 text-gray-600">{error}</p>}<Link className="btn-secondary mt-5" to="/shop">Back to shop</Link></main>
  return <ProductExperience key={product.id} product={product} />
}
