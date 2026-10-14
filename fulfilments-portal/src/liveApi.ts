import { apiFetch, getMyAccount, jsonResponse } from '../../src/lib/api'
import type { BackendAccount } from '../../src/lib/api'
import { supabase } from '../../src/lib/supabase'
import type { DashboardStats, FulfilmentOrder, FulfilmentStatus, LabelRecord, OrderAction, OrderFilters, OrderPage, PortalAccess, PortalPreferences } from './types'
import { PortalApiError, type FulfilmentsApi } from './api'

type ApiItem = { name: string; sku: string; quantity: number; unitPricePence: number; lineTotalPence: number }
type ApiQueueRow = { fulfilmentId: string; orderNumber: string; orderCreatedAt: string; customerEmail: string; customerName: string | null; orderStatus: string; paymentStatus: string; fulfilmentStatus: FulfilmentStatus; currency: string; totalPence: number; shippingMethod: string; items: ApiItem[] }
type ApiPage = { data: ApiQueueRow[]; nextCursor: string | null; hasMore: boolean }
type ApiAuditEvent = { actorStaffId?: string; action: string; changes?: Record<string, unknown>; createdAt: string }
type ApiDetail = ApiQueueRow & { orderId: string; customerPhone: string | null; itemSubtotalPence: number; deliveryPence: number; taxPence: number; shippingAddress: Record<string, unknown>; parcelWeightGrams: number | null; parcelLengthMm: number | null; parcelWidthMm: number | null; parcelHeightMm: number | null; assignedStaffId: string | null; providerCode: string; providerShipmentId: string | null; labelReference: string | null; trackingNumber: string | null; trackingUrl: string | null; packedAt: string | null; dispatchedAt: string | null; deliveredAt: string | null; internalNotes: string; createdAt: string; updatedAt: string; auditEvents: ApiAuditEvent[] }
type ApiActivity = { fulfilmentId: string; orderId: string; orderNumber: string; actorStaffId: string; action: string; changes: Record<string, unknown>; createdAt: string }
type ApiStats = { pending: number; readyToPack: number; packed: number; labelCreated: number; dispatched: number; inTransit: number; delivered: number; cancelled: number; onHold: number }
type ApiTracking = { providerCode: string; trackingNumber: string | null; trackingUrl: string | null; providerStatus: string; fulfilmentStatus: FulfilmentStatus; updatedAt: string }
type ApiLabelCreated = { fulfilmentId: string; providerCode: string; providerShipmentId: string | null; labelReference: string | null; trackingNumber: string | null; trackingUrl: string | null; fulfilmentStatus: FulfilmentStatus }

const statusList: FulfilmentStatus[] = ['pending', 'ready_to_pack', 'packed', 'label_created', 'dispatched', 'in_transit', 'delivered', 'cancelled', 'on_hold']
const prefsKey = 'mypetfoods.fulfilments.preferences'
const idempotencyKey = (id: string) => `mypetfoods.fulfilments.label-key.${id}`
let permissions: string[] = []

function requirePermission(permission: string) {
  if (!permissions.includes(permission)) throw new PortalApiError('You do not have permission to perform this action.', 403, 'FORBIDDEN')
}

