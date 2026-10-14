import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useCatalog } from '../context/CatalogContext'
import { useAuth } from '../context/AuthContext'
import { BasketItem } from '../components/shop/BasketItem'
import { ProductImage } from '../components/shop/ProductImage'
import { BackendApiError, createAddress, createCheckoutSession, getCustomerOrder, getDeliveryQuotes, listAddresses, type BackendAddress, type CheckoutRequest, type CustomerOrder, type DeliveryQuote } from '../lib/api'

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

const normaliseUkPostcode = (value: string) => {
  const compact = value.toUpperCase().replace(/\s+/g, '')
  return /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(compact) ? `${compact.slice(0, -3)} ${compact.slice(-3)}` : ''
}
const ukPhoneDigits = (value: string) => {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('0044')) digits = digits.slice(4)
  else if (digits.startsWith('44') && digits.length === 12) digits = digits.slice(2)
  if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1)
  return digits
}

export function CheckoutPage() {
  const { items, total, count } = useCart()
  const { loading, error } = useCatalog()
  const { session, backendAccount } = useAuth()
  const blocked = loading || Boolean(error) || items.some(item => !item.product.available || item.unavailableReason)
  const [form, setForm] = useState({ email: session?.user.email ?? '', phone: '', recipientName: '', line1: '', line2: '', city: '', county: '', postcode: '' })
  const [savedAddresses, setSavedAddresses] = useState<BackendAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState('new')
  const [addressLoading, setAddressLoading] = useState(false)
  const [saveAddress, setSaveAddress] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [attempt, setAttempt] = useState<{ key: string; body: CheckoutRequest } | null>(null)
  const [postcodeError, setPostcodeError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const basketSnapshot = useRef<Array<{ productId: string; quantity: number }>>([])
  const { removePurchased } = useCart()

  useEffect(() => {
    setForm(current => ({ ...current, email: current.email || session?.user.email || '', phone: current.phone || ukPhoneDigits(backendAccount?.phone ?? ''), recipientName: current.recipientName || [backendAccount?.firstName, backendAccount?.lastName].filter(Boolean).join(' ') }))
  }, [backendAccount?.firstName, backendAccount?.lastName, backendAccount?.phone, session?.user.email])
  useEffect(() => {
    if (!session) { setSavedAddresses([]); setSelectedAddressId('new'); return }
    let active = true
    setAddressLoading(true)
    void listAddresses().then(addresses => {
      if (!active) return
      const deliveryAddresses = addresses.filter(address => address.purpose === 'DELIVERY' || address.purpose === 'BOTH' || !address.purpose)
      setSavedAddresses(deliveryAddresses)
      const preferred = deliveryAddresses.find(address => address.isDefault) ?? deliveryAddresses[0]
      if (preferred) {
        setSelectedAddressId(preferred.id)
        setForm(current => ({ ...current, recipientName: preferred.recipientName, line1: preferred.line1, line2: preferred.line2 ?? '', city: preferred.city, county: preferred.county ?? '', postcode: preferred.postcode, phone: ukPhoneDigits(preferred.phone ?? '') }))
      }
    }).catch(() => { if (active) setSavedAddresses([]) }).finally(() => { if (active) setAddressLoading(false) })
    return () => { active = false }
  }, [session?.access_token])

  function chooseAddress(id: string) {
    setSelectedAddressId(id); setSaveAddress(false); setAttempt(null); setMessage('')
    const saved = savedAddresses.find(address => address.id === id)
    if (saved) setForm(current => ({ ...current, recipientName: saved.recipientName, line1: saved.line1, line2: saved.line2 ?? '', city: saved.city, county: saved.county ?? '', postcode: saved.postcode, phone: ukPhoneDigits(saved.phone ?? '') }))
  }
  const update = (name: string, value: string) => {
    if (attempt) { setAttempt(null); setMessage('Details changed. Submit again to start a new checkout attempt.') }
    if (['recipientName','line1','line2','city','county','postcode','phone'].includes(name) && selectedAddressId !== 'new') { setSelectedAddressId('new'); setSaveAddress(false) }
    if (name === 'phone') { const digits = ukPhoneDigits(value).slice(0, 10); setForm(current => ({ ...current, phone: digits })); setPhoneError(digits.length === 10 ? '' : 'Enter 10 digits after +44.'); return }
    if (name === 'postcode') { setForm(current => ({ ...current, postcode: value.toUpperCase() })); setPostcodeError(value.trim() && !normaliseUkPostcode(value) ? 'Enter a valid UK postcode, for example SW1A 1AA.' : ''); return }
    setForm(current => ({ ...current, [name]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || blocked || !items.length) return
    const postcode = normaliseUkPostcode(form.postcode)
    if (!postcode) { setPostcodeError('Enter a valid UK postcode, for example SW1A 1AA.'); return }
    if (form.phone.length !== 10) { setPhoneError('Enter 10 digits after +44.'); return }
    setBusy(true); setMessage('')
    try {
      let currentAttempt = attempt
      if (!currentAttempt) {
        const origin = window.location.origin
        const telephone = `+44${form.phone}`
        const shippingAddress = { recipientName: form.recipientName.trim(), line1: form.line1.trim(), line2: form.line2.trim(), city: form.city.trim(), county: form.county.trim(), postcode, countryCode: 'GB' as const, phone: telephone }
        const body: CheckoutRequest = {
          items: items.map(({ product, quantity }) => ({ productId: product.id, quantity })),
          customer: { email: form.email.trim(), phone: telephone }, shippingAddress, billingAddress: null,
          deliveryOptionCode: 'standard', successUrl: `${origin}/checkout/success/{ORDER_NUMBER}`, cancelUrl: `${origin}/checkout/cancel?order={ORDER_NUMBER}`,
        }
        currentAttempt = { key: crypto.randomUUID(), body }
        basketSnapshot.current = body.items
        if (saveAddress && session) {
          const saved = await createAddress({ label: 'Delivery', recipientName: shippingAddress.recipientName, line1: shippingAddress.line1, line2: shippingAddress.line2 || null, city: shippingAddress.city, county: shippingAddress.county || null, postcode, phone: telephone, isDefault: false, purpose: 'DELIVERY' })
          setSavedAddresses(current => [...current, saved]); setSelectedAddressId(saved.id); setSaveAddress(false)
        }
        setAttempt(currentAttempt)
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

  const requiredLabel = (label: string) => <>{label} <span aria-hidden="true" className="font-bold text-red-600">*</span></>
  return <main className="container-page py-10"><h1 className="text-3xl font-bold">Checkout</h1>{!items.length || blocked ? <section className="mt-7 rounded-xl border border-line p-6"><h2 className="text-lg font-bold">{!items.length ? 'Your basket is empty' : 'Check your basket first'}</h2><p className="mt-3 text-gray-600">{loading ? 'Checking product availability…' : error ? 'Availability could not be checked. Please refresh your basket.' : blocked ? 'Remove unavailable products before continuing.' : 'Add a product before starting checkout.'}</p><Link to="/basket" className="btn-secondary mt-5">Back to basket</Link></section> : <div className="mt-7 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]"><form onSubmit={submit} className="order-last space-y-7 rounded-xl border border-line p-5 sm:p-7 lg:order-first"><section><h2 className="text-lg font-bold">Contact details</h2><p className="mt-1 text-sm text-gray-600">We’ll use these details for this order.</p><label className="mt-4 block text-sm font-semibold">{requiredLabel('Email address')}<input required type="email" autoComplete="email" maxLength={254} value={form.email} onChange={event => update('email', event.target.value)} className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 font-normal" /></label></section><section id="checkout-delivery-address" className="border-t border-line pt-6"><h2 className="text-lg font-bold">Delivery address</h2><p className="mb-4 mt-1 text-sm text-gray-600">Delivery is currently available within the UK. Fields marked <span className="font-bold text-red-600">*</span> are required.</p>{session && <div className="mb-5"><label htmlFor="saved-delivery-address" className="block text-sm font-semibold">Use a saved delivery address</label><select id="saved-delivery-address" value={selectedAddressId} onChange={event => chooseAddress(event.target.value)} className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5"><option value="new">Enter a new delivery address</option>{savedAddresses.map(address=><option key={address.id} value={address.id}>{address.label || address.recipientName}{address.isDefault ? ' (default)' : ''} — {address.postcode}</option>)}</select>{addressLoading && <p role="status" className="mt-1 text-xs text-gray-500">Loading saved addresses…</p>}{!addressLoading && !savedAddresses.length && <p className="mt-1 text-xs text-gray-500">No saved delivery addresses yet. Add one below and choose “Save this address” to keep it for next time.</p>}</div>}<CheckoutAddressFields form={form} update={update} requiredLabel={requiredLabel} postcodeError={postcodeError} phoneError={phoneError} />{session && selectedAddressId === 'new' && <label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={saveAddress} onChange={event => setSaveAddress(event.target.checked)} className="mt-1"/><span>Save this delivery address to my account</span></label>}</section>{message && <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-900">{message}{attempt && <p className="mt-2">Retrying keeps the same checkout request and idempotency key. Edit the address to start a new attempt.</p>}</div>}<div className="space-y-3"><button type="submit" disabled={busy || blocked} className="btn-primary w-full disabled:cursor-wait disabled:opacity-50">{busy ? 'Connecting to secure checkout…' : attempt ? 'Retry secure checkout' : 'Continue to secure payment'}</button>{attempt && <button type="button" disabled={busy} onClick={() => { setAttempt(null); setMessage('A new checkout attempt will use your current details.') }} className="w-full text-sm font-semibold text-brand underline">Start a new checkout attempt</button>}</div><p className="text-xs leading-5 text-gray-500">Payment is handled by Stripe Checkout. Card details are entered on Stripe, not stored by this website.</p><Link to="/basket" className="inline-block text-sm text-brand underline">Back to basket</Link></form><aside className="order-first h-fit rounded-xl border border-line bg-sand/70 p-5 lg:sticky lg:top-6 lg:order-last"><div className="flex items-start justify-between gap-2"><div><h2 className="font-bold">Your order</h2><p className="mt-1 text-xs text-gray-600">{count} item{count === 1 ? '' : 's'}</p></div><Link to="/basket" className="text-xs font-semibold text-brand underline">Edit basket</Link></div><ul aria-label="Items in your order" className="mt-4 max-h-[min(50vh,420px)] space-y-3 overflow-y-auto divide-y divide-line">{items.map(({product,quantity})=><li key={product.id} className="flex gap-3 border-line pt-3 first:border-0 first:pt-0"><ProductImage src={product.image} alt={product.name} className="h-14 w-14 shrink-0 rounded-lg border border-line bg-white object-contain p-1"/><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-semibold leading-5">{product.name}</p><p className="mt-1 text-xs text-gray-600">Qty {quantity} · {money(Math.round(product.price*100))} each</p></div><span className="shrink-0 text-sm font-semibold">{money(Math.round(product.price*quantity*100))}</span></li>)}</ul><div className="mt-4 space-y-2 border-t border-line pt-4 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{money(Math.round(total*100))}</span></div><div className="flex justify-between text-gray-600"><span>Delivery</span><span>Calculated securely</span></div><p className="pt-1 text-xs leading-5 text-gray-500">The backend recalculates prices and delivery before payment. Stripe shows the confirmed total.</p></div><div className="mt-4 border-t border-line pt-4"><h3 className="text-sm font-bold">Delivering to</h3><p className="mt-2 text-sm font-semibold">{form.recipientName || 'Add a recipient name'}</p><p className="text-sm leading-6 text-gray-700">{form.line1 || 'Add your delivery address'}{form.line2 && <><br/>{form.line2}</>}<br/>{[form.city, form.county].filter(Boolean).join(', ')}{(form.city || form.county) && <br/>}{form.postcode || 'Add a postcode'}</p><p className="mt-1 text-xs text-gray-600">{form.phone ? `+44 ${form.phone}` : 'Add a phone number'}</p><a href="#checkout-delivery-address" className="mt-2 inline-block text-xs font-semibold text-brand underline">Review or edit address</a></div></aside></div>}</main>
}

function CheckoutAddressFields({ form, update, requiredLabel, postcodeError, phoneError }: { form: Record<string, string>; update: (name: string, value: string) => void; requiredLabel: (label: string) => ReactNode; postcodeError: string; phoneError: string }) {
  const addressFields = [
    { key: 'recipientName', label: 'Full name', autocomplete: 'name', required: true, maxLength: 120 },
    { key: 'line1', label: 'Address line 1', autocomplete: 'address-line1', required: true, maxLength: 200 },
    { key: 'line2', label: 'Address line 2', autocomplete: 'address-line2', required: false, maxLength: 200 },
    { key: 'city', label: 'Town or city', autocomplete: 'address-level2', required: true, maxLength: 100 },
    { key: 'county', label: 'County', autocomplete: 'address-level1', required: false, maxLength: 100 },
  ]
  return <div className="grid gap-4 sm:grid-cols-2">{addressFields.map(field=><label key={field.key} className={`block text-sm font-semibold ${field.key==='line1'||field.key==='line2'?'sm:col-span-2':''}`}>{field.required?requiredLabel(field.label):`${field.label} (optional)`}<input required={field.required} maxLength={field.maxLength} autoComplete={field.autocomplete} value={form[field.key]??''} onChange={event=>update(field.key,event.target.value)} className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 font-normal"/></label>)}<label className="block text-sm font-semibold">{requiredLabel('Postcode')}<input required autoComplete="postal-code" maxLength={12} value={form.postcode} onChange={event=>update('postcode',event.target.value)} aria-invalid={Boolean(postcodeError)} aria-describedby={postcodeError?'checkout-postcode-error':'checkout-postcode-help'} placeholder="e.g. SW1A 1AA" className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 uppercase font-normal"/><span id="checkout-postcode-help" className="mt-1 block text-xs font-normal text-gray-500">Enter with or without a space, for example SW1A 1AA or SW1A1AA.</span>{postcodeError&&<span id="checkout-postcode-error" role="alert" className="mt-1 block text-xs font-semibold text-red-700">{postcodeError}</span>}</label><div><label htmlFor="checkout-phone" className="block text-sm font-semibold">{requiredLabel('Phone number')}</label><div className="mt-1.5 flex overflow-hidden rounded-lg border border-line bg-white"><span className="flex items-center border-r border-line bg-gray-50 px-3 font-semibold text-gray-700">+44</span><input id="checkout-phone" required type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={form.phone} onChange={event=>update('phone',event.target.value)} aria-invalid={Boolean(phoneError)} aria-describedby={phoneError?'checkout-phone-error':'checkout-phone-help'} placeholder="7123456789" className="min-w-0 flex-1 px-3 py-2.5 outline-none"/></div><span id="checkout-phone-help" className="mt-1 block text-xs font-normal text-gray-500">Enter 10 digits after +44, without the leading 0.</span>{phoneError&&<span id="checkout-phone-error" role="alert" className="mt-1 block text-xs font-semibold text-red-700">{phoneError}</span>}</div></div>
}

export function CheckoutReturnPage({ cancelled = false }: { cancelled?: boolean }) {
  const [search] = useSearchParams()
  const { orderNumber: successOrderNumber } = useParams()
  const orderNumber = cancelled ? search.get('order') ?? '' : successOrderNumber ?? ''
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
