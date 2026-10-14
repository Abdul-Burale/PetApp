import type { DashboardStats, FulfilmentOrder, OrderAction, OrderFilters, OrderPage, PortalAccess, PortalPreferences, LabelRecord } from './types'

export class PortalApiError extends Error {
  constructor(message: string, readonly status?: number, readonly code?: string) { super(message); this.name = 'PortalApiError' }
}

export interface FulfilmentsApi {
  checkAccess(): Promise<PortalAccess>
  dashboard(): Promise<DashboardStats>
  listOrders(filters: OrderFilters, cursor?: string): Promise<OrderPage>
  getOrder(id: string): Promise<FulfilmentOrder>
  performAction(id: string, action: OrderAction): Promise<FulfilmentOrder>
  labels(): Promise<LabelRecord[]>
  preferences(): Promise<PortalPreferences>
  savePreferences(value: PortalPreferences): Promise<PortalPreferences>
}

export async function createFulfilmentsApi(): Promise<FulfilmentsApi> {
  if (import.meta.env.DEV && import.meta.env.VITE_FULFILMENTS_USE_MOCKS === 'true') {
    const { createMockFulfilmentsApi } = await import('./dev/mockApi')
    return createMockFulfilmentsApi()
  }
  throw new PortalApiError('The production fulfilments API and secure subdomain sign-in are not configured. No order data has been loaded.')
}
