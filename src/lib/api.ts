import { supabase } from './supabase'

export interface BackendAccount {
  id?: string
  email?: string
  role?: string
  displayName?: string
  phone?: string
}

export interface BackendAddress {
  id: string
  label?: string | null
  recipientName: string
  line1: string
  line2?: string | null
  city: string
  county?: string | null
  postcode: string
  phone?: string | null
  isDefault: boolean
  countryCode?: string
  createdAt?: string
}

export interface ApiProduct {
  id: string
  sku: string
  slug: string
  name: string
  description: string
  pet: string
  category: string
  price: { amount: number; currency: string }
  available: boolean
  image: { url: string; altText: string; position?: number } | null
  featured: boolean
  badge: string | null
  ratingAverage: number | null
  reviewCount: number
}

export interface ApiProductDetail {
  product: ApiProduct
  images: Array<{ url: string; altText: string; position: number }>
  weightGrams: number
  lengthMm: number | null
  widthMm: number | null
  heightMm: number | null
}

export interface AdminProduct {
  id: string
  sku: string
  slug: string
  name: string
  description: string
  pet: string
  category: string
  pricePence: number
  taxRateBps: number
  pricesIncludeTax: boolean
  stockOnHand: number
  stockReserved?: number
  active: boolean
  featured: boolean
  badge: string | null
  weightGrams: number
  lengthMm: number | null
  widthMm: number | null
  heightMm: number | null
  images: Array<{ url: string; altText: string }>
}

export interface AdminProductInput {
  sku: string
  slug: string
  name: string
  description: string
  pet: string
  category: string
  pricePence: number
  taxRateBps: number
  pricesIncludeTax: boolean
  stockOnHand: number
  featured: boolean
  badge: string | null
  weightGrams: number
  lengthMm: number | null
  widthMm: number | null
  heightMm: number | null
  images: Array<{ url: string; altText: string }>
}

export interface ProductImageUploadAuthorization {
  uploadUrl: string
  token: string
  path: string
  publicUrl: string
}

export interface SiteContent {
  contact: {
    /** Read-only capability marker; never include this in PUT payloads. */
    structuredContactSupported?: boolean
    email: string
    phones: Array<{ label: string; number: string }>
    address: { line1: string; line2: string; townCity: string; county: string; postcode: string; country: string }
    openingHours: string
    responseTime: string
    version: number
    updatedAt: string
  }
  footer: { tagline: string; groups: Array<{ title: string; links: Array<{ label: string; route: string; active: boolean }> }>; version: number; updatedAt: string }
}

export interface ContentPage {
  slug: string
  title: string
  intro: string
  sections: Array<{ heading: string; body: string; bullets: string[] }>
  faqs?: Array<{ question: string; answer: string }>
  version: number
  updatedAt: string
}

export type EditableContentPage = Pick<ContentPage, 'title' | 'intro' | 'sections' | 'faqs'>
export type ContentContact = SiteContent['contact']
export type ContentFooter = SiteContent['footer']

export interface ContactMessageInput {
  name: string
  email: string
  orderNumber: string | null
  subject: string
  message: string
  consent: boolean
  website?: string
}

export class BackendApiError extends Error {
  constructor(message: string, public readonly status?: number, public readonly code?: string, public readonly fieldErrors?: Record<string, string | string[]>, public readonly requestId?: string, public readonly retryAfter?: number) {
    super(message)
    this.name = 'BackendApiError'
  }
}

function apiUrl(path: string) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '')
  if (!baseUrl) throw new BackendApiError('The store service is not configured. Set VITE_API_BASE_URL.')
  return `${baseUrl}${path}`
}

async function readError(response: Response, fallback: string) {
  const requestId = response.headers.get('X-Request-Id') ?? undefined
  const retryHeader = response.headers.get('Retry-After')
  const retryAfter = retryHeader && /^\d+$/.test(retryHeader) ? Number(retryHeader) : undefined
  try {
    const body = await response.json() as { error?: { code?: string; message?: string; fieldErrors?: Record<string, string | string[]>; requestId?: string } }
    if (body.error) {
      const message = response.status === 401 ? 'Your session has expired. Please sign in again.' : response.status === 403 ? 'You do not have permission to perform this action.' : response.status === 404 ? 'The requested resource could not be found.' : body.error.message ?? fallback
      return new BackendApiError(message, response.status, body.error.code, body.error.fieldErrors, body.error.requestId ?? requestId, retryAfter)
    }
  } catch {
    // The response was not the API's JSON error envelope.
  }
  const message = response.status === 401 ? 'Your session has expired. Please sign in again.' : response.status === 403 ? 'You do not have permission to perform this action.' : response.status === 404 ? 'The requested resource could not be found.' : fallback
  return new BackendApiError(message, response.status, undefined, undefined, requestId, retryAfter)
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  if (!supabase) throw new BackendApiError('Authentication is not configured.')
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new BackendApiError('Your session could not be read. Please sign in again.')

  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body) headers.set('Content-Type', 'application/json')
  if (data.session?.access_token) headers.set('Authorization', `Bearer ${data.session.access_token}`)

  const url = apiUrl(path)
  try {
    return await fetch(url, { ...init, headers })
  } catch {
    throw new BackendApiError('The account service could not be reached. Please try again later.')
  }
}

