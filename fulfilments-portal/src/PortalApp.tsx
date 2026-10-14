import { Activity, AlertTriangle, Archive, ArrowDownToLine, ArrowLeft, Box, Check, ClipboardList, Clock3, LayoutDashboard, Menu, PackageCheck, Printer, RefreshCw, Search, Settings, ShieldCheck, Truck, X } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, NavLink, Route, Routes, useParams } from 'react-router-dom'
import { createFulfilmentsApi, PortalApiError, type FulfilmentsApi } from './api'
import type { DashboardStats, FulfilmentOrder, FulfilmentStatus, OrderAction, OrderFilters, PortalPreferences } from './types'

const date = (value: string) => new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
const statusLabel = (value: string) => value.replaceAll('_', ' ')
const statuses: FulfilmentStatus[] = ['pending', 'ready_to_pack', 'packed', 'label_created', 'dispatched', 'in_transit', 'delivered', 'on_hold', 'cancelled']

function StatePanel({ title, children, error, action }: { title: string; children: ReactNode; error?: boolean; action?: ReactNode }) {
  return <section className={`state-panel ${error ? 'state-error' : ''}`} role={error ? 'alert' : 'status'}><h2>{title}</h2><p>{children}</p>{action}</section>
}

export function PortalApp() {
  const [api, setApi] = useState<FulfilmentsApi | null>(null)
  const [access, setAccess] = useState<'checking' | 'allowed' | 'denied' | 'error'>('checking')
  const [gateError, setGateError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    setAccess('checking')
    void createFulfilmentsApi().then(client => {
      if (!active) return
      setApi(client)
      return client.checkAccess().then(result => {
        if (active) setAccess(result.authorised ? 'allowed' : 'denied')
      })
    }).catch(cause => {
      if (!active) return
      setGateError(cause instanceof Error ? cause.message : 'Access could not be checked.')
      setAccess(cause instanceof PortalApiError && cause.status === 403 ? 'denied' : 'error')
    })
    return () => { active = false }
  }, [reload])

  if (access === 'checking') return <div className="fulfilments-portal"><main className="gate"><div className="gate-card"><div className="brand-mark">MP</div><p role="status">Checking secure staff access…</p></div></main></div>
  if (access === 'denied') return <div className="fulfilments-portal"><main className="gate"><div className="gate-card"><ShieldCheck size={32} /><h1>Access denied</h1><p>Your account does not have permission to use the fulfilments portal.</p></div></main></div>
  if (access === 'error' || !api) return <div className="fulfilments-portal"><main className="gate"><div className="gate-card"><AlertTriangle size={32} /><h1>Fulfilments sign-in unavailable</h1><p>{gateError || 'The secure sign-in integration is not configured. No order data has been loaded.'}</p><button className="button secondary" onClick={() => setReload(value => value + 1)}><RefreshCw size={16} /> Try again</button></div></main></div>
  return <PortalShell api={api} />
}

