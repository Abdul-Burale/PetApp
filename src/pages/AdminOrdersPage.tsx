import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getStaffOrder, listStaffOrders, type StaffFulfilmentStatus, type StaffOrderDetail, type StaffOrderPage, type StaffOrderStatus, type StaffOrderSummary, type StaffPaymentStatus } from '../lib/api'

const orderStatuses: StaffOrderStatus[] = ['pending_payment', 'confirmed', 'cancelled', 'completed']
const paymentStatuses: StaffPaymentStatus[] = ['pending', 'paid', 'failed', 'partially_refunded', 'refunded', 'disputed']
const fulfilmentStatuses: StaffFulfilmentStatus[] = ['unfulfilled', 'fulfilment_pending', 'partially_dispatched', 'dispatched', 'delivered']
const money = (pence: number, currency = 'GBP') => new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(pence / 100)
const label = (status: string) => status.replaceAll('_', ' ')
const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

function Status({ children }: { children: string }) {
  return <span className="inline-flex rounded-full bg-sand px-2.5 py-1 text-[11px] font-semibold capitalize text-gray-700">{label(children)}</span>
}

function FilterSelect<T extends string>({ id, title, value, values, onChange }: { id: string; title: string; value: T | ''; values: T[]; onChange: (value: T | '') => void }) {
  return <label htmlFor={id} className="block text-xs font-semibold text-gray-700">{title}<select id={id} value={value} onChange={event => onChange(event.target.value as T | '')} className="mt-1 block w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm capitalize"><option value="">All {title.toLowerCase().replace('status', 'statuses')}</option>{values.map(value => <option key={value} value={value} className="capitalize">{label(value)}</option>)}</select></label>
}

