import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useCatalog } from '../context/CatalogContext'
import { BasketItem } from '../components/shop/BasketItem'
import { BackendApiError, getDeliveryQuotes, type DeliveryQuote } from '../lib/api'

const money = (pence: number) => `£${(pence / 100).toFixed(2)}`
const postcodeKey = (value: string) => value.trim().toUpperCase().replace(/\s+/g, '')
type Estimate = { key: string; quotes: DeliveryQuote[]; error?: BackendApiError }

function BasketSummary({ blocked }: { blocked: boolean }) {
  const { items, total } = useCart()
  const [postcode, setPostcode] = useState(''), [estimate, setEstimate] = useState<Estimate | null>(null)
  const [selection, setSelection] = useState<{ key: string; code: string } | null>(null)
  const [pending, setPending] = useState<string | null>(null), [validation, setValidation] = useState('')
  const [retryUntil, setRetryUntil] = useState(0), [now, setNow] = useState(Date.now())
  const [stockFailure, setStockFailure] = useState<{ basket: string; error: BackendApiError } | null>(null)
  const controller = useRef<AbortController | null>(null)
  // Quote and selection belong to an exact postcode/basket snapshot, never to a later basket.
  const basketKey = JSON.stringify(items.map(({ product, quantity, unavailableReason }) => [product.id, quantity, product.price, product.available, unavailableReason]))
  const key = JSON.stringify([postcodeKey(postcode), basketKey, blocked])
  useEffect(() => {
    setEstimate(null); setSelection(null); setPending(null)
    return () => { controller.current?.abort() }
  }, [key])
  useEffect(() => {
    if (!retryUntil) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [retryUntil])
  const current = estimate?.key === key ? estimate : null
  const selected = selection?.key === key ? current?.quotes.find(quote => quote.code === selection.code) : undefined
  const seconds = Math.max(0, Math.ceil((retryUntil - now) / 1000))
  const stockIssue = stockFailure?.basket === basketKey
  const tooManyLines = items.length > 100

  async function check(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = postcodeKey(postcode)
    if (!/^(GIR0AA|[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2})$/.test(value)) { setValidation('Enter a full UK postcode, for example SW1A 1AA.'); return }
    if (blocked || tooManyLines || seconds > 0) return
    setValidation(''); setPending(key); setEstimate(null); setSelection(null)
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    try {
      const quotes = await getDeliveryQuotes({ postcode: value, countryCode: 'GB', items: items.map(({ product, quantity }) => ({ productId: product.id, quantity })) }, request.signal)
      if (!request.signal.aborted) { setEstimate({ key, quotes }); setStockFailure(null) }
    } catch (error) {
      if (request.signal.aborted) return
      const failure = error instanceof BackendApiError ? error : new BackendApiError('Delivery options could not be checked. Please try again.')
      setEstimate({ key, quotes: [], error: failure })
      if (failure.code && /INSUFFICIENT_STOCK|PRODUCT_UNAVAILABLE|PRODUCT_NOT_FOUND/.test(failure.code)) setStockFailure({ basket: basketKey, error: failure })
      if (failure.status === 429 && failure.retryAfter) { setNow(Date.now()); setRetryUntil(Date.now() + failure.retryAfter * 1000) }
    } finally { if (!request.signal.aborted) setPending(null) }
  }

  return <aside className="h-fit rounded-xl border border-line bg-sand p-5 sm:p-6">
    <h2 className="text-lg font-bold">Order summary</h2>
    <div className="mt-5 flex justify-between gap-4 font-bold"><span>Subtotal</span><span>{money(Math.round(total * 100))}</span></div>
    <section aria-labelledby="delivery-estimate-title" className="mt-6 border-t border-line pt-5">
      <h3 id="delivery-estimate-title" className="font-bold">Estimate delivery</h3>
      <p className="mt-2 text-sm leading-6 text-gray-600">Optional: enter your UK postcode to check delivery options for this basket. No address is saved here.</p>
      <form onSubmit={check} className="mt-4 space-y-3">
        <label htmlFor="delivery-postcode" className="block text-sm font-semibold">Delivery postcode</label>
        <input id="delivery-postcode" autoComplete="postal-code" maxLength={12} value={postcode} onChange={event => { setPostcode(event.target.value); setValidation('') }} placeholder="e.g. SW1A 1AA" aria-describedby={validation ? 'postcode-error' : undefined} aria-invalid={Boolean(validation)} className="w-full rounded-lg border border-line bg-white px-3 py-2.5 uppercase" />
        {validation && <p id="postcode-error" role="alert" className="text-sm text-red-800">{validation}</p>}
        <button type="submit" disabled={blocked || tooManyLines || pending === key || seconds > 0} className="btn-secondary w-full disabled:cursor-not-allowed disabled:opacity-50">{pending === key ? 'Checking delivery…' : seconds > 0 ? `Try again in ${seconds}s` : 'Check delivery options'}</button>
      </form>
      {tooManyLines && <p role="alert" className="mt-3 text-sm text-red-800">Delivery estimates support up to 100 different products. Please split this basket or contact us.</p>}
      {current?.error && <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"><p>{current.error.message}</p>{stockIssue && <p className="mt-2">Reduce the affected quantity or remove the unavailable product, then check again.</p>}{current.error.requestId && <p className="mt-2 break-all text-xs">Support reference: {current.error.requestId}</p>}</div>}
      {stockIssue && !current?.error && <p role="alert" className="mt-4 text-sm text-red-900">{stockFailure?.error.message} Update your basket or check availability again before continuing.</p>}
      {current && !current.error && !current.quotes.length && <p role="status" className="mt-4 text-sm">No delivery options were returned for this basket. Please <Link to="/contact" className="underline">contact us</Link>.</p>}
      {Boolean(current?.quotes.length) && <fieldset className="mt-4 space-y-3"><legend className="mb-2 text-sm font-bold">Choose a delivery option</legend>{current!.quotes.map(quote => <label key={quote.code} className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-white p-3 text-sm"><input type="radio" name="delivery-option" checked={selected?.code === quote.code} onChange={() => setSelection({ key, code: quote.code })} className="mt-1" /><span className="min-w-0 flex-1"><span className="flex flex-wrap justify-between gap-2 font-semibold"><span>{quote.name}</span><span>{quote.price.amount === 0 ? 'Free' : money(quote.price.amount)}</span></span><span className="mt-1 block text-xs text-gray-600">Estimated {quote.estimatedBusinessDays.min}–{quote.estimatedBusinessDays.max} business days</span></span></label>)}</fieldset>}
      {selected && <div role="status" className="mt-5 border-t border-line pt-4"><div className="flex justify-between gap-3 font-bold"><span>Estimated total</span><span>{money(Math.round(total * 100) + selected.price.amount)}</span></div><p className="mt-2 text-xs text-gray-600">Includes the selected delivery estimate. Final availability and charges are confirmed at checkout.</p></div>}
    </section>
    {blocked || stockIssue ? <button disabled className="btn-primary mt-6 w-full opacity-50">Proceed to checkout</button> : <Link className="btn-primary mt-6 w-full" to="/checkout">Proceed to checkout</Link>}
    <Link to="/delivery" className="mt-4 block text-center text-sm text-brand underline">Delivery information</Link>
  </aside>
}

export function BasketPage() {
  const { items } = useCart()
  const { loading, error, refresh } = useCatalog()
  const unavailable = items.some(item => !item.product.available || item.unavailableReason)
  return <main className="container-page py-8 sm:py-12"><h1 className="text-3xl font-bold">Your basket</h1>
    {!items.length ? <section className="mt-7 rounded-xl border border-line bg-sand p-10 text-center"><h2 className="text-xl font-bold">Your basket is empty</h2><p className="mt-3 text-gray-600">Find their next everyday essential.</p><Link className="btn-primary mt-5" to="/shop">Browse products</Link></section> : <>
      {loading && <p role="status" className="mt-5 text-sm">Checking product availability…</p>}
      {error && <div role="alert" className="mt-5 rounded-lg bg-red-50 p-4"><p>We cannot check availability right now. Please refresh before continuing.</p><button onClick={() => void refresh()} className="mt-2 text-sm font-bold underline">Refresh availability</button></div>}
      {unavailable && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-900">Remove unavailable products before continuing to checkout.</p>}
      <div className="mt-7 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]"><section aria-label="Basket products" className="divide-y divide-line border-y border-line">{items.map(item => <BasketItem key={item.product.id} item={item} />)}<Link to="/shop" className="inline-block py-5 text-sm font-semibold text-brand underline">Continue shopping</Link></section><BasketSummary blocked={loading || Boolean(error) || unavailable} /></div>
    </>}
  </main>
}

export function CheckoutPage() {
  const { items, total, count } = useCart()
  const { loading, error } = useCatalog()
  const blocked = loading || Boolean(error) || items.some(item => !item.product.available || item.unavailableReason)
  return <main className="container-page py-10"><h1 className="text-3xl font-bold">Checkout</h1>{!items.length || blocked ? <section className="mt-7 rounded-xl border border-line p-6"><h2 className="text-lg font-bold">{!items.length ? 'Your basket is empty' : 'Check your basket first'}</h2><p className="mt-3 text-gray-600">{loading ? 'Checking product availability…' : error ? 'Availability could not be checked. Please refresh your basket.' : blocked ? 'Remove unavailable products before continuing.' : 'Add a product before starting checkout.'}</p><Link to="/basket" className="btn-secondary mt-5">Back to basket</Link></section> : <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]"><section className="rounded-xl border border-line p-6"><h2 className="text-lg font-bold">Almost there</h2><p className="mt-3 leading-6 text-gray-600">This is a prototype checkout. Your basket has been saved, but no payment will be taken.</p><Link to="/basket" className="btn-secondary mt-6">Back to basket</Link></section><aside className="rounded-xl bg-sand p-6"><h2 className="font-bold">Order summary</h2><p className="mt-3 text-sm text-gray-600">{count} item{count === 1 ? '' : 's'} in basket</p><div className="mt-5 flex justify-between font-bold"><span>Subtotal</span><span>£{total.toFixed(2)}</span></div><p className="mt-3 text-xs text-gray-600">Delivery is not included. Payment will be enabled separately.</p></aside></div>}</main>
}
