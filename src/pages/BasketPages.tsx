import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useCatalog } from '../context/CatalogContext'
import { useAuth } from '../context/AuthContext'
import { BasketItem } from '../components/shop/BasketItem'
import { BackendApiError, createCheckoutSession, getCustomerOrder, getDeliveryQuotes, type CheckoutRequest, type CustomerOrder, type DeliveryQuote } from '../lib/api'

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
  const { session } = useAuth()
  const blocked = loading || Boolean(error) || items.some(item => !item.product.available || item.unavailableReason)
  const [form, setForm] = useState({ email: session?.user.email ?? '', phone: '', recipientName: '', line1: '', line2: '', city: '', county: '', postcode: '' })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [attempt, setAttempt] = useState<{ key: string; body: CheckoutRequest } | null>(null)
  const basketSnapshot = useRef<Array<{ productId: string; quantity: number }>>([])
  const { removePurchased } = useCart()
  useEffect(() => { if (session?.user.email) setForm(current => ({ ...current, email: current.email || session.user.email || '' })) }, [session?.user.email])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || blocked || !items.length) return
    setBusy(true); setMessage('')
    try {
      let currentAttempt = attempt
      if (!currentAttempt) {
        const origin = window.location.origin
        const shippingAddress = { recipientName: form.recipientName.trim(), line1: form.line1.trim(), line2: form.line2.trim(), city: form.city.trim(), county: form.county.trim(), postcode: form.postcode.trim().toUpperCase(), countryCode: 'GB' as const, phone: form.phone.trim() }
        const body: CheckoutRequest = {
          items: items.map(({ product, quantity }) => ({ productId: product.id, quantity })),
          customer: { email: form.email.trim(), phone: form.phone.trim() },
          shippingAddress, billingAddress: null, deliveryOptionCode: 'standard',
          // The API must replace {ORDER_NUMBER} after assigning the order number.
          successUrl: `${origin}/checkout/success?orderNumber={ORDER_NUMBER}`,
          cancelUrl: `${origin}/checkout/cancel?orderNumber={ORDER_NUMBER}`,
        }
        currentAttempt = { key: crypto.randomUUID(), body }
        setAttempt(currentAttempt)
        basketSnapshot.current = body.items
      }
      const result = await createCheckoutSession(currentAttempt.body, currentAttempt.key, Boolean(session))
      if (!result.checkoutUrl || !result.orderNumber) throw new BackendApiError('The payment provider returned an incomplete checkout response.')
      if (result.orderAccessToken) sessionStorage.setItem(`mypetfood-order-token:${result.orderNumber}`, result.orderAccessToken)
      sessionStorage.setItem(`mypetfood-order-items:${result.orderNumber}`, JSON.stringify(basketSnapshot.current.length ? basketSnapshot.current : currentAttempt.body.items))
      window.location.assign(result.checkoutUrl)
    } catch (cause) {
      if (cause instanceof BackendApiError && cause.status !== undefined && cause.status >= 400 && cause.status < 500) setAttempt(null)
      setMessage(cause instanceof Error ? cause.message : 'Checkout could not be started. Please try again.')
      setBusy(false)
    }
  }
  const update = (name: string, value: string) => setForm(current => ({ ...current, [name]: value }))
  return <main className="container-page py-10"><h1 className="text-3xl font-bold">Checkout</h1>{!items.length || blocked ? <section className="mt-7 rounded-xl border border-line p-6"><h2 className="text-lg font-bold">{!items.length ? 'Your basket is empty' : 'Check your basket first'}</h2><p className="mt-3 text-gray-600">{loading ? 'Checking product availability…' : error ? 'Availability could not be checked. Please refresh your basket.' : blocked ? 'Remove unavailable products before continuing.' : 'Add a product before starting checkout.'}</p><Link to="/basket" className="btn-secondary mt-5">Back to basket</Link></section> : <div className="mt-7 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]"><form onSubmit={submit} className="space-y-7 rounded-xl border border-line p-5 sm:p-7"><section><h2 className="text-lg font-bold">Contact details</h2><p className="mt-1 text-sm text-gray-600">We’ll use these details for this order.</p><label className="mt-4 block text-sm font-semibold">Email address<input required type="email" autoComplete="email" maxLength={254} value={form.email} onChange={event => update('email', event.target.value)} className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 font-normal" /></label></section><section className="border-t border-line pt-6"><h2 className="text-lg font-bold">Delivery address</h2><p className="mb-4 mt-1 text-sm text-gray-600">Delivery is currently available within the UK.</p><CheckoutAddressFields form={form} update={update} /></section>{message && <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-900">{message}{attempt && <p className="mt-2">If this was a connection timeout, retrying will safely reuse the same checkout attempt.</p>}</div>}<button type="submit" disabled={busy || blocked} className="btn-primary w-full disabled:cursor-wait disabled:opacity-50">{busy ? 'Connecting to secure checkout…' : 'Continue to secure payment'}</button><p className="text-xs leading-5 text-gray-500">Payment is handled by Stripe Checkout. Card details are entered on Stripe, not stored by this website.</p><Link to="/basket" className="inline-block text-sm text-brand underline">Back to basket</Link></form><aside className="h-fit rounded-xl bg-sand p-6"><h2 className="font-bold">Order summary</h2><p className="mt-3 text-sm text-gray-600">{count} item{count === 1 ? '' : 's'} in basket</p><div className="mt-5 flex justify-between font-bold"><span>Subtotal</span><span>£{total.toFixed(2)}</span></div><p className="mt-3 text-sm text-gray-600">Delivery is calculated by the server from your postcode. Final totals are confirmed before payment.</p></aside></div>}</main>
}