export function AdminOrdersPage() {
  const [filters, setFilters] = useState<{ search: string; orderStatus: StaffOrderStatus | ''; paymentStatus: StaffPaymentStatus | ''; fulfilmentStatus: StaffFulfilmentStatus | '' }>({ search: '', orderStatus: '', paymentStatus: '', fulfilmentStatus: '' })
  const [searchInput, setSearchInput] = useState('')
  const [cursor, setCursor] = useState<string>()
  const [previousCursors, setPreviousCursors] = useState<Array<string | undefined>>([])
  const [page, setPage] = useState<StaffOrderPage | null>(null)
  const [selectedOrderNumber, setSelectedOrderNumber] = useState('')
  const [detail, setDetail] = useState<StaffOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [detailError, setDetailError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    void listStaffOrders({ ...filters, limit: 25, cursor }).then(result => {
      if (!active) return
      setPage(result)
      setSelectedOrderNumber(current => result.data.some(order => order.orderNumber === current) ? current : result.data[0]?.orderNumber ?? '')
    }).catch(cause => {
      if (active) setError(cause instanceof Error ? cause.message : 'Orders could not be loaded.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filters, cursor])

  useEffect(() => {
    if (!selectedOrderNumber) { setDetail(null); setDetailError(''); return }
    let active = true
    setDetailLoading(true)
    setDetailError('')
    void getStaffOrder(selectedOrderNumber).then(result => { if (active) setDetail(result) }).catch(cause => {
      if (active) setDetailError(cause instanceof Error ? cause.message : 'Order details could not be loaded.')
    }).finally(() => { if (active) setDetailLoading(false) })
    return () => { active = false }
  }, [selectedOrderNumber])

  function resetPaging() {
    setCursor(undefined)
    setPreviousCursors([])
  }
  function applySearch(event: FormEvent) {
    event.preventDefault()
    setFilters(current => ({ ...current, search: searchInput.trim() }))
    resetPaging()
  }
  function updateFilter<Key extends 'orderStatus' | 'paymentStatus' | 'fulfilmentStatus'>(key: Key, value: typeof filters[Key]) {
    setFilters(current => ({ ...current, [key]: value }))
    resetPaging()
  }
  function nextPage() {
    if (!page?.hasMore || !page.nextCursor) return
    setPreviousCursors(current => [...current, cursor])
    setCursor(page.nextCursor)
  }
  function previousPage() {
    if (!previousCursors.length) return
    const previous = [...previousCursors]
    const target = previous.pop()
    setPreviousCursors(previous)
    setCursor(target)
  }

  return <main className="container-page py-8 sm:py-12"><div className="mx-auto max-w-7xl">
    <p className="text-sm text-gray-500"><Link to="/account">Account</Link> / Admin tools / Commerce</p>
    <header className="mt-3 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-accent">Commerce</p><h1 className="mt-1 text-3xl font-bold">Orders &amp; payments</h1><p className="mt-2 text-sm text-gray-600">Review customer orders, payment status, and fulfilment details.</p></div><Link to="/account" className="btn-secondary">Back to account</Link></header>
    <section aria-label="Order filters" className="mt-6 rounded-xl border border-line bg-white p-4 sm:p-5">
      <form onSubmit={applySearch} className="flex flex-col gap-3 sm:flex-row sm:items-end"><label htmlFor="order-search" className="flex-1 text-xs font-semibold text-gray-700">Search by order number or customer email<input id="order-search" type="search" maxLength={254} value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="e.g. MPF-2026-ABC123 or buyer@example.com" className="mt-1 block w-full rounded-lg border border-line px-3 py-2.5 text-sm" /></label><button type="submit" className="btn-primary">Search orders</button></form>
      <div className="mt-4 grid gap-3 sm:grid-cols-3"><FilterSelect id="order-status-filter" title="Order status" value={filters.orderStatus} values={orderStatuses} onChange={value => updateFilter('orderStatus', value)} /><FilterSelect id="payment-status-filter" title="Payment status" value={filters.paymentStatus} values={paymentStatuses} onChange={value => updateFilter('paymentStatus', value)} /><FilterSelect id="fulfilment-status-filter" title="Fulfilment status" value={filters.fulfilmentStatus} values={fulfilmentStatuses} onChange={value => updateFilter('fulfilmentStatus', value)} /></div>
    </section>
    {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-900">{error}</p>}
    <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(300px,.9fr)_minmax(0,1.6fr)]">
      <section className="rounded-xl border border-line bg-white p-4" aria-label="Orders">
        <div className="flex items-center justify-between gap-2"><h2 className="font-bold">Order list</h2><span className="text-xs text-gray-500">Latest first · 25 per page</span></div>
        {loading && <p role="status" className="mt-4 text-sm text-gray-500">Loading orders…</p>}
        {!loading && page?.data.length === 0 && <p className="mt-4 rounded-lg bg-sand/60 p-3 text-sm text-gray-600">No orders match these filters.</p>}
        <ul className="mt-3 space-y-2">{page?.data.map(order => <li key={order.orderNumber}><button type="button" aria-current={selectedOrderNumber === order.orderNumber ? 'true' : undefined} onClick={() => setSelectedOrderNumber(order.orderNumber)} className={`w-full rounded-lg border p-3 text-left transition ${selectedOrderNumber === order.orderNumber ? 'border-brand bg-sand/60' : 'border-line hover:bg-sand/30'}`}><span className="flex flex-wrap items-start justify-between gap-2"><span className="font-bold">{order.orderNumber}</span><span className="text-sm font-bold">{money(order.totalPence, order.currency)}</span></span><span className="mt-1 block break-all text-sm text-gray-700">{order.customerEmail}</span><span className="mt-2 flex flex-wrap gap-1.5"><Status>{order.paymentStatus}</Status><Status>{order.fulfilmentStatus}</Status></span><span className="mt-2 block text-xs text-gray-500">{dateLabel(order.createdAt)} · {order.items.reduce((sum, item) => sum + item.quantity, 0)} item(s)</span></button></li>)}</ul>
        <div className="mt-4 flex items-center justify-between border-t border-line pt-4"><button type="button" className="btn-secondary px-3 py-2 text-sm" disabled={!previousCursors.length || loading} onClick={previousPage}>Previous</button><button type="button" className="btn-secondary px-3 py-2 text-sm" disabled={!page?.hasMore || loading} onClick={nextPage}>Next</button></div>
      </section>
      <section className="min-h-80 rounded-xl border border-line bg-white p-5 sm:p-7" aria-label="Selected order details">
        {detailLoading && <p role="status" className="text-sm text-gray-600">Loading order details…</p>}
        {detailError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{detailError}</p>}
        {!selectedOrderNumber && !loading && <p className="text-sm text-gray-600">Select an order to inspect its details.</p>}
        {detail && <>
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4"><div><p className="text-xs font-bold uppercase tracking-wider text-accent">Order details</p><h2 className="mt-1 text-xl font-bold">{detail.orderNumber}</h2><p className="mt-1 text-sm text-gray-600">Placed {dateLabel(detail.createdAt)}</p></div><strong className="text-xl">{money(detail.totalPence, detail.currency)}</strong></header>
          <div className="mt-4 flex flex-wrap gap-2"><Status>{detail.orderStatus}</Status><Status>{detail.paymentStatus}</Status><Status>{detail.fulfilmentStatus}</Status></div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2"><section><h3 className="text-sm font-bold">Customer</h3><p className="mt-2 text-sm">{detail.customerName || 'Name not provided'}</p><a className="mt-1 inline-block break-all text-sm text-brand underline" href={`mailto:${detail.customerEmail}`}>{detail.customerEmail}</a>{detail.customerPhone && <p className="mt-1 text-sm text-gray-600">{detail.customerPhone}</p>}</section><section><h3 className="text-sm font-bold">Deliver to</h3>{detail.shippingAddress ? <address className="mt-2 not-italic text-sm leading-6 text-gray-700">{detail.shippingAddress.recipientName && <>{detail.shippingAddress.recipientName}<br /></>}{detail.shippingAddress.line1 && <>{detail.shippingAddress.line1}<br /></>}{detail.shippingAddress.line2 && <>{detail.shippingAddress.line2}<br /></>}{[detail.shippingAddress.city, detail.shippingAddress.county].filter(Boolean).join(', ')}{(detail.shippingAddress.city || detail.shippingAddress.county) && <br />}{detail.shippingAddress.postcode}{detail.shippingAddress.countryCode && <><br />{detail.shippingAddress.countryCode}</>}</address> : <p className="mt-2 text-sm text-gray-500">No shipping address on this order.</p>}{detail.shippingAddress?.phone && <p className="mt-1 text-xs text-gray-600">Phone: {detail.shippingAddress.phone}</p>}</section></div>
          <section className="mt-6"><h3 className="text-sm font-bold">Order items</h3><div className="mt-2 overflow-x-auto rounded-lg border border-line"><table className="w-full min-w-[480px] text-left text-sm"><thead className="bg-sand/70 text-xs text-gray-600"><tr><th className="px-3 py-2.5">Product</th><th className="px-3 py-2.5">Qty</th><th className="px-3 py-2.5">Each</th><th className="px-3 py-2.5 text-right">Line total</th></tr></thead><tbody className="divide-y divide-line">{detail.items.map((item, index) => <tr key={`${item.sku}-${index}`}><td className="px-3 py-3"><span className="block font-semibold">{item.productName}</span><span className="text-xs text-gray-500">{item.sku}</span></td><td className="px-3 py-3">{item.quantity}</td><td className="px-3 py-3">{money(item.unitPricePence, detail.currency)}</td><td className="px-3 py-3 text-right font-semibold">{money(item.lineTotalPence, detail.currency)}</td></tr>)}</tbody></table></div></section>
          <section className="mt-5 ml-auto max-w-sm space-y-2 border-t border-line pt-4 text-sm"><div className="flex justify-between"><span>Items</span><span>{money(detail.itemSubtotalPence, detail.currency)}</span></div><div className="flex justify-between"><span>Delivery</span><span>{money(detail.deliveryPence, detail.currency)}</span></div><div className="flex justify-between"><span>Tax</span><span>{money(detail.taxPence, detail.currency)}</span></div><div className="flex justify-between border-t border-line pt-2 font-bold"><span>Total</span><span>{money(detail.totalPence, detail.currency)}</span></div></section>
          <section className="mt-6 border-t border-line pt-4"><h3 className="text-sm font-bold">Payment references</h3><dl className="mt-2 grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2"><dt className="text-gray-500">Provider</dt><dd className="break-all">{detail.paymentProvider || '—'}</dd><dt className="text-gray-500">Checkout session</dt><dd className="break-all">{detail.stripeCheckoutSessionId || '—'}</dd><dt className="text-gray-500">Payment intent</dt><dd className="break-all">{detail.stripePaymentIntentId || '—'}</dd><dt className="text-gray-500">Payment updated</dt><dd>{dateLabel(detail.paymentUpdatedAt)}</dd><dt className="text-gray-500">Paid at</dt><dd>{dateLabel(detail.paidAt)}</dd><dt className="text-gray-500">Fulfilment option</dt><dd>{detail.deliveryOptionCode || '—'}</dd></dl></section>
        </>}
      </section>
    </div>
  </div></main>
}