async function publicFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body) headers.set('Content-Type', 'application/json')
  const url = apiUrl(path)
  try {
    return await fetch(url, { cache: 'no-store', ...init, headers })
  } catch {
    throw new BackendApiError('The catalogue could not be reached. Please try again later.')
  }
}

async function jsonResponse<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) throw await readError(response, fallback)
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

function unwrapData<T>(payload: T | { data: T }): T {
  return typeof payload === 'object' && payload !== null && 'data' in payload ? payload.data : payload as T
}

export async function getMyAccount(): Promise<BackendAccount> {
  const response = await apiFetch('/v1/me')
  return jsonResponse<BackendAccount>(response, 'Your account could not be loaded.')
}

export async function updateMyAccount(input: { displayName: string; phone: string }): Promise<BackendAccount> {
  const response = await apiFetch('/v1/me', { method: 'PATCH', body: JSON.stringify(input) })
  return jsonResponse<BackendAccount>(response, 'Your account details could not be saved.')
}

export async function listAddresses(): Promise<BackendAddress[]> {
  const response = await apiFetch('/v1/me/addresses')
  const payload = await jsonResponse<BackendAddress[] | { data: BackendAddress[] }>(response, 'Your addresses could not be loaded.')
  return unwrapData(payload)
}

export async function createAddress(input: Omit<BackendAddress, 'id'>): Promise<BackendAddress> {
  const response = await apiFetch('/v1/me/addresses', { method: 'POST', body: JSON.stringify(input) })
  return jsonResponse<BackendAddress>(response, 'Your address could not be saved.')
}

export async function deleteAddress(id: string): Promise<void> {
  const response = await apiFetch(`/v1/me/addresses/${encodeURIComponent(id)}`, { method: 'DELETE' })
  await jsonResponse<void>(response, 'Your address could not be deleted.')
}

export async function updateAddress(id: string, input: Omit<BackendAddress, 'id' | 'countryCode' | 'createdAt'>): Promise<BackendAddress> {
  const response = await apiFetch(`/v1/me/addresses/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(input) })
  return jsonResponse<BackendAddress>(response, 'Your address could not be updated.')
}

export async function listApiProducts(): Promise<ApiProduct[]> {
  let cursor: string | null = null
  const products: ApiProduct[] = []
  do {
    const query = new URLSearchParams({ limit: '100' })
    if (cursor) query.set('cursor', cursor)
    const response = await publicFetch(`/v1/products?${query.toString()}`)
    const payload = await jsonResponse<{ data: ApiProduct[]; nextCursor?: string | null; hasMore?: boolean }>(response, 'The catalogue could not be loaded.')
    products.push(...payload.data)
    cursor = payload.hasMore ? payload.nextCursor ?? null : null
  } while (cursor)
  return products
}

export async function getApiProduct(slug: string): Promise<ApiProductDetail> {
  const response = await publicFetch(`/v1/products/${encodeURIComponent(slug)}`)
  return jsonResponse<ApiProductDetail>(response, 'The product could not be loaded.')
}

export async function listAdminProducts(): Promise<AdminProduct[]> {
  const response = await apiFetch('/v1/staff/products')
  const payload = await jsonResponse<AdminProduct[] | { data: AdminProduct[] }>(response, 'The product catalogue could not be loaded.')
  return unwrapData(payload)
}

export async function getAdminProduct(id: string): Promise<AdminProduct> {
  const response = await apiFetch(`/v1/staff/products/${encodeURIComponent(id)}`)
  const payload = await jsonResponse<AdminProduct | { data: AdminProduct }>(response, 'The product could not be loaded.')
  return unwrapData(payload)
}

export async function createAdminProduct(input: AdminProductInput): Promise<AdminProduct> {
  const response = await apiFetch('/v1/staff/products', { method: 'POST', body: JSON.stringify(input) })
  const payload = await jsonResponse<AdminProduct | { data: AdminProduct }>(response, 'The product could not be created.')
  return unwrapData(payload)
}

export async function updateAdminProduct(id: string, input: AdminProductInput): Promise<AdminProduct> {
  const response = await apiFetch(`/v1/staff/products/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(input) })
  const payload = await jsonResponse<AdminProduct | { data: AdminProduct }>(response, 'The product could not be updated.')
  return unwrapData(payload)
}

export async function setProductActivation(id: string, active: boolean): Promise<AdminProduct> {
  const response = await apiFetch(`/v1/staff/products/${encodeURIComponent(id)}/activation`, { method: 'PATCH', body: JSON.stringify({ active }) })
  const payload = await jsonResponse<AdminProduct | { data: AdminProduct }>(response, 'The product visibility could not be changed.')
  return unwrapData(payload)
}

