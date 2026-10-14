import { ChevronDown, CircleHelp, Menu, ShoppingBag, UserRound, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { useCatalog } from '../../context/CatalogContext'
import { getVisiblePetNavigation, getVisibleShopNavigation, pets } from '../../lib/catalog'
import type { Pet } from '../../types/product'
import type { ProductCategory } from '../../types/product'
import { SearchForm } from '../shop/SearchForm'
import { OverlayDialog } from './OverlayDialog'

const adminClass = 'rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-red-950 hover:bg-rose-100'

function PetDropdown({ pet, categories }: { pet: Pet; categories: Array<{ label: string; category: ProductCategory }> }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null), id = useId(), location = useLocation()
  useEffect(() => { setOpen(false) }, [location])
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  return <div ref={ref} className="relative flex items-center" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }} onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); ref.current?.querySelector('button')?.focus() } }}>
    <Link to={`/category/${pet.toLowerCase()}`} className="py-3 pl-3 pr-1 text-sm font-bold hover:text-brand">{pet}</Link>
    <button type="button" aria-label={`Browse ${pet.toLowerCase()} categories`} aria-controls={id} aria-expanded={open} onClick={() => setOpen(value => !value)} className="rounded p-2 text-brand focus-visible:outline focus-visible:outline-2"><ChevronDown size={15} className={open ? 'rotate-180' : ''} /></button>
    <div id={id} hidden={!open} className="absolute left-0 top-full z-40 w-48 rounded-b-lg border border-line bg-white p-2 shadow-card">
      {categories.map(item => <Link key={item.label} to={`/shop?${new URLSearchParams({ pet, category: item.category })}`} className="block rounded px-3 py-2.5 text-sm hover:bg-sand focus:bg-sand">{item.label}</Link>)}
    </div>
  </div>
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const mobileTitle = useId(), location = useLocation()
  const { count, total, setIsOpen } = useCart()
  const { session, backendAccount, backendLoading, backendError } = useAuth()
  const { products, loading: catalogLoading } = useCatalog()
  const petNav = catalogLoading ? {} : getVisiblePetNavigation(products)
  const shopNav = catalogLoading ? [] : getVisibleShopNavigation(products)
  const isStaff = Boolean(session && backendAccount?.role?.toLowerCase() === 'staff')
  const hasFulfilmentsAccess = backendAccount?.permissions?.includes('fulfilments:access') === true
  const checkingFulfilmentsAccess = Boolean(session && !backendAccount && !backendError)
  const fulfilmentsUrl = '/admin/fulfilments'
  const accountPath = session ? '/account' : '/login'
  useEffect(() => { setMobileOpen(false) }, [location])
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const close = () => { if (desktop.matches) setMobileOpen(false) }
    desktop.addEventListener('change', close)
    return () => desktop.removeEventListener('change', close)
  }, [])
  return <header className="relative z-40">
    <div className="hidden bg-brand py-2 text-xs text-white md:block"><div className="container-page flex justify-between gap-4"><span>Food, treats & everyday pet essentials</span><div className="flex gap-6"><Link to="/guides" className="hover:underline">Pet care guides</Link><Link to="/delivery" className="hover:underline">Delivery information</Link></div></div></div>
    <div className="border-b border-line bg-white"><div className="container-page flex h-16 items-center gap-3 lg:h-20 lg:gap-6">
      <button onClick={() => setMobileOpen(true)} className="rounded p-2 lg:hidden" aria-label="Open navigation" aria-haspopup="dialog"><Menu /></button>
      <Link to="/" aria-label="My Pet Food home" className="shrink-0"><img src="/brand/mypetfood-logo.jpeg" alt="My Pet Food Pet Supplies" className="h-auto w-36 sm:w-44 lg:w-52" /></Link>
      <SearchForm className="hidden max-w-2xl flex-1 md:flex" label="Search products" />
      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-3">
        <Link to={accountPath} aria-label={session ? 'Account' : 'Sign in'} className="hidden rounded p-2 hover:text-brand sm:block"><UserRound size={21} /></Link>
        <Link to="/faqs" aria-label="Help" className="hidden rounded p-2 hover:text-brand sm:block"><CircleHelp size={21} /></Link>
        <button onClick={() => setIsOpen(true)} className="flex items-center gap-2 rounded p-2 hover:text-brand" aria-label="Open basket" aria-haspopup="dialog"><span className="relative"><ShoppingBag size={22} />{count > 0 && <span className="absolute -right-2 -top-2 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">{count}</span>}</span><span className="hidden text-left text-xs lg:block"><b className="block">Basket</b>£{total.toFixed(2)}</span></button>
      </div>
    </div><div className="container-page pb-3 md:hidden"><SearchForm label="Search products" /></div></div>
    <nav aria-label="Main navigation" className="hidden border-b border-line bg-white lg:block"><div className="container-page flex flex-wrap items-center justify-center">
      <Link className="px-3 py-3 text-sm font-bold hover:text-brand" to="/shop">Shop all</Link>
      {pets.filter(pet => petNav[pet]?.length).map(pet => <PetDropdown key={pet} pet={pet} categories={petNav[pet]!} />)}
      {shopNav.map(item => <Link key={item.label} to={item.route} className="px-3 py-3 text-sm font-bold hover:text-brand">{item.label}</Link>)}
      {isStaff && <Link className={`${adminClass} my-1`} to="/account">Admin tools <span className="ml-1 rounded bg-rose-200 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">Admin</span></Link>}
      {hasFulfilmentsAccess && <a className={`${adminClass} my-1`} href={fulfilmentsUrl}>Fulfilment centre</a>}
      {checkingFulfilmentsAccess && backendLoading && <span role="status" className="my-1 px-3 py-2 text-xs text-gray-500">Checking staff access…</span>}
    </div></nav>
    <OverlayDialog open={mobileOpen} onClose={() => setMobileOpen(false)} labelledBy={mobileTitle} side="left">
      <div className="flex items-center justify-between border-b border-line p-5"><h2 id={mobileTitle} className="font-bold text-brand">My Pet Food</h2><button onClick={() => setMobileOpen(false)} aria-label="Close navigation" className="rounded p-2"><X /></button></div>
      <nav aria-label="Mobile navigation" className="flex-1 space-y-1 overflow-y-auto p-5">
        <Link to={accountPath} onClick={() => setMobileOpen(false)} className="block rounded px-3 py-3 font-semibold hover:bg-sand">{session ? 'My account' : 'Sign in'}</Link>
        {isStaff && <Link to="/account" onClick={() => setMobileOpen(false)} className={`${adminClass} block`}>Admin tools</Link>}
        {hasFulfilmentsAccess && <a href={fulfilmentsUrl} onClick={() => setMobileOpen(false)} className={`${adminClass} block`}>Fulfilment centre</a>}
        {checkingFulfilmentsAccess && backendLoading && <p role="status" className="rounded px-3 py-3 text-sm text-gray-500">Checking staff access…</p>}
        <Link to="/shop" onClick={() => setMobileOpen(false)} className="block rounded px-3 py-3 font-semibold hover:bg-sand">Shop all products</Link>
        {pets.filter(pet => petNav[pet]?.length).map(pet => <div key={pet} className="border-t border-line pt-2"><div className="flex items-center justify-between"><Link to={`/category/${pet.toLowerCase()}`} onClick={() => setMobileOpen(false)} className="rounded px-3 py-3 font-bold text-brand">{pet}</Link></div><div className="flex flex-wrap gap-2 px-3 pb-3">{petNav[pet]!.map(item => <Link key={item.label} to={`/shop?${new URLSearchParams({ pet, category: item.category })}`} onClick={() => setMobileOpen(false)} className="rounded-full border border-line px-3 py-2 text-sm">{item.label}</Link>)}</div></div>)}
        {shopNav.map(item => <Link key={item.label} to={item.route} onClick={() => setMobileOpen(false)} className="block rounded px-3 py-3 font-semibold hover:bg-sand">{item.label}</Link>)}
        <Link to="/faqs" onClick={() => setMobileOpen(false)} className="block rounded px-3 py-3 font-semibold hover:bg-sand">Help & FAQs</Link>
      </nav>
    </OverlayDialog>
  </header>
}
