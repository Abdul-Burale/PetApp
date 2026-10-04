import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { productQueryKey, productsQueryKey } from '../context/CatalogContext'
import { BackendApiError, createAdminProduct, getAdminProduct, listAdminProducts, setProductActivation, updateAdminProduct, type AdminProduct, type AdminProductInput } from '../lib/api'
import { maxProductImageBytes, uploadProductImage, validateProductImage } from '../lib/productImages'

const blankProduct = (): FormState => ({
  sku: 'PRODUCT', slug: 'product', name: '', description: '', pet: 'DOGS', category: 'FOOD', pricePence: 0, priceInput: '',
  taxRateBps: 2000, pricesIncludeTax: true, stockOnHand: 0, featured: false, badge: null, weightGrams: 1000,
  lengthMm: null, widthMm: null, heightMm: null, images: [], imageUrl: '', imageAlt: '',
})

type FormState = AdminProductInput & { imageUrl: string; imageAlt: string; priceInput: string }

function nameWords(value: string) {
  const ascii = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  return ascii.toLowerCase().match(/[a-z0-9]+/g) ?? []
}

export function slugFromName(value: string) { return nameWords(value).join('-') || 'product' }
export function skuFromName(value: string) {
  const generated = (nameWords(value).join('-') || 'product').toUpperCase().slice(0, 64).replace(/-+$/, '')
  return generated.length > 1 ? generated : 'PRODUCT'
}

function poundsToPence(value: string) {
  const normalised = value.trim().replace(',', '.')
  if (!normalised) return 0
  const [wholePart, decimalPart = ''] = normalised.split('.')
  const whole = Number(wholePart || 0)
  const pennies = Number((decimalPart + '00').slice(0, 2))
  return Number.isFinite(whole) && Number.isFinite(pennies) ? whole * 100 + pennies : 0
}

function apiMessage(caught: unknown, fallback: string) {
  if (!(caught instanceof BackendApiError)) return fallback
  if (caught.status === 401) return 'Your session has expired. Please sign in again.'
  if (caught.status === 403) return 'You do not have permission to manage products.'
  if (caught.status === 404) return 'That product could not be found.'
  return caught.message
}

function formFromProduct(product: AdminProduct): FormState {
  return { ...product, priceInput: (product.pricePence / 100).toFixed(2), imageUrl: product.images[0]?.url ?? '', imageAlt: product.images[0]?.altText ?? '' }
}

function toInput(form: FormState): AdminProductInput {
  return {
    sku: form.sku.trim(), slug: form.slug.trim(), name: form.name.trim(), description: form.description.trim(), pet: form.pet, category: form.category,
    pricePence: poundsToPence(form.priceInput), taxRateBps: form.taxRateBps || 2000, pricesIncludeTax: form.pricesIncludeTax, stockOnHand: Number(form.stockOnHand), featured: form.featured,
    badge: form.badge || null, weightGrams: Number(form.weightGrams), lengthMm: form.lengthMm === null ? null : Number(form.lengthMm), widthMm: form.widthMm === null ? null : Number(form.widthMm), heightMm: form.heightMm === null ? null : Number(form.heightMm),
    images: form.imageUrl.trim() ? [{ url: form.imageUrl.trim(), altText: form.imageAlt.trim() }] : [],
  }
}

function validateForm(form: FormState, hasSelectedImage = false) {
  const errors: Record<string, string> = {}
  if (!form.name.trim()) errors.name = 'Name is required.'
  if (!form.description.trim()) errors.description = 'Description is required.'
  if (poundsToPence(form.priceInput) <= 0) errors.pricePence = 'Price must be greater than £0.'
  if (!Number.isFinite(Number(form.stockOnHand)) || Number(form.stockOnHand) < 0) errors.stockOnHand = 'Stock cannot be negative.'
  if (!Number.isFinite(Number(form.weightGrams)) || Number(form.weightGrams) <= 0) errors.weightGrams = 'Weight must be greater than 0.'
  if (!form.imageUrl.trim() && !hasSelectedImage) errors.imageUrl = 'Choose an image before saving.'
  if ((form.imageUrl.trim() || hasSelectedImage) && !form.imageAlt.trim()) errors.images = 'Image alt text is required.'
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{1,63}$/.test(form.sku)) errors.sku = 'A product reference could not be generated. Try a longer name.'
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) errors.slug = 'A product link could not be generated. Try a longer name.'
  return errors
}