export async function requestProductImageUpload(input: { fileName: string; contentType: string; sizeBytes: number }): Promise<ProductImageUploadAuthorization> {
  const response = await apiFetch('/v1/staff/product-images/upload-url', { method: 'POST', body: JSON.stringify(input) })
  return jsonResponse<ProductImageUploadAuthorization>(response, 'The image upload could not be authorised.')
}

function normalizeContactContent(contact: Partial<SiteContent['contact']> & { phone?: string }): SiteContent['contact'] {
  return {
    structuredContactSupported: Array.isArray(contact.phones) && typeof contact.address === 'object' && contact.address !== null,
    email: contact.email ?? '',
    phones: contact.phones ?? (contact.phone ? [{ label: 'Phone', number: contact.phone }] : []),
    address: contact.address ?? { line1: '', line2: '', townCity: '', county: '', postcode: '', country: '' },
    openingHours: contact.openingHours ?? '',
    responseTime: contact.responseTime ?? '',
    version: contact.version ?? 0,
    updatedAt: contact.updatedAt ?? '',
  }
}

export async function getSiteContent(): Promise<SiteContent> {
  const response = await publicFetch('/v1/content/site')
  const payload = await jsonResponse<(Omit<SiteContent, 'contact'> & { contact: Partial<SiteContent['contact']> & { phone?: string } }) | { data: Omit<SiteContent, 'contact'> & { contact: Partial<SiteContent['contact']> & { phone?: string } } }>(response, 'Store information could not be loaded.')
  const content = unwrapData(payload)
  return { ...content, contact: normalizeContactContent(content.contact) }
}

export async function getContentPage(slug: string): Promise<ContentPage> {
  const response = await publicFetch(`/v1/content/pages/${encodeURIComponent(slug)}`)
  const payload = await jsonResponse<ContentPage | { data: ContentPage }>(response, 'This page could not be loaded.')
  return validateContentPage(unwrapData(payload), slug)
}

export async function getStaffContentPage(slug: string): Promise<ContentPage> {
  const response = await apiFetch(`/v1/staff/content/pages/${encodeURIComponent(slug)}`, { cache: 'no-store' })
  const payload = await jsonResponse<ContentPage | { data: ContentPage }>(response, 'The content page could not be loaded.')
  return validateContentPage(unwrapData(payload), slug)
}

export async function updateStaffContentPage(slug: string, input: EditableContentPage & { version: number }): Promise<ContentPage> {
  const response = await apiFetch(`/v1/staff/content/pages/${encodeURIComponent(slug)}`, { method: 'PUT', body: JSON.stringify({ ...input, slug }) })
  const payload = await jsonResponse<ContentPage | { data: ContentPage }>(response, 'The content page could not be saved.')
  return validateContentPage(unwrapData(payload), slug)
}

function validateContentPage(page: ContentPage, slug: string): ContentPage {
  if (!page || page.slug !== slug || !Number.isInteger(page.version) || page.version < 0 || !Array.isArray(page.sections) || typeof page.title !== 'string' || typeof page.intro !== 'string' || typeof page.updatedAt !== 'string'
    || page.sections.some(section => !section || typeof section.heading !== 'string' || typeof section.body !== 'string' || !Array.isArray(section.bullets) || section.bullets.some(bullet => typeof bullet !== 'string'))
    || (page.faqs != null && (!Array.isArray(page.faqs) || page.faqs.some(faq => !faq || typeof faq.question !== 'string' || typeof faq.answer !== 'string')))) {
    throw new BackendApiError('The content service returned an unexpected page. Please contact support rather than overwriting it.')
  }
  return { ...page, faqs: page.faqs ?? [] }
}

export async function updateStaffContact(input: Omit<ContentContact, 'updatedAt'>): Promise<ContentContact> {
  const { structuredContactSupported: _capability, ...editable } = input
  const response = await apiFetch('/v1/staff/content/contact', { method: 'PUT', body: JSON.stringify(editable) })
  const payload = await jsonResponse<(Partial<ContentContact> & { phone?: string }) | { data: Partial<ContentContact> & { phone?: string } }>(response, 'Contact details could not be saved.')
  const saved = normalizeContactContent(unwrapData(payload))
  if (!saved.structuredContactSupported) throw new BackendApiError('The server did not return labeled phones and address. Contact support to confirm the V6 backend deployment before trying again.')
  return saved
}

export async function updateStaffFooter(input: Omit<ContentFooter, 'updatedAt'>): Promise<ContentFooter> {
  const response = await apiFetch('/v1/staff/content/footer', { method: 'PUT', body: JSON.stringify(input) })
  const payload = await jsonResponse<ContentFooter | { data: ContentFooter }>(response, 'Footer content could not be saved.')
  return unwrapData(payload)
}

export async function submitContactMessage(input: ContactMessageInput): Promise<{ requestId?: string }> {
  const response = await publicFetch('/v1/contact-messages', { method: 'POST', body: JSON.stringify(input) })
  return jsonResponse<{ requestId?: string }>(response, 'Your message could not be sent. Please try again.')
}