function PortalShell({ api }: { api: FulfilmentsApi }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const isMock = import.meta.env.DEV && import.meta.env.VITE_FULFILMENTS_USE_MOCKS === 'true'
  const links = [
    { to: '/admin/fulfilments', name: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/fulfilments/orders', name: 'Orders', icon: ClipboardList },
    { to: '/admin/fulfilments/labels', name: 'Shipping labels', icon: Printer },
    { to: '/admin/fulfilments/settings', name: 'Settings', icon: Settings },
  ]
  const navigation = <nav aria-label="Fulfilments navigation" className="side-links">{links.map(({ to, name, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => setMobileOpen(false)}><Icon size={19} /><span>{name}</span></NavLink>)}</nav>
  return <div className="fulfilments-portal"><div className="portal-layout">
    <aside className="sidebar"><a className="portal-brand" href="/admin/fulfilments"><span className="brand-mark">MP</span><span><b>MyPetFoods</b><small>Fulfilments</small></span></a>{navigation}<div className="sidebar-bottom"><ShieldCheck size={16} /> Staff workspace</div></aside>
    <div className="portal-main"><header className="topbar"><button className="icon-button mobile-menu" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMobileOpen(value => !value)}>{mobileOpen ? <X /> : <Menu />}</button><div><p className="eyebrow">Operations</p><h1>Fulfilments</h1></div><span className="secure-chip"><span /> Secure staff portal</span></header>
      {mobileOpen && <div className="mobile-nav">{navigation}</div>}
      {isMock && <div className="mock-banner" role="status"><AlertTriangle size={18} /><span><b>DEVELOPMENT MOCK DATA</b> — orders, customers, tracking references, labels, and actions shown here are fake. No real orders are changed and no postage is purchased.</span></div>}
      {!isMock && <div className="integration-banner" role="status"><Clock3 size={18} /><span>Live orders and workflow actions are connected to the backend. Shipping label purchases need a configured carrier provider.</span></div>}
      <main className="page-content"><Routes><Route path="" element={<DashboardPage api={api} />} /><Route path="orders" element={<OrdersPage api={api} />} /><Route path="orders/:id" element={<OrderDetailPage api={api} />} /><Route path="labels" element={<LabelsPage api={api} />} /><Route path="settings" element={<SettingsPage api={api} />} /><Route path="*" element={<StatePanel title="Page not found">Choose a page from the navigation.</StatePanel>} /></Routes></main>
    </div>
  </div></div>
}

function DashboardPage({ api }: { api: FulfilmentsApi }) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [reload, setReload] = useState(0)
  useEffect(() => { let active = true; setLoading(true); setError(''); void api.dashboard().then(result => { if (active) setStats(result) }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Dashboard could not be loaded.') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [api, reload])
  if (loading) return <StatePanel title="Loading dashboard">Getting the latest fulfilment counts…</StatePanel>
  if (error) return <StatePanel title="Dashboard unavailable" error action={<button className="button secondary" onClick={() => setReload(value => value + 1)}><RefreshCw size={16} /> Retry</button>}>{error}</StatePanel>
  if (!stats) return <StatePanel title="No dashboard data">There is no fulfilment summary available.</StatePanel>
  const cards = [
    { name: 'Paid · awaiting fulfilment', value: stats.paidAwaiting, icon: Clock3, tone: 'amber' },
    { name: 'Ready to pack', value: stats.readyToPack, icon: Box, tone: 'blue' },
    { name: 'Packed', value: stats.packed, icon: PackageCheck, tone: 'violet' },
    { name: 'Labels generated', value: stats.labelsGenerated, icon: Printer, tone: 'teal' },
    { name: 'Dispatched', value: stats.dispatched, icon: Truck, tone: 'green' },
    { name: 'Delivered', value: stats.delivered, icon: Check, tone: 'green' },
    { name: 'On hold', value: stats.onHold, icon: Archive, tone: 'red' },
  ]
  return <><div className="page-heading"><div><p className="eyebrow">Today at a glance</p><h2>Fulfilment dashboard</h2><p>See what needs packing, labelling, or follow up.</p></div><button className="button secondary" onClick={() => setReload(value => value + 1)}><RefreshCw size={16} /> Refresh</button></div><div className="stats-grid">{cards.map(({ name, value, icon: Icon, tone }) => <article className="stat-card" key={name}><span className={`stat-icon ${tone}`}><Icon size={20} /></span><div><span className="stat-value">{value}</span><p>{name}</p></div></article>)}</div><section className="panel activity-panel"><div className="panel-heading"><div><Activity size={18} /><h3>Recent staff activity</h3></div><Link to="/admin/fulfilments/orders">View order queue</Link></div>{stats.recentActivity.length ? <ul className="activity-list">{stats.recentActivity.map(item => <li key={item.id}><span className="activity-dot" /><div><p><b>{item.actor}</b> · {item.action}</p><Link to={`/admin/fulfilments/orders/${encodeURIComponent(item.fulfilmentId)}`}>{item.orderNumber}</Link></div><time>{date(item.at)}</time></li>)}</ul> : <p className="empty-copy">No recent staff activity.</p>}</section></>
}

function OrdersPage({ api }: { api: FulfilmentsApi }) {
  const [filters, setFilters] = useState<OrderFilters>({ search: '', fulfilmentStatus: '', paymentStatus: '' })
  const [search, setSearch] = useState('')
  const [cursor, setCursor] = useState<string>()
  const [previous, setPrevious] = useState<Array<string | undefined>>([])
  const [orders, setOrders] = useState<FulfilmentOrder[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => { let active = true; setLoading(true); setError(''); void api.listOrders(filters, cursor).then(page => { if (active) { setOrders(page.orders); setNextCursor(page.nextCursor); setHasMore(page.hasMore) } }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Orders could not be loaded.') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [api, filters, cursor, reload])
  function submit(event: FormEvent) { event.preventDefault(); setFilters(current => ({ ...current, search: search.trim() })); setCursor(undefined); setPrevious([]) }
  function changeFilter<Key extends 'fulfilmentStatus' | 'paymentStatus'>(key: Key, value: OrderFilters[Key]) { setFilters(current => ({ ...current, [key]: value })); setCursor(undefined); setPrevious([]) }
  const moveNext = () => { if (nextCursor && hasMore) { setPrevious(current => [...current, cursor]); setCursor(nextCursor) } }
  const movePrevious = () => { const stack = [...previous]; const target = stack.pop(); setPrevious(stack); setCursor(target) }
  return <><div className="page-heading"><div><p className="eyebrow">Work queue</p><h2>Orders</h2><p>Search, filter, and open an order to review its fulfilment details.</p></div><button className="button secondary" onClick={() => setReload(value => value + 1)}><RefreshCw size={16} /> Refresh</button></div><section className="panel filters"><form onSubmit={submit}><label htmlFor="order-search">Search orders</label><div className="search-row"><Search size={17} /><input id="order-search" type="search" value={search} maxLength={100} placeholder="Order number, customer, or SKU" onChange={event => setSearch(event.target.value)} /><button className="button primary" type="submit">Search</button></div></form><label>Fulfilment status<select value={filters.fulfilmentStatus} onChange={event => changeFilter('fulfilmentStatus', event.target.value as FulfilmentStatus | '')}><option value="">All statuses</option>{statuses.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label><label>Payment<select value={filters.paymentStatus} onChange={event => changeFilter('paymentStatus', event.target.value)}><option value="">All payments</option><option value="paid">Paid</option><option value="partially_refunded">Partially refunded</option></select></label></section>{error && <StatePanel title="Orders unavailable" error action={<button className="button secondary" onClick={() => setReload(value => value + 1)}><RefreshCw size={16} /> Retry</button>}>{error}</StatePanel>}<section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>Order</th><th>Customer</th><th>Payment</th><th>Placed</th><th>Products</th><th>Delivery service</th><th>Fulfilment</th><th>Assigned to</th></tr></thead><tbody>{loading ? <tr><td colSpan={8} className="table-message">Loading order queue…</td></tr> : orders.map(order => <tr className="fulfilment-order-row" key={order.id}><td><Link className="order-link" to={`/admin/fulfilments/orders/${encodeURIComponent(order.id)}`}>{order.orderNumber}</Link></td><td>{order.customerName}<small>{order.customerEmail}</small></td><td><StatusPill value={order.paymentStatus} /></td><td>{date(order.orderDate)}</td><td>{order.productCount}</td><td>{order.deliveryService}</td><td><StatusPill value={order.fulfilmentStatus} /></td><td>{order.assignedStaff || 'Unassigned'}</td></tr>)}{!loading && !error && orders.length === 0 && <tr><td colSpan={8} className="table-message">No orders match these filters.</td></tr>}</tbody></table></div><div className="pagination"><span>{loading ? 'Loading…' : `${orders.length} order${orders.length === 1 ? '' : 's'} on this page`}</span><div><button className="button secondary" disabled={!previous.length || loading} onClick={movePrevious}>Previous</button><button className="button secondary" disabled={!hasMore || loading} onClick={moveNext}>Next</button></div></div></section></>
}

function StatusPill({ value }: { value: string }) {
  const normalized = value.toLowerCase().replaceAll('_', '-')
  const tone = ['paid', 'delivered', 'dispatched', 'packed'].includes(normalized) ? 'good' : ['on-hold', 'failed', 'cancelled'].includes(normalized) ? 'alert' : 'pending'
  return <span className={`status-pill ${tone}`}>{statusLabel(value)}</span>
}

function OrderDetailPage({ api }: { api: FulfilmentsApi }) {
  const { id = '' } = useParams()
  const [order, setOrder] = useState<FulfilmentOrder | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [reload, setReload] = useState(0)
  const isMock = import.meta.env.DEV && import.meta.env.VITE_FULFILMENTS_USE_MOCKS === 'true'
  useEffect(() => { let active = true; setLoading(true); setError(''); void api.getOrder(id).then(result => { if (active) setOrder(result) }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Order could not be loaded.') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [api, id, reload])
  async function runAction(action: OrderAction) {
    if (!order || busy) return
    const chargeable = action === 'create_label' || action === 'dispatch'
    if (chargeable && !window.confirm(action === 'create_label' ? 'Generate a shipping label? In the live portal this may purchase postage.' : 'Mark this order as dispatched? This action records handover to the carrier.')) return
    setBusy(true); setError(''); setNotice('')
    try { const updated = await api.performAction(order.id, action); setOrder(updated); setNotice(isMock ? 'Mock action recorded locally. No real order or shipping provider was changed.' : 'Fulfilment action completed.'); if (!isMock) setReload(value => value + 1) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The action could not be completed.') }
    finally { setBusy(false) }
  }
  if (loading) return <StatePanel title="Loading order">Retrieving order and fulfilment details…</StatePanel>
  if (error && !order) return <StatePanel title="Order unavailable" error action={<button className="button secondary" onClick={() => setReload(value => value + 1)}><RefreshCw size={16} /> Retry</button>}>{error}</StatePanel>
  if (!order) return <StatePanel title="Order not found">This order is not available.</StatePanel>
  const actions: Record<OrderAction, { title: string; icon: typeof Box }> = { confirm_packed: { title: 'Confirm packed', icon: PackageCheck }, create_label: { title: 'Generate shipping label', icon: Printer }, dispatch: { title: 'Mark as dispatched', icon: Truck }, refresh_tracking: { title: 'Refresh tracking', icon: RefreshCw }, place_on_hold: { title: 'Place on hold', icon: Archive } }
  return <><Link to="/admin/fulfilments/orders" className="back-link"><ArrowLeft size={16} /> Back to orders</Link><div className="page-heading detail-heading"><div><p className="eyebrow">Order details</p><h2>{order.orderNumber}</h2><p>Placed {date(order.orderDate)}</p></div><StatusPill value={order.fulfilmentStatus} /></div>{error && <StatePanel title="Action failed" error>{error}</StatePanel>}{notice && <div className="notice" role="status"><Check size={17} />{notice}</div>}<div className="detail-grid"><div className="detail-main"><section className="panel"><div className="panel-heading"><div><PackageCheck size={18} /><h3>Products</h3></div><span>{order.productCount} item{order.productCount === 1 ? '' : 's'}</span></div><div className="product-lines">{order.lines.map((line, index) => <article className="product-line" key={`${line.sku}-${index}`}>{line.imageUrl ? <img src={line.imageUrl} alt="" /> : <span className="product-placeholder"><Box size={20} /></span>}<div><b>{line.name}</b><small>SKU {line.sku}</small></div><strong>× {line.quantity}</strong></article>)}</div></section><section className="panel"><div className="panel-heading"><div><Activity size={18} /><h3>Fulfilment history</h3></div></div>{order.history.length ? <ol className="history-list">{order.history.map((event, index) => <li key={`${event.at}-${index}`}><span className="history-marker" /><div><b>{event.action}</b><small>{event.actor} · {date(event.at)}</small>{event.note && <p>{event.note}</p>}</div></li>)}</ol> : <p className="empty-copy">No fulfilment activity recorded.</p>}</section></div><aside className="detail-side"><section className="panel"><div className="panel-heading"><div><Truck size={18} /><h3>Delivery</h3></div></div><address>{order.deliveryAddress.recipientName}<br />{order.deliveryAddress.line1}{order.deliveryAddress.line2 && <><br />{order.deliveryAddress.line2}</>}<br />{order.deliveryAddress.city}<br />{order.deliveryAddress.postcode}</address>{order.deliveryAddress.phone && <p className="side-meta">{order.deliveryAddress.phone}</p>}<dl className="side-details"><dt>Service</dt><dd>{order.deliveryService}</dd><dt>Assigned to</dt><dd>{order.assignedStaff || 'Unassigned'}</dd><dt>Payment</dt><dd><StatusPill value={order.paymentStatus} /></dd></dl></section><section className="panel"><div className="panel-heading"><div><Truck size={18} /><h3>Shipping &amp; tracking</h3></div></div>{order.shipping ? <><p><b>{order.shipping.carrier}</b> · {order.shipping.service}</p><p className="side-meta">Label: {order.shipping.labelStatus}</p>{order.shipping.trackingNumber && <p className="side-meta">Tracking: {order.shipping.trackingNumber}</p>}{order.shipping.trackingUrl && order.shipping.trackingUrl !== '#' && <a className="text-link" href={order.shipping.trackingUrl} target="_blank" rel="noreferrer">View tracking</a>}{order.shipping.labelStatus.toLowerCase().includes('label') && <button className="button secondary full-width" disabled={busy} onClick={() => void api.downloadLabel(order.id).then(blob => { const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${order.orderNumber}-label.pdf`; anchor.click(); URL.revokeObjectURL(url) }).catch(cause => setError(cause instanceof Error ? cause.message : 'Label download failed.'))}><ArrowDownToLine size={16} /> Download / print label</button>}</> : <p className="empty-copy">No shipping label has been generated.</p>}</section><section className="panel action-panel"><div className="panel-heading"><div><ClipboardList size={18} /><h3>Available actions</h3></div></div>{order.allowedActions.length ? <div className="action-list">{order.allowedActions.map(action => { const { title, icon: Icon } = actions[action]; return <button key={action} className={action === 'create_label' || action === 'dispatch' ? 'button primary full-width' : 'button secondary full-width'} disabled={busy} onClick={() => void runAction(action)}>{busy ? <RefreshCw size={16} className="spin" /> : <Icon size={16} />}{busy ? 'Processing…' : title}</button> })}</div> : <p className="empty-copy">No actions are available for this fulfilment state.</p>}{busy && <span className="sr-only" role="status">Processing fulfilment action…</span>}</section></aside></div></>
}

function LabelsPage({ api }: { api: FulfilmentsApi }) {
  const [labels, setLabels] = useState<Awaited<ReturnType<FulfilmentsApi['labels']>>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => { let active = true; setLoading(true); setError(''); void api.labels().then(result => { if (active) setLabels(result) }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Labels could not be loaded.') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [api, reload])
  return <><div className="page-heading"><div><p className="eyebrow">Carrier documents</p><h2>Shipping labels</h2><p>Review labels and tracking references for fulfilled orders.</p></div><button className="button secondary" onClick={() => setReload(value => value + 1)}><RefreshCw size={16} /> Refresh</button></div>{error && <StatePanel title="Labels unavailable" error action={<button className="button secondary" onClick={() => setReload(value => value + 1)}>Retry</button>}>{error}</StatePanel>}<section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>Order</th><th>Customer</th><th>Carrier</th><th>Service</th><th>Label status</th><th>Tracking number</th><th>Created</th><th /></tr></thead><tbody>{loading ? <tr><td colSpan={8} className="table-message">Loading labels…</td></tr> : labels.map(label => <tr key={label.orderNumber}><td>{label.orderNumber}</td><td>{label.customerName}</td><td>{label.carrier}</td><td>{label.service}</td><td><StatusPill value={label.labelStatus} /></td><td>{label.trackingNumber || '—'}</td><td>{date(label.createdAt)}</td><td><button className="button small secondary" disabled title="Secure label delivery will be connected to the backend contract"><ArrowDownToLine size={15} /> Download</button></td></tr>)}{!loading && !error && labels.length === 0 && <tr><td colSpan={8} className="table-message">No labels have been generated.</td></tr>}</tbody></table></div>{!loading && labels.length > 0 && <p className="table-footnote">Bulk label purchasing is not enabled. Labels will be securely served by the backend when integration is configured.</p>}</section></>
}

function SettingsPage({ api }: { api: FulfilmentsApi }) {
  const [value, setValue] = useState<PortalPreferences>({ printerFormat: 'A6', compactRows: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => { let active = true; void api.preferences().then(result => { if (active) setValue(result) }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Preferences could not be loaded.') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [api])
  async function save(event: FormEvent) { event.preventDefault(); if (saving) return; setSaving(true); setError(''); setNotice(''); try { const result = await api.savePreferences(value); setValue(result); setNotice('Preferences saved.') } catch (cause) { setError(cause instanceof Error ? cause.message : 'Preferences could not be saved.') } finally { setSaving(false) } }
  return <><div className="page-heading"><div><p className="eyebrow">Workspace</p><h2>Settings</h2><p>Configure staff display preferences.</p></div></div>{loading ? <StatePanel title="Loading settings">Retrieving workspace preferences…</StatePanel> : <form className="panel settings-form" onSubmit={save}><h3>Printing &amp; display</h3><p className="empty-copy">These development settings stay in the mock adapter until a backend settings contract is provided.</p><label>Preferred label format<select value={value.printerFormat} onChange={event => setValue(current => ({ ...current, printerFormat: event.target.value as PortalPreferences['printerFormat'] }))}><option value="A6">A6 · Thermal label printer</option><option value="A4">A4 · Standard printer</option></select></label><label className="check-setting"><input type="checkbox" checked={value.compactRows} onChange={event => setValue(current => ({ ...current, compactRows: event.target.checked }))} /><span>Use compact order rows</span></label>{error && <p role="alert" className="error-copy">{error}</p>}{notice && <p role="status" className="success-copy">{notice}</p>}<button className="button primary" disabled={saving}>{saving ? 'Saving…' : 'Save preferences'}</button></form>}</>
}