function friendlyFieldError(field: string, value: string | string[]) {
  if (field === 'sku' || field === 'slug') return 'The product reference could not be generated from this name.'
  if (field === 'pricePence') return 'Price must be greater than £0.'
  if (field === 'stockOnHand') return 'Stock cannot be negative.'
  if (field === 'weightGrams') return 'Weight must be greater than 0.'
  if (field === 'description') return 'Description is required.'
  if (field === 'images' || field.endsWith('.altText')) return 'Image alt text is required.'
  if (field.startsWith('images[')) return 'The product image details need attention.'
  return Array.isArray(value) ? value.join(', ') : value
}

function frontendFieldName(field: string) {
  if (field.startsWith('images[') && field.endsWith('.url')) return 'imageUrl'
  if (field.startsWith('images[') && field.endsWith('.altText')) return 'images'
  return field
}

async function invalidatePublicCatalogue(queryClient: QueryClient, slugs: string[] = []) {
  await queryClient.invalidateQueries({ queryKey: productsQueryKey })
  await Promise.all([...new Set(slugs.filter(Boolean))].map(slug => queryClient.invalidateQueries({ queryKey: productQueryKey(slug) })))
}

function FieldLabel({ children, required = false, optional = false }: { children: ReactNode; required?: boolean; optional?: boolean }) {
  return <span className="mb-1 block font-bold">{children}{required && <span className="ml-1 text-accent" aria-hidden="true">*</span>}{optional && <span className="ml-1 font-normal text-gray-500">(optional)</span>}</span>
}

const adminBadgeClass = 'rounded border border-accent bg-sand px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand'
const adminButtonClass = 'rounded border border-accent bg-sand px-4 py-3 text-sm font-bold text-brand shadow-sm hover:bg-orange-50'

export function AdminProductsPage() {
  const queryClient = useQueryClient()
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

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

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return products.filter(product => {
      const matchesSearch = !query || [product.name, product.sku, product.slug, product.description].some(value => value.toLowerCase().includes(query))
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? product.active : !product.active)
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter
      return matchesSearch && matchesStatus && matchesCategory
    })
  }, [categoryFilter, products, search, statusFilter])

  return <main className="container-page py-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-gray-500"><Link to="/account">Account</Link> / Admin</p><div className="mt-2 flex items-center gap-3"><h1 className="text-3xl font-bold">Manage products</h1><span className={adminBadgeClass}>Admin</span></div><p className="mt-2 text-gray-600">Create and maintain the catalogue shown in the storefront.</p></div><Link to="/admin/products/new" className={adminButtonClass}>New product</Link></div>{error&&<div role="alert" className="mt-6 border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}{!loading&&<div className="mt-8 grid gap-4 border border-line bg-white p-4 sm:grid-cols-[2fr_1fr_1fr]"><label className="text-sm"><span className="mb-1 block font-bold">Search products</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, SKU or slug" className="w-full border border-line bg-white px-3 py-2.5"/></label><label className="text-sm"><span className="mb-1 block font-bold">Status</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')} className="w-full border border-line bg-white px-3 py-2.5"><option value="all">All products</option><option value="active">Active only</option><option value="inactive">Inactive only</option></select></label><label className="text-sm"><span className="mb-1 block font-bold">Category</span><select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} className="w-full border border-line bg-white px-3 py-2.5"><option value="all">All categories</option>{['FOOD','TREATS','TOYS','HEALTH','GROOMING','ACCESSORIES','WALKING'].map(value => <option key={value} value={value}>{value[0] + value.slice(1).toLowerCase()}</option>)}</select></label></div>}{loading?<p className="mt-8 border border-line p-10 text-center text-gray-600">Loading products…</p>:!filteredProducts.length?<p className="mt-8 border border-dashed border-line p-10 text-center text-gray-600">No products match your filters.</p>:<div className="mt-8 overflow-x-auto border border-line bg-white"><table className="w-full min-w-[820px] text-left text-sm"><thead className="border-b border-line bg-sand"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Featured</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-line">{filteredProducts.map(product => <tr key={product.id}><td className="px-4 py-4"><Link className="font-bold text-brand hover:underline" to={`/admin/products/${product.id}`}>{product.name}</Link><span className="block text-xs text-gray-500">{product.slug}</span></td><td className="px-4 py-4">{product.sku}</td><td className="px-4 py-4">£{(product.pricePence / 100).toFixed(2)}</td><td className="px-4 py-4">{product.stockOnHand}</td><td className="px-4 py-4">{product.featured ? 'Yes' : 'No'}</td><td className="px-4 py-4"><span className={product.active ? 'rounded bg-green-50 px-2 py-1 text-green-700' : 'rounded bg-red-50 px-2 py-1 text-red-700'}>{product.active ? 'Active' : 'Inactive'}</span></td><td className="whitespace-nowrap px-4 py-4 text-right"><button type="button" onClick={() => void toggle(product)} className="mr-3 text-xs font-bold underline">{product.active ? 'Deactivate' : 'Activate'}</button><Link className="text-xs font-bold text-brand underline" to={`/admin/products/${product.id}`}>Edit</Link></td></tr>)}</tbody></table></div>}</main>
}