function toOrder(row: ApiQueueRow | ApiDetail, account?: BackendAccount): FulfilmentOrder {
  const detail = row as ApiDetail
  const address = 'shippingAddress' in row && row.shippingAddress ? row.shippingAddress : {}
  const name = row.customerName || String(address.recipientName ?? '') || 'Customer'
  const lines = row.items.map(item => ({ name: item.name, sku: item.sku, quantity: item.quantity }))
  const history = (detail.auditEvents ?? []).map(event => ({ action: event.action, actor: event.actorStaffId ? `Staff ${event.actorStaffId.slice(0, 8)}` : 'Staff', at: event.createdAt }))
  const allowedActions: OrderAction[] = []
  if (row.fulfilmentStatus === 'ready_to_pack' && permissions.includes('fulfilments:manage')) allowedActions.push('confirm_packed')
  if (['ready_to_pack', 'packed', 'label_created'].includes(row.fulfilmentStatus) && permissions.includes('fulfilments:manage')) allowedActions.push('place_on_hold')
  if (row.fulfilmentStatus === 'packed' && permissions.includes('fulfilments:labels:create')) allowedActions.push('create_label')
  if (['packed', 'label_created'].includes(row.fulfilmentStatus) && permissions.includes('fulfilments:dispatch')) allowedActions.push('dispatch')
  if (['dispatched', 'in_transit'].includes(row.fulfilmentStatus) && permissions.includes('fulfilments:dispatch')) allowedActions.push('refresh_tracking')
  const staffId = detail.assignedStaffId
  return {
    id: row.fulfilmentId,
    orderNumber: row.orderNumber,
    customerName: name,
    customerEmail: row.customerEmail,
    customerPhone: detail.customerPhone,
    paymentStatus: row.paymentStatus,
    orderDate: row.orderCreatedAt,
    productCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
    fulfilmentStatus: row.fulfilmentStatus,
    deliveryService: row.shippingMethod,
    assignedStaff: staffId ? (staffId === account?.id ? 'You' : `Staff ${staffId.slice(0, 8)}`) : null,
    deliveryAddress: {
      recipientName: String(address.recipientName ?? name), line1: String(address.line1 ?? ''), line2: String(address.line2 ?? ''),
      city: String(address.city ?? ''), postcode: String(address.postcode ?? ''), phone: detail.customerPhone ?? undefined,
    },
    lines,
    history,
    shipping: detail.labelReference ? {
      carrier: detail.providerCode, service: row.shippingMethod, trackingNumber: detail.trackingNumber ?? undefined,
      trackingUrl: detail.trackingUrl ?? undefined, labelStatus: 'Label created',
    } : undefined,
    allowedActions,
  }
}

async function getJson<T>(path: string, fallback: string, init?: RequestInit): Promise<T> {
  try { return await jsonResponse<T>(await apiFetch(path, init), fallback) }
  catch (error) {
    if (error instanceof Error && 'status' in error && (error as { status?: number }).status === 401) {
      await supabase?.auth.signOut()
      window.location.assign(`/login?returnTo=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`)
    }
    if (error instanceof Error) throw new PortalApiError(error.message, (error as { status?: number }).status, (error as { code?: string }).code)
    throw error
  }
}

async function listPage(filters: URLSearchParams): Promise<ApiPage> {
  return getJson<ApiPage>(`/v1/staff/fulfilments?${filters}`, 'The fulfilment queue could not be loaded.')
}

function queryFromFilters(filters: OrderFilters, cursor?: string) {
  const query = new URLSearchParams({ limit: '25' })
  if (filters.search.trim().length >= 2) query.set('search', filters.search.trim())
  if (filters.fulfilmentStatus) query.set('status', filters.fulfilmentStatus)
  if (filters.paymentStatus) query.set('paymentStatus', filters.paymentStatus)
  if (cursor) query.set('cursor', cursor)
  return query
}

