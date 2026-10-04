import { useEffect, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { productQueryKey, productsQueryKey } from '../context/CatalogContext'
import { BackendApiError, createAdminProduct, getAdminProduct, listAdminProducts, setProductActivation, updateAdminProduct, type AdminProduct, type AdminProductInput } from '../lib/api'

const blankProduct = (): FormState => ({
  sku: '', slug: '', name: '', description: '', pet: 'DOGS', category: 'FOOD', pricePence: 0,
  taxRateBps: 0, pricesIncludeTax: true, stockOnHand: 0, featured: false, badge: null,
  weightGrams: 0, lengthMm: null, widthMm: null, heightMm: null, images: [], imageUrl: '', imageAlt: '',
})

type FormState = AdminProductInput & { imageUrl: string; imageAlt: string }

function apiMessage(caught: unknown, fallback: string) {
  if (!(caught instanceof BackendApiError)) return fallback
  if (caught.status === 401) return 'Your session has expired. Please sign in again.'
  if (caught.status === 403) return 'You do not have permission to manage products.'
  if (caught.status === 404) return 'That product could not be found.'
  return caught.message
}

function formFromProduct(product: AdminProduct): FormState {
  return { ...product, imageUrl: product.images[0]?.url ?? '', imageAlt: product.images[0]?.altText ?? '' }
}

function toInput(form: FormState): AdminProductInput {
  return {
    sku: form.sku.trim(), slug: form.slug.trim(), name: form.name.trim(), description: form.description.trim(),
    pet: form.pet, category: form.category, pricePence: Number(form.pricePence), taxRateBps: Number(form.taxRateBps),
    pricesIncludeTax: form.pricesIncludeTax, stockOnHand: Number(form.stockOnHand), featured: form.featured,
    badge: form.badge || null, weightGrams: Number(form.weightGrams), lengthMm: form.lengthMm === null ? null : Number(form.lengthMm),
    widthMm: form.widthMm === null ? null : Number(form.widthMm), heightMm: form.heightMm === null ? null : Number(form.heightMm),
    images: form.imageUrl.trim() ? [{ url: form.imageUrl.trim(), altText: form.imageAlt.trim() }] : [],
  }
}

async function invalidatePublicCatalogue(queryClient: ReturnType<typeof useQueryClient>, slugs: string[] = []) {
  await queryClient.invalidateQueries({ queryKey: productsQueryKey })
  await Promise.all([...new Set(slugs.filter(Boolean))].map(slug => queryClient.invalidateQueries({ queryKey: productQueryKey(slug) })))
}

export function AdminProductsPage() {
  const queryClient = useQueryClient()
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setError(null)
    try { setProducts(await listAdminProducts()) }
    catch (caught) { setError(apiMessage(caught, 'The product catalogue could not be loaded.')) }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const toggle = async (product: AdminProduct) => {
    setError(null)
    try {
      const updated = await setProductActivation(product.id, !product.active)
      setProducts(current => current.map(item => item.id === updated.id ? updated : item))
      await invalidatePublicCatalogue(queryClient, [product.slug])
    } catch (caught) { setError(apiMessage(caught, 'The product visibility could not be changed.')) }
  }

  return <main className="container-page py-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-gray-500"><Link to="/account">Account</Link> / Admin</p><h1 className="mt-2 text-3xl font-bold">Manage products</h1><p className="mt-2 text-gray-600">Create and maintain the catalogue shown in the storefront.</p></div><Link to="/admin/products/new" className="btn-primary">New product</Link></div>{error&&<div role="alert" className="mt-6 border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}{loading?<p className="mt-8 border border-line p-10 text-center text-gray-600">Loading products…</p>:!products.length?<p className="mt-8 border border-dashed border-line p-10 text-center text-gray-600">No products found.</p>:<div className="mt-8 overflow-x-auto border border-line bg-white"><table className="w-full min-w-[820px] text-left text-sm"><thead className="border-b border-line bg-sand"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Featured</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-line">{products.map(product => <tr key={product.id}><td className="px-4 py-4"><Link className="font-bold text-brand hover:underline" to={`/admin/products/${product.id}`}>{product.name}</Link><span className="block text-xs text-gray-500">{product.slug}</span></td><td className="px-4 py-4">{product.sku}</td><td className="px-4 py-4">£{(product.pricePence / 100).toFixed(2)}</td><td className="px-4 py-4">{product.stockOnHand}</td><td className="px-4 py-4">{product.featured ? 'Yes' : 'No'}</td><td className="px-4 py-4"><span className={product.active ? 'text-green-700' : 'text-gray-500'}>{product.active ? 'Active' : 'Inactive'}</span></td><td className="px-4 py-4 text-right"><button type="button" onClick={() => void toggle(product)} className="mr-3 text-xs font-bold underline">{product.active ? 'Deactivate' : 'Activate'}</button><Link className="text-xs font-bold text-brand underline" to={`/admin/products/${product.id}`}>Edit</Link></td></tr>)}</tbody></table></div>}</main>
}

export function AdminProductFormPage() {
  const queryClient = useQueryClient()
  const { id } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const [form, setForm] = useState<FormState>(blankProduct)
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | string[]>>({})
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!id) return
    let mounted = true
    void getAdminProduct(id).then(product => { if (mounted) { setForm(formFromProduct(product)); setActive(product.active) } }).catch(caught => { if (mounted) setError(apiMessage(caught, 'The product could not be loaded.')) }).finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [id])

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => setForm(current => ({ ...current, [field]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(null); setFieldErrors({})
    try {
      const previousSlug = form.slug
      const input = toInput(form)
      const saved = editing ? await updateAdminProduct(id!, input) : await createAdminProduct(input)
      await invalidatePublicCatalogue(queryClient, editing ? [previousSlug, saved.slug] : [])
      navigate(`/admin/products/${saved.id}`, { replace: true })
      setForm(formFromProduct(saved)); setActive(saved.active)
    } catch (caught) {
      setError(apiMessage(caught, editing ? 'The product could not be updated.' : 'The product could not be created.'))
      if (caught instanceof BackendApiError && caught.fieldErrors) setFieldErrors(caught.fieldErrors)
    } finally { setSaving(false) }
  }

  const toggle = async () => {
    if (!id) return
    setError(null)
    try { const updated = await setProductActivation(id, !active); setActive(updated.active); await invalidatePublicCatalogue(queryClient, [form.slug]) }
    catch (caught) { setError(apiMessage(caught, 'The product visibility could not be changed.')) }
  }

  const inputClass = 'w-full border border-line bg-white px-3 py-2.5'
  const fieldError = (field: string) => { const value = fieldErrors[field]; return value ? <span className="mt-1 block text-xs text-red-700">{Array.isArray(value) ? value.join(', ') : value}</span> : null }
  if (loading) return <main className="container-page py-20 text-center text-gray-600">Loading product…</main>

  return <main className="container-page py-10"><p className="text-sm text-gray-500"><Link to="/admin/products">Manage products</Link> / {editing ? 'Edit product' : 'New product'}</p><div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold">{editing ? 'Edit product' : 'New product'}</h1><p className="mt-2 text-gray-600">Use an absolute image URL; image uploads are not available yet.</p></div>{editing&&<button type="button" onClick={() => void toggle()} className="btn-secondary">{active ? 'Deactivate product' : 'Activate product'}</button>}</div>{error&&<div role="alert" className="mt-6 border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}<form onSubmit={submit} className="mt-8 grid gap-5 border border-line bg-white p-6 shadow-card sm:grid-cols-2"><label className="text-sm"><span className="mb-1 block font-bold">Name</span><input required value={form.name} onChange={event => setField('name', event.target.value)} className={inputClass}/>{fieldError('name')}</label><label className="text-sm"><span className="mb-1 block font-bold">SKU</span><input required value={form.sku} onChange={event => setField('sku', event.target.value)} className={inputClass}/>{fieldError('sku')}</label><label className="text-sm"><span className="mb-1 block font-bold">Slug</span><input required value={form.slug} onChange={event => setField('slug', event.target.value)} className={inputClass}/>{fieldError('slug')}</label><label className="text-sm"><span className="mb-1 block font-bold">Price (£)</span><input required min="0" step="0.01" type="number" value={(form.pricePence / 100).toFixed(2)} onChange={event => setField('pricePence', Math.round(Number(event.target.value || 0) * 100))} className={inputClass}/>{fieldError('pricePence')}</label><label className="text-sm"><span className="mb-1 block font-bold">Tax rate (basis points)</span><input min="0" type="number" value={form.taxRateBps} onChange={event => setField('taxRateBps', Number(event.target.value))} className={inputClass}/>{fieldError('taxRateBps')}</label><label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" checked={form.pricesIncludeTax} onChange={event => setField('pricesIncludeTax', event.target.checked)}/> Prices include tax</label><label className="text-sm"><span className="mb-1 block font-bold">Pet</span><select value={form.pet} onChange={event => setField('pet', event.target.value)} className={inputClass}><option value="CATS">Cats</option><option value="DOGS">Dogs</option><option value="BIRDS">Birds</option></select>{fieldError('pet')}</label><label className="text-sm"><span className="mb-1 block font-bold">Category</span><select value={form.category} onChange={event => setField('category', event.target.value)} className={inputClass}>{['FOOD','TREATS','TOYS','HEALTH','GROOMING','ACCESSORIES','WALKING'].map(value => <option key={value} value={value}>{value[0] + value.slice(1).toLowerCase()}</option>)}</select>{fieldError('category')}</label><label className="text-sm"><span className="mb-1 block font-bold">Stock on hand</span><input min="0" type="number" value={form.stockOnHand} onChange={event => setField('stockOnHand', Number(event.target.value))} className={inputClass}/>{fieldError('stockOnHand')}</label><label className="text-sm"><span className="mb-1 block font-bold">Weight (grams)</span><input required min="0" type="number" value={form.weightGrams} onChange={event => setField('weightGrams', Number(event.target.value))} className={inputClass}/>{fieldError('weightGrams')}</label><label className="text-sm"><span className="mb-1 block font-bold">Length (mm)</span><input min="0" type="number" value={form.lengthMm ?? ''} onChange={event => setField('lengthMm', event.target.value === '' ? null : Number(event.target.value))} className={inputClass}/>{fieldError('lengthMm')}</label><label className="text-sm"><span className="mb-1 block font-bold">Width (mm)</span><input min="0" type="number" value={form.widthMm ?? ''} onChange={event => setField('widthMm', event.target.value === '' ? null : Number(event.target.value))} className={inputClass}/>{fieldError('widthMm')}</label><label className="text-sm"><span className="mb-1 block font-bold">Height (mm)</span><input min="0" type="number" value={form.heightMm ?? ''} onChange={event => setField('heightMm', event.target.value === '' ? null : Number(event.target.value))} className={inputClass}/>{fieldError('heightMm')}</label><label className="text-sm"><span className="mb-1 block font-bold">Badge</span><select value={form.badge ?? ''} onChange={event => setField('badge', event.target.value || null)} className={inputClass}><option value="">None</option><option value="popular">Popular</option><option value="new">New</option><option value="offer">Offer</option></select></label><label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" checked={form.featured} onChange={event => setField('featured', event.target.checked)}/> Featured product</label><label className="text-sm sm:col-span-2"><span className="mb-1 block font-bold">Description</span><textarea required rows={5} value={form.description} onChange={event => setField('description', event.target.value)} className={inputClass}/>{fieldError('description')}</label><div className="grid gap-4 sm:col-span-2 sm:grid-cols-2"><label className="text-sm"><span className="mb-1 block font-bold">Image URL</span><input type="url" value={form.imageUrl} onChange={event => setField('imageUrl', event.target.value)} className={inputClass}/>{fieldError('images')}</label><label className="text-sm"><span className="mb-1 block font-bold">Image alt text</span><input value={form.imageAlt} onChange={event => setField('imageAlt', event.target.value)} className={inputClass}/></label></div><div className="flex items-center gap-3 sm:col-span-2"><button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create product'}</button><Link to="/admin/products" className="btn-secondary">Cancel</Link>{!editing&&<span className="text-xs text-gray-500">New products start inactive.</span>}</div></form></main>
}