export function AdminProductFormPage() {
  const queryClient = useQueryClient()
  const { id } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const [form, setForm] = useState<FormState>(blankProduct)
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [imageUploadFailed, setImageUploadFailed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!id) return
    let mounted = true
    void getAdminProduct(id).then(product => { if (mounted) { const nextForm = formFromProduct(product); setForm(nextForm); setImagePreviewUrl(nextForm.imageUrl); setActive(product.active) } }).catch(caught => { if (mounted) setError(apiMessage(caught, 'The product could not be loaded.')) }).finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [id])

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => setForm(current => ({ ...current, [field]: value }))
  const updateName = (name: string) => setForm(current => editing ? { ...current, name } : { ...current, name, sku: skuFromName(name), slug: slugFromName(name) })
  const fieldError = (field: string) => fieldErrors[field] ? <span className="field-error mt-1 block rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700">{fieldErrors[field]}</span> : null

  const handleImageSelection = (file: File | undefined) => {
    if (!file) return
    try {
      validateProductImage(file)
      const previewUrl = URL.createObjectURL(file)
      setError(null)
      setFieldErrors(current => ({ ...current, imageUrl: '' }))
      setImageUploadFailed(false)
      setSelectedImageFile(file)
      setSelectedImageName(file.name)
      setImagePreviewUrl(previewUrl)
    } catch (caught) {
      setError(null)
      setSelectedImageFile(null)
      setSelectedImageName(null)
      setImageUploadFailed(true)
      setFieldErrors(current => ({ ...current, imageUrl: caught instanceof Error ? caught.message : 'The image could not be selected.' }))
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(null)
    if (uploadingImage) return
    const clientErrors = validateForm(form, Boolean(selectedImageFile))
    setFieldErrors(clientErrors)
    if (Object.keys(clientErrors).length) return
    setSaving(true)
    try {
      const previousSlug = form.slug
      let formToSave = form
      if (selectedImageFile) {
        setUploadingImage(true)
        try {
          const uploadedUrl = await uploadProductImage(selectedImageFile)
          formToSave = { ...form, imageUrl: uploadedUrl }
          setField('imageUrl', uploadedUrl)
          setImagePreviewUrl(uploadedUrl)
          setImageUploadFailed(false)
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : 'The image could not be uploaded.'
          setImageUploadFailed(true)
          setFieldErrors(current => ({ ...current, imageUrl: message }))
          return
        } finally {
          setUploadingImage(false)
        }
      }
      const saved = editing ? await updateAdminProduct(id!, toInput(formToSave)) : await createAdminProduct(toInput(formToSave))
      await invalidatePublicCatalogue(queryClient, editing ? [previousSlug, saved.slug] : [])
      setSelectedImageFile(null)
      setSelectedImageName(null)
      navigate('/admin/products', { replace: true })
    } catch (caught) {
      setError(apiMessage(caught, editing ? 'The product could not be updated.' : 'The product could not be created.'))
      if (caught instanceof BackendApiError && caught.fieldErrors) setFieldErrors(Object.fromEntries(Object.entries(caught.fieldErrors).map(([field, value]) => [frontendFieldName(field), friendlyFieldError(field, value)])))
    } finally { setSaving(false) }
  }

  const toggle = async () => {
    if (!id) return
    setError(null)
    try { const updated = await setProductActivation(id, !active); setActive(updated.active); await invalidatePublicCatalogue(queryClient, [form.slug]) }
    catch (caught) { setError(apiMessage(caught, 'The product visibility could not be changed.')) }
  }

  const inputClass = 'w-full border border-line bg-white px-3 py-2.5'
  if (loading) return <main className="container-page py-20 text-center text-gray-600">Loading product…</main>

  return <main className="container-page py-10"><div className="flex flex-wrap items-center justify-between gap-3"><Link to="/admin/products" className="text-sm font-bold text-brand underline">← Back to products</Link><span className="text-sm text-gray-500">{editing ? 'Edit product' : 'New product'}</span></div><div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><div className="flex items-center gap-3"><h1 className="text-3xl font-bold">{editing ? 'Edit product' : 'New product'}</h1><span className={adminBadgeClass}>Admin</span></div><p className="mt-2 text-gray-600">Keep the product details simple. Product references are generated automatically.</p></div>{editing&&<div className="flex items-center gap-3"><span className={active ? 'text-sm font-bold text-green-700' : 'text-sm font-bold text-gray-500'}>{active ? 'Active on storefront' : 'Inactive on storefront'}</span><button type="button" onClick={() => void toggle()} className={active ? 'btn-secondary' : adminButtonClass}>{active ? 'Deactivate product' : 'Activate product'}</button></div>}</div>{error&&<div role="alert" className="mt-6 border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}<form onSubmit={submit} className="mt-8 grid gap-5 border border-line bg-white p-6 shadow-card sm:grid-cols-2"><label className="text-sm sm:col-span-2"><FieldLabel required>Name</FieldLabel><input required value={form.name} onChange={event => updateName(event.target.value)} className={inputClass}/>{fieldError('name')}</label><label className="text-sm sm:col-span-2"><FieldLabel required>Description</FieldLabel><textarea required rows={5} value={form.description} onChange={event => setField('description', event.target.value)} className={inputClass}/>{fieldError('description')}</label><label className="text-sm"><FieldLabel required>Pet</FieldLabel><select required value={form.pet} onChange={event => setField('pet', event.target.value)} className={inputClass}><option value="CATS">Cats</option><option value="DOGS">Dogs</option><option value="BIRDS">Birds</option></select>{fieldError('pet')}</label><label className="text-sm"><FieldLabel required>Category</FieldLabel><select required value={form.category} onChange={event => setField('category', event.target.value)} className={inputClass}>{['FOOD','TREATS','TOYS','HEALTH','GROOMING','ACCESSORIES','WALKING'].map(value => <option key={value} value={value}>{value[0] + value.slice(1).toLowerCase()}</option>)}</select>{fieldError('category')}</label><label className="text-sm"><FieldLabel required>Price (£)</FieldLabel><input required min="0" step="0.01" inputMode="decimal" type="number" value={form.priceInput} onChange={event => setField('priceInput', event.target.value)} placeholder="14.99" className={inputClass}/>{fieldError('pricePence')}</label><label className="text-sm"><FieldLabel required>Stock on hand</FieldLabel><input required min="0" type="text" inputMode="numeric" value={form.stockOnHand} onFocus={event => event.currentTarget.select()} onChange={event => { if (/^\d*$/.test(event.target.value)) setField('stockOnHand', Number(event.target.value || 0)) }} className={inputClass}/>{fieldError('stockOnHand')}</label><label className="text-sm"><FieldLabel required>Weight (grams)</FieldLabel><input required min="1" type="number" value={form.weightGrams} onChange={event => setField('weightGrams', Number(event.target.value || 0))} className={inputClass}/>{fieldError('weightGrams')}</label><label className="text-sm"><FieldLabel optional>Badge</FieldLabel><select value={form.badge ?? ''} onChange={event => setField('badge', event.target.value || null)} className={inputClass}><option value="">None</option><option value="popular">Popular</option><option value="new">New</option><option value="offer">Offer</option></select>{fieldError('badge')}</label><label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" checked={form.featured} onChange={event => setField('featured', event.target.checked)}/><span>Featured product <span className="font-normal text-gray-500">(optional)</span></span></label><div className="sm:col-span-2"><details><summary className="cursor-pointer text-sm font-bold text-brand">Package dimensions <span className="font-normal text-gray-500">(optional)</span></summary><div className="mt-3 grid gap-4 sm:grid-cols-3"><label className="text-sm"><FieldLabel optional>Length (mm)</FieldLabel><input min="0" type="number" value={form.lengthMm ?? ''} onChange={event => setField('lengthMm', event.target.value === '' ? null : Number(event.target.value))} className={inputClass}/>{fieldError('lengthMm')}</label><label className="text-sm"><FieldLabel optional>Width (mm)</FieldLabel><input min="0" type="number" value={form.widthMm ?? ''} onChange={event => setField('widthMm', event.target.value === '' ? null : Number(event.target.value))} className={inputClass}/>{fieldError('widthMm')}</label><label className="text-sm"><FieldLabel optional>Height (mm)</FieldLabel><input min="0" type="number" value={form.heightMm ?? ''} onChange={event => setField('heightMm', event.target.value === '' ? null : Number(event.target.value))} className={inputClass}/>{fieldError('heightMm')}</label></div></details></div><div className="space-y-4 sm:col-span-2"><label className="text-sm"><FieldLabel required={!form.imageUrl.trim()} optional={Boolean(form.imageUrl.trim())}>Image file</FieldLabel><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" capture="environment" disabled={uploadingImage} onClick={event => { event.currentTarget.value = '' }} onChange={event => { handleImageSelection(event.target.files?.[0]) }} className="block w-full border border-line bg-white px-3 py-2.5 text-sm"/>{selectedImageName&&<span className="mt-1 block text-xs text-gray-600">Selected: {selectedImageName}</span>}{uploadingImage&&<span className="mt-1 block text-xs text-gray-600">Uploading image…</span>}<span className="mt-1 block text-xs text-gray-500">Choose JPG, PNG, WebP or AVIF, up to {maxProductImageBytes / 1024 / 1024} MB. The image uploads when you save.</span>{(imagePreviewUrl || form.imageUrl)&&<img src={imagePreviewUrl || form.imageUrl} alt={form.imageAlt || form.name || 'Product preview'} className="mt-3 h-32 w-32 rounded border border-line object-cover"/>}{imageUploadFailed&&<span className="mt-2 block text-xs font-bold text-red-700">The new image was not uploaded. Please try again.</span>}{form.imageUrl&&!uploadingImage&&!imageUploadFailed&&!selectedImageFile&&<span className="mt-2 block text-xs font-bold text-green-700">Current image saved.</span>}{fieldError('imageUrl')}</label><label className="text-sm"><FieldLabel required>Image alt text</FieldLabel><input required value={form.imageAlt} onChange={event => setField('imageAlt', event.target.value)} className={inputClass}/>{fieldError('images')}</label></div><div className="flex items-center gap-3 sm:col-span-2"><button className="btn-primary" disabled={saving||uploadingImage}>{uploadingImage ? 'Uploading image…' : saving ? 'Saving…' : editing ? 'Save changes' : 'Create product'}</button><Link to="/admin/products" className="btn-secondary">Cancel</Link>{!editing&&<span className="text-xs text-gray-500">New products start inactive.</span>}</div></form></main>
}
