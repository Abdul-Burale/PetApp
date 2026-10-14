export type FulfilmentStatus = 'pending' | 'ready_to_pack' | 'packed' | 'label_created' | 'dispatched' | 'in_transit' | 'delivered' | 'cancelled' | 'on_hold'
export type OrderAction = 'confirm_packed' | 'create_label' | 'dispatch' | 'refresh_tracking' | 'place_on_hold'

// These are portal view models for the development mock only. They are not backend DTOs.
export interface FulfilmentLine {
  name: string
  sku: string
  quantity: number
  imageUrl?: string | null
}
export interface FulfilmentOrder {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone?: string | null
  paymentStatus: string
  orderDate: string
  productCount: number
  fulfilmentStatus: FulfilmentStatus
  deliveryService: string
  assignedStaff?: string | null
  deliveryAddress: { recipientName: string; line1: string; line2?: string; city: string; postcode: string; phone?: string }
  lines: FulfilmentLine[]
  history: Array<{ action: string; actor: string; at: string; note?: string }>
  shipping?: { carrier: string; service: string; trackingNumber?: string; trackingUrl?: string; labelStatus: string; labelUrl?: string }
  allowedActions: OrderAction[]
}
export interface FulfilmentActivity { id: string; fulfilmentId: string; action: string; orderNumber: string; actor: string; at: string }
export interface DashboardStats {
  paidAwaiting: number
  readyToPack: number
  packed: number
  labelsGenerated: number
  dispatched: number
  delivered: number
  onHold: number
  recentActivity: FulfilmentActivity[]
}
export interface OrderFilters { search: string; fulfilmentStatus: FulfilmentStatus | ''; paymentStatus: string }
export interface OrderPage { orders: FulfilmentOrder[]; nextCursor: string | null; hasMore: boolean }
export interface LabelRecord { id: string; orderNumber: string; customerName: string; carrier: string; service: string; labelStatus: string; trackingNumber?: string; createdAt: string }
export interface PortalPreferences { printerFormat: 'A4' | 'A6'; compactRows: boolean }
export interface PortalAccess { authorised: true; staffLabel: string }
