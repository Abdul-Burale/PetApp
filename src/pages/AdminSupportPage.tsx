import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getStaffSupportRequest, listStaffSupportRequests, replyAsStaff, updateSupportStatus, type StaffSupportDetail, type SupportStatus, type SupportSummary } from '../lib/api'

const statuses: SupportStatus[] = ['NEW','IN_PROGRESS','WAITING_ON_CUSTOMER','RESOLVED','CLOSED']
const money = (pence: number) => `£${(pence / 100).toFixed(2)}`

export function AdminSupportPage() {
  const [filter, setFilter] = useState<SupportStatus | ''>('NEW')
  const [requests, setRequests] = useState<SupportSummary[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState<StaffSupportDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [reply, setReply] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  async function refresh() {
    setLoading(true); setError('')
    try { const list = await listStaffSupportRequests(filter || undefined); setRequests(list); if (!selectedId && list[0]) setSelectedId(list[0].requestId) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The support queue could not be loaded.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void refresh() }, [filter])
  useEffect(() => {
    if (!selectedId) { setDetail(null); return }
    let active = true
    void getStaffSupportRequest(selectedId).then(value => { if (active) { setDetail(value); setError('') } }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Request details could not be loaded.') })
    return () => { active = false }
  }, [selectedId])
  async function sendReply(event: FormEvent) {
    event.preventDefault(); if (!detail) return
    setBusy(true); setError(''); setNotice('')
    try { const value = await replyAsStaff(detail.requestId, reply.trim()); setDetail(value); setReply(''); setNotice('Reply sent. The request is now waiting on the customer.'); await refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Your reply could not be sent.') }
    finally { setBusy(false) }
  }
  async function changeStatus(status: SupportStatus) {
    if (!detail || detail.status === 'CLOSED') return
    setBusy(true); setError(''); setNotice('')
    try { const value = await updateSupportStatus(detail.requestId, status); setDetail(value); setNotice(`Status changed to ${status.replaceAll('_',' ').toLowerCase()}.`); await refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The status could not be updated.') }
    finally { setBusy(false) }
  }
  const customerName = detail?.customer.firstName || detail?.customer.lastName
    ? `${detail.customer.firstName ?? ''} ${detail.customer.lastName ?? ''}`.trim()
    : detail?.customer.displayName || 'Customer'
  return <main className="container-page py-8 sm:py-12"><div className="mx-auto max-w-7xl"><p className="text-sm text-gray-500"><Link to="/account">Account</Link> / Admin tools / Commerce</p><header className="mt-3 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-accent">Commerce</p><h1 className="mt-1 text-3xl font-bold">Customer support</h1><p className="mt-2 text-sm text-gray-600">Review customer requests, reply, and keep request statuses up to date.</p></div><Link to="/account" className="btn-secondary">Back to account</Link></header>{error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-900">{error}</p>}{notice && <p role="status" className="mt-5 text-sm text-green-800">{notice}</p>}<div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(270px,.75fr)_minmax(0,1.7fr)]"><section className="rounded-xl border border-line bg-white p-4"><div className="flex items-center justify-between gap-2"><h2 className="font-bold">Request queue</h2><button onClick={() => void refresh()} className="text-sm text-brand underline">Refresh</button></div><label className="mt-4 block text-sm font-semibold">Filter by status<select value={filter} onChange={e => setFilter(e.target.value as SupportStatus|'')} className="mt-1 w-full rounded border border-line px-3 py-2">{statuses.map(status=><option key={status} value={status}>{status.replaceAll('_',' ')}</option>)}<option value="">All statuses</option></select></label>{loading && <p role="status" className="mt-4 text-sm text-gray-500">Loading queue…</p>}{!loading && !requests.length && <p className="mt-4 rounded bg-sand/60 p-3 text-sm text-gray-600">No requests in this queue.</p>}<ul className="mt-4 space-y-2">{requests.map(item=><li key={item.requestId}><button onClick={() => setSelectedId(item.requestId)} className={`w-full rounded-lg border p-3 text-left ${selectedId===item.requestId?'border-brand bg-sand/50':'border-line hover:bg-sand/30'}`}><span className="block font-semibold">{item.subject}</span><span className="mt-1 block text-xs text-gray-600">{item.orderNumber ? `${item.orderNumber} · ` : ''}{item.status.replaceAll('_',' ')} · {item.messageCount} message{item.messageCount===1?'':'s'}</span></button></li>)}</ul></section><section className="min-h-72 rounded-xl border border-line bg-white p-5 sm:p-7">{!detail ? <p className="text-sm text-gray-600">Choose a request to view its conversation.</p> : <><div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4"><div><p className="text-xs font-bold uppercase tracking-wider text-accent">{detail.status.replaceAll('_',' ')}</p><h2 className="mt-1 text-xl font-bold">{detail.subject}</h2><p className="mt-1 text-sm text-gray-600">{customerName} · <a className="text-brand underline" href={`mailto:${detail.customer.email}`}>{detail.customer.email}</a></p><p className="mt-1 text-xs text-gray-500">Request {detail.requestId}{detail.orderNumber ? ` · Order ${detail.orderNumber}` : ''}</p></div><label className="text-xs font-semibold">Update status<select disabled={busy||detail.status==='CLOSED'} value={detail.status} onChange={e => void changeStatus(e.target.value as SupportStatus)} className="mt-1 block rounded border border-line px-2 py-2 text-sm">{statuses.map(status=><option key={status} value={status}>{status.replaceAll('_',' ')}</option>)}</select></label></div>{detail.linkedOrder && <div className="mt-4 rounded-lg bg-sand/60 p-3 text-sm"><p className="font-semibold">Linked order {detail.linkedOrder.orderNumber}</p><p className="mt-1 text-gray-600">{detail.linkedOrder.orderStatus} · {detail.linkedOrder.paymentStatus} · {money(detail.linkedOrder.totalPence)}</p></div>}<div className="mt-5 space-y-3">{detail.messages.map((message,index)=><article key={`${message.createdAt}-${index}`} className={`max-w-[92%] rounded-lg p-3 text-sm leading-6 ${message.authorType==='STAFF'?'ml-auto bg-rose-50':'bg-gray-50'}`}><p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">{message.authorType==='STAFF'?'Staff':'Customer'} · {new Date(message.createdAt).toLocaleString('en-GB')}</p><p className="whitespace-pre-wrap break-words">{message.body}</p></article>)}</div>{detail.status==='CLOSED' ? <p className="mt-5 rounded bg-gray-50 p-3 text-sm text-gray-600">This request is closed; replies are disabled.</p> : <form onSubmit={sendReply} className="mt-5 border-t border-line pt-4"><label htmlFor="staff-reply" className="text-sm font-bold">Reply to customer</label><textarea id="staff-reply" required maxLength={10000} rows={4} value={reply} onChange={e => setReply(e.target.value)} className="mt-2 w-full rounded-lg border border-line px-3 py-2.5"/><button className="btn-primary mt-3" disabled={busy}>{busy?'Sending…':'Send reply'}</button></form>}</>}</section></div></div></main>
}