function CheckoutAddressFields({ form, update }: { form: Record<string, string>; update: (name: string, value: string) => void }) {
  const fields = [
    ['recipientName', 'Full name', 'name'], ['line1', 'Address line 1', 'address-line1'], ['line2', 'Address line 2 (optional)', 'address-line2'],
    ['city', 'Town or city', 'address-level2'], ['county', 'County (optional)', 'address-level1'], ['postcode', 'Postcode', 'postal-code'], ['phone', 'Phone number', 'tel'],
  ]
  return <div className="grid gap-4 sm:grid-cols-2">{fields.map(([key, label, autocomplete]) => <label key={key} className={`block text-sm font-semibold ${key === 'line1' || key === 'line2' ? 'sm:col-span-2' : ''}`}>{label}<input required={!['line2', 'county'].includes(key)} autoComplete={autocomplete} maxLength={key === 'phone' ? 40 : 200} value={form[key] ?? ''} onChange={event => update(key, event.target.value)} className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 font-normal" /></label>)}</div>
}

export function CheckoutReturnPage({ cancelled = false }: { cancelled?: boolean }) {
  const [search] = useSearchParams()
  const orderNumber = search.get('orderNumber') ?? ''
  const { removePurchased } = useCart()
  const [order, setOrder] = useState<CustomerOrder | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [poll, setPoll] = useState(0)
  const token = orderNumber ? sessionStorage.getItem(`mypetfood-order-token:${orderNumber}`) : null
  useEffect(() => {
    if (!orderNumber) { setError('We could not identify this order. Check your order link or contact us.'); setLoading(false); return }
    let active = true
    let timer: number | undefined
    void getCustomerOrder(orderNumber, token).then(value => {
      if (!active) return
      setOrder(value); setError('')
      if (value.paymentStatus === 'paid' || value.orderStatus === 'confirmed') {
        try {
          const purchased = JSON.parse(sessionStorage.getItem(`mypetfood-order-items:${orderNumber}`) ?? '[]') as Array<{ productId: string; quantity: number }>
          if (purchased.length) removePurchased(purchased)
          sessionStorage.removeItem(`mypetfood-order-items:${orderNumber}`)
        } catch { /* Keep the receipt visible even if browser storage was cleared. */ }
      } else if (!['cancelled', 'failed'].includes(value.orderStatus.toLowerCase()) && !['failed', 'cancelled'].includes(value.paymentStatus.toLowerCase()) && poll < 60) {
        timer = window.setTimeout(() => setPoll(previous => previous + 1), 2500)
      }
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Order status could not be loaded.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false; if (timer) window.clearTimeout(timer) }
  }, [orderNumber, poll, removePurchased, token])
  const paid = order?.paymentStatus?.toLowerCase() === 'paid' || order?.orderStatus?.toLowerCase() === 'confirmed'
  const terminal = order && ['cancelled', 'failed'].includes(order.orderStatus.toLowerCase())
  return <main className="container-page py-12"><section className="mx-auto max-w-3xl rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-10">
    <p className="text-sm font-bold uppercase tracking-wide text-brand">{cancelled ? 'Checkout return' : 'Order update'}</p>
    <h1 className="mt-2 text-3xl font-bold">{paid ? 'Thank you for your order' : terminal ? 'Payment was not completed' : 'Checking your order status'}</h1>
    {orderNumber && <p className="mt-3 text-sm text-gray-600">Order reference: <span className="font-semibold text-gray-900">{orderNumber}</span></p>}
    {loading && <p role="status" className="mt-6">Connecting securely to the order service…</p>}
    {error && <div role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-900">{error}</div>}
    {order && <>
      <p role="status" className="mt-5 leading-7 text-gray-700">{paid ? 'Your payment is confirmed by the payment service.' : terminal ? 'No payment was confirmed. Your basket has been kept, so you can review it and try again.' : poll >= 60 ? 'Payment can take a little time to confirm. This page does not treat the redirect as proof of payment; refresh to check again.' : 'We are waiting for the payment provider to confirm this order. This page will update automatically.'}</p>
      <div className="mt-6 divide-y divide-line rounded-xl border border-line px-4">{order.items.map((item, index) => <div key={`${item.sku}-${index}`} className="flex justify-between gap-4 py-3 text-sm"><span>{item.name} × {item.quantity}</span><span className="font-semibold">{money(item.lineTotalPence)}</span></div>)}<div className="flex justify-between py-4 font-bold"><span>Order total</span><span>{money(order.totalPence)}</span></div></div>
    </>}
    <div className="mt-7 flex flex-wrap gap-3"><Link to={paid ? '/shop' : '/basket'} className="btn-primary">{paid ? 'Continue shopping' : 'Return to basket'}</Link>{poll >= 60 && <button className="btn-secondary" onClick={() => { setLoading(true); setPoll(value => value + 1) }}>Check status again</button>}<Link to="/contact" className="btn-secondary">Contact us</Link></div>
  </section></main>
}
