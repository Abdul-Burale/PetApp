import type { FulfilmentsApi } from '../api'
import type { DashboardStats, FulfilmentOrder, FulfilmentStatus, LabelRecord, OrderAction, OrderFilters, OrderPage, PortalPreferences } from '../types'

const initialOrders: FulfilmentOrder[] = [
  { id: 'mock-order-001', orderNumber: 'DEV-MOCK-1042', customerName: 'Alex Morgan', customerEmail: 'alex@example.test', customerPhone: '07123 456789', paymentStatus: 'paid', orderDate: '2026-10-14T09:30:00Z', productCount: 3, fulfilmentStatus: 'ready_to_pack', deliveryService: 'Royal Mail Tracked 48', assignedStaff: null, deliveryAddress: { recipientName: 'Alex Morgan', line1: '12 Example Road', city: 'London', postcode: 'SW1A 1AA', phone: '07123 456789' }, lines: [{ name: 'Complete Dog Food 2kg', sku: 'DOG-FOOD-2KG', quantity: 1 }, { name: 'Salmon Training Treats', sku: 'DOG-TREAT-SAL', quantity: 2 }], history: [{ action: 'Payment confirmed', actor: 'System', at: '2026-10-14T09:31:00Z' }, { action: 'Ready to pack', actor: 'System', at: '2026-10-14T09:31:02Z' }], shipping: { carrier: 'Royal Mail', service: 'Tracked 48', labelStatus: 'Not created' }, allowedActions: ['confirm_packed', 'place_on_hold'] },
  { id: 'mock-order-002', orderNumber: 'DEV-MOCK-1041', customerName: 'Jamie Patel', customerEmail: 'jamie@example.test', paymentStatus: 'paid', orderDate: '2026-10-14T08:55:00Z', productCount: 1, fulfilmentStatus: 'packed', deliveryService: 'Royal Mail Tracked 24', assignedStaff: 'Demo staff', deliveryAddress: { recipientName: 'Jamie Patel', line1: '8 Market Lane', city: 'Bristol', postcode: 'BS1 4ST' }, lines: [{ name: 'Indoor Cat Food 1.5kg', sku: 'CAT-IND-15', quantity: 1 }], history: [{ action: 'Payment confirmed', actor: 'System', at: '2026-10-14T08:56:00Z' }, { action: 'Packing started', actor: 'Demo staff', at: '2026-10-14T09:00:00Z' }, { action: 'Packed', actor: 'Demo staff', at: '2026-10-14T09:10:00Z' }], shipping: { carrier: 'Royal Mail', service: 'Tracked 24', labelStatus: 'Not created' }, allowedActions: ['create_label', 'place_on_hold'] },
  { id: 'mock-order-003', orderNumber: 'DEV-MOCK-1038', customerName: 'Taylor Reed', customerEmail: 'taylor@example.test', paymentStatus: 'paid', orderDate: '2026-10-13T16:10:00Z', productCount: 2, fulfilmentStatus: 'label_created', deliveryService: 'Royal Mail Tracked 48', assignedStaff: 'Demo staff', deliveryAddress: { recipientName: 'Taylor Reed', line1: '24 Park View', city: 'Leeds', postcode: 'LS1 2AB' }, lines: [{ name: 'Puppy Starter Food 3kg', sku: 'PUP-START-3', quantity: 1 }, { name: 'Rubber Fetch Toy', sku: 'DOG-TOY-FETCH', quantity: 1 }], history: [{ action: 'Payment confirmed', actor: 'System', at: '2026-10-13T16:11:00Z' }, { action: 'Packed', actor: 'Demo staff', at: '2026-10-13T16:30:00Z' }, { action: 'Mock label generated', actor: 'Demo staff', at: '2026-10-13T16:32:00Z' }], shipping: { carrier: 'Royal Mail (mock)', service: 'Tracked 48', trackingNumber: 'MOCK-TRACK-1038', trackingUrl: '#', labelStatus: 'Mock label ready' }, allowedActions: ['dispatch', 'place_on_hold'] },
  { id: 'mock-order-004', orderNumber: 'DEV-MOCK-1035', customerName: 'Casey Wood', customerEmail: 'casey@example.test', paymentStatus: 'paid', orderDate: '2026-10-13T11:20:00Z', productCount: 1, fulfilmentStatus: 'on_hold', deliveryService: 'Unassigned', assignedStaff: null, deliveryAddress: { recipientName: 'Casey Wood', line1: '4 Sample Street', city: 'Cardiff', postcode: 'CF10 1EP' }, lines: [{ name: 'Beef & Rice Adult Food 5kg', sku: 'DOG-BEEF-5', quantity: 1 }], history: [{ action: 'Payment confirmed', actor: 'System', at: '2026-10-13T11:21:00Z' }, { action: 'Placed on hold', actor: 'Demo staff', at: '2026-10-13T11:40:00Z', note: 'Demo: address check' }], allowedActions: [] },
  { id: 'mock-order-005', orderNumber: 'DEV-MOCK-1029', customerName: 'Rory Lewis', customerEmail: 'rory@example.test', paymentStatus: 'paid', orderDate: '2026-10-12T14:05:00Z', productCount: 2, fulfilmentStatus: 'dispatched', deliveryService: 'Royal Mail Tracked 48', assignedStaff: 'Demo staff', deliveryAddress: { recipientName: 'Rory Lewis', line1: '3 Test Crescent', city: 'Glasgow', postcode: 'G1 1AA' }, lines: [{ name: 'Catnip Mouse Toy', sku: 'CAT-TOY-MOUSE', quantity: 2 }], history: [{ action: 'Payment confirmed', actor: 'System', at: '2026-10-12T14:06:00Z' }, { action: 'Mock label generated', actor: 'Demo staff', at: '2026-10-12T14:20:00Z' }, { action: 'Dispatched', actor: 'Demo staff', at: '2026-10-12T14:30:00Z' }], shipping: { carrier: 'Royal Mail (mock)', service: 'Tracked 48', trackingNumber: 'MOCK-TRACK-1029', trackingUrl: '#', labelStatus: 'Mock label ready' }, allowedActions: [] },
]