export function createLiveFulfilmentsApi(): FulfilmentsApi {
  let account: BackendAccount | undefined
  const readPreferences = (): PortalPreferences => {
    try { const value = localStorage.getItem(prefsKey); return value ? { printerFormat: JSON.parse(value).printerFormat === 'A4' ? 'A4' : 'A6', compactRows: JSON.parse(value).compactRows === true } : { printerFormat: 'A6', compactRows: false } }
    catch { return { printerFormat: 'A6', compactRows: false } }
  }
  return {
    async checkAccess(): Promise<PortalAccess> {
      account = await getMyAccount()
      permissions = account.permissions ?? []
      if (account.role?.toLowerCase() !== 'staff' || !permissions.includes('fulfilments:access')) throw new PortalApiError('Your account does not have permission to use the fulfilments portal.', 403, 'FORBIDDEN')
      return { authorised: true, staffLabel: account.displayName || account.email || 'Staff' }
    },
    async dashboard(): Promise<DashboardStats> {
      requirePermission('fulfilments:read')
      const [stats, activity] = await Promise.all([
        getJson<ApiStats>('/v1/staff/fulfilments/stats', 'Dashboard counts could not be loaded.'),
        getJson<{ data: ApiActivity[] }>('/v1/staff/fulfilments/activity?limit=20', 'Recent activity could not be loaded.'),
      ])
      return {
        paidAwaiting: stats.pending + stats.readyToPack, readyToPack: stats.readyToPack, packed: stats.packed,
        labelsGenerated: stats.labelCreated, dispatched: stats.dispatched + stats.inTransit, delivered: stats.delivered, onHold: stats.onHold,
        recentActivity: activity.data.map(event => ({ id: `${event.fulfilmentId}-${event.createdAt}`, fulfilmentId: event.fulfilmentId, action: event.action, orderNumber: event.orderNumber, actor: `Staff ${event.actorStaffId.slice(0, 8)}`, at: event.createdAt })),
      }
    },
    async listOrders(filters: OrderFilters, cursor?: string): Promise<OrderPage> {
      requirePermission('fulfilments:read')
      const page = await listPage(queryFromFilters(filters, cursor))
      return { orders: page.data.map(row => toOrder(row, account)), nextCursor: page.nextCursor, hasMore: page.hasMore }
    },
    async getOrder(id: string): Promise<FulfilmentOrder> {
      requirePermission('fulfilments:read')
      const detail = await getJson<ApiDetail>(`/v1/staff/fulfilments/${encodeURIComponent(id)}`, 'Order details could not be loaded.')
      return toOrder(detail, account)
    },
    async performAction(id: string, action: OrderAction): Promise<FulfilmentOrder> {
      const path = `/v1/staff/fulfilments/${encodeURIComponent(id)}`
      if (action === 'confirm_packed') {
        requirePermission('fulfilments:manage')
        await getJson<ApiDetail>(`${path}/pack`, 'Order could not be marked packed.', { method: 'POST' })
      } else if (action === 'create_label') {
        requirePermission('fulfilments:labels:create')
        const keyName = idempotencyKey(id)
        let key = sessionStorage.getItem(keyName)
        if (!key) { key = crypto.randomUUID(); sessionStorage.setItem(keyName, key) }
        await getJson<ApiLabelCreated>(`${path}/labels`, 'Shipping label could not be created.', { method: 'POST', headers: { 'Idempotency-Key': key } })
        sessionStorage.removeItem(keyName)
      } else if (action === 'dispatch') {
        requirePermission('fulfilments:dispatch')
        await getJson<ApiDetail>(`${path}/dispatch`, 'Order could not be marked dispatched.', { method: 'POST' })
      } else if (action === 'refresh_tracking') {
        requirePermission('fulfilments:dispatch')
        await getJson<ApiTracking>(`${path}/tracking/refresh`, 'Tracking information could not be refreshed.', { method: 'POST' })
      } else if (action === 'place_on_hold') {
        requirePermission('fulfilments:manage')
        await getJson<ApiDetail>(path, 'Order could not be placed on hold.', { method: 'PATCH', body: JSON.stringify({ status: 'on_hold' }) })
      } else {
        throw new PortalApiError('This action is not supported by the backend contract.')
      }
      return this.getOrder(id)
    },
    async downloadLabel(id: string): Promise<Blob> {
      requirePermission('fulfilments:read')
      const response = await apiFetch(`/v1/staff/fulfilments/${encodeURIComponent(id)}/label`, { headers: { Accept: 'application/pdf' } })
      if (!response.ok) await jsonResponse<never>(response, 'Label download failed.')
      return response.blob()
    },
    async labels(): Promise<LabelRecord[]> {
      requirePermission('fulfilments:read')
      const statuses: FulfilmentStatus[] = ['label_created', 'dispatched', 'in_transit', 'delivered']
      const pages = await Promise.all(statuses.map(async status => {
        let cursor: string | undefined
        const rows: ApiQueueRow[] = []
        do {
          const params = new URLSearchParams({ status, limit: '50' })
          if (cursor) params.set('cursor', cursor)
          const result = await listPage(params)
          rows.push(...result.data); cursor = result.hasMore ? result.nextCursor ?? undefined : undefined
        } while (cursor)
        return rows
      }))
      const rows = pages.flat()
      const details: ApiDetail[] = []
      for (let offset = 0; offset < rows.length; offset += 8) {
        const batch = rows.slice(offset, offset + 8)
        details.push(...await Promise.all(batch.map(row => getJson<ApiDetail>(`/v1/staff/fulfilments/${encodeURIComponent(row.fulfilmentId)}`, 'Shipping label details could not be loaded.'))))
      }
      return details.filter(detail => detail.labelReference).map(detail => ({ id: detail.fulfilmentId, orderNumber: detail.orderNumber, customerName: detail.customerName || detail.customerEmail, carrier: detail.providerCode, service: detail.shippingMethod, labelStatus: detail.fulfilmentStatus.replaceAll('_', ' '), trackingNumber: detail.trackingNumber ?? undefined, createdAt: detail.updatedAt }))
    },
    async preferences() { return readPreferences() },
    async savePreferences(value) { localStorage.setItem(prefsKey, JSON.stringify(value)); return value },
  }
}