let orders = structuredClone(initialOrders)
let preferences: PortalPreferences = { printerFormat: 'A6', compactRows: false }
const wait = () => new Promise(resolve => window.setTimeout(resolve, 180))
const pageSize = 4

function deriveStats(): DashboardStats {
  const count = (status: FulfilmentStatus) => orders.filter(order => order.fulfilmentStatus === status).length
  return {
    paidAwaiting: orders.filter(order => order.paymentStatus === 'paid' && ['pending', 'ready_to_pack'].includes(order.fulfilmentStatus)).length,
    readyToPack: count('ready_to_pack'), packed: count('packed'), labelsGenerated: count('label_created'), dispatched: count('dispatched') + count('in_transit'), delivered: count('delivered'), onHold: count('on_hold'),
    recentActivity: orders.flatMap(order => order.history.map((entry, index) => ({ id: `${order.id}-${index}`, fulfilmentId: order.id, action: entry.action, orderNumber: order.orderNumber, actor: entry.actor, at: entry.at }))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6),
  }
}

function updateOrder(order: FulfilmentOrder, action: OrderAction): FulfilmentOrder {
  const next = structuredClone(order)
  const now = new Date().toISOString()
  const transitions: Partial<Record<OrderAction, FulfilmentStatus>> = { confirm_packed: 'packed', create_label: 'label_created', dispatch: 'dispatched', place_on_hold: 'on_hold', refresh_tracking: 'in_transit' }
  const nextStatus = transitions[action]
  if (!nextStatus || !next.allowedActions.includes(action)) throw new Error('That action is not available for this mock order.')
  const text: Record<OrderAction, string> = { confirm_packed: 'Packed', create_label: 'Mock label generated', dispatch: 'Dispatched', place_on_hold: 'Placed on hold', refresh_tracking: 'Tracking refreshed' }
  next.fulfilmentStatus = nextStatus
  next.history.unshift({ action: text[action], actor: 'Demo staff', at: now, note: action === 'create_label' ? 'Development mock only; no postage was purchased.' : undefined })
  next.allowedActions = nextStatus === 'ready_to_pack' ? ['confirm_packed', 'place_on_hold'] : nextStatus === 'packed' ? ['create_label', 'place_on_hold'] : nextStatus === 'label_created' ? ['dispatch', 'place_on_hold'] : nextStatus === 'on_hold' ? [] : nextStatus === 'dispatched' ? ['refresh_tracking'] : nextStatus === 'in_transit' ? ['refresh_tracking'] : []
  if (action === 'create_label') next.shipping = { carrier: 'Mock carrier', service: next.deliveryService, trackingNumber: `MOCK-${next.orderNumber}`, trackingUrl: '#', labelStatus: 'Mock label only' }
  return next
}

export function createMockFulfilmentsApi(): import('../api').FulfilmentsApi {
  return {
    async checkAccess() { await wait(); return { authorised: true, staffLabel: 'Development mock operator' } },
    async dashboard() { await wait(); return deriveStats() },
    async listOrders(filters: OrderFilters, cursor?: string): Promise<OrderPage> {
      await wait()
      let result = orders.filter(order => {
        const term = filters.search.trim().toLowerCase()
        return (!term || `${order.orderNumber} ${order.customerName} ${order.customerEmail} ${order.lines.map(line => line.sku).join(' ')}`.toLowerCase().includes(term)) && (!filters.fulfilmentStatus || order.fulfilmentStatus === filters.fulfilmentStatus) && (!filters.paymentStatus || order.paymentStatus === filters.paymentStatus)
      })
      result = result.sort((a, b) => b.orderDate.localeCompare(a.orderDate))
      const offset = cursor ? Number(cursor) || 0 : 0
      return { orders: result.slice(offset, offset + pageSize), nextCursor: offset + pageSize < result.length ? String(offset + pageSize) : null, hasMore: offset + pageSize < result.length }
    },
    async getOrder(id) { await wait(); const order = orders.find(item => item.id === id); if (!order) throw new Error('Order not found.'); return structuredClone(order) },
    async performAction(id, action) { await wait(); const index = orders.findIndex(item => item.id === id); if (index < 0) throw new Error('Order not found.'); orders[index] = updateOrder(orders[index], action); return structuredClone(orders[index]) },
    async labels(): Promise<LabelRecord[]> { await wait(); return orders.filter(order => order.shipping?.labelStatus.includes('Mock')).map(order => ({ id: order.id, orderNumber: order.orderNumber, customerName: order.customerName, carrier: order.shipping?.carrier ?? '—', service: order.shipping?.service ?? '—', labelStatus: order.shipping?.labelStatus ?? 'Unknown', trackingNumber: order.shipping?.trackingNumber, createdAt: order.history.find(event => event.action.toLowerCase().includes('label'))?.at ?? order.orderDate })) },
    async downloadLabel() { await wait(); return new Blob(['Mock label; development only'], { type: 'application/pdf' }) },
    async preferences() { await wait(); return { ...preferences } },
    async savePreferences(value) { await wait(); preferences = { ...value }; return { ...preferences } },
  }
}
