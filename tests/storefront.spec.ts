import { expect, test, type Page } from '@playwright/test'
import type { ApiProduct, ApiProductDetail, DeliveryQuote } from '../src/lib/api'
import { catalogFilters, filterCatalog, searchScore } from '../src/lib/catalog'
import { apiProductToProduct } from '../src/lib/product'

const products: ApiProduct[] = [
  ['Dry Chicken Meal', 'Dogs', 'Food', 1400, true, true, null, 'Nutritious kibble.\nServe fresh water alongside.', 'DOG-CHICKEN-01'],
  ['Salmon Supper', 'Cats', 'Food', 600, false, true, null, 'A fish recipe for adult cats.', 'CAT-SALMON-02'],
  ['Crunchy Training Bites', 'Dogs', 'Treats', 400, true, true, 'Offer', 'Small chicken rewards for training.', 'DOG-BITES-03'],
  ['Feather Wand', 'Cats', 'Toys', 300, false, true, null, 'Interactive playtime.', 'CAT-WAND-04'],
  ['Cage Perch', 'Birds', 'Accessories', 900, false, true, null, 'Comfort for your cage.', 'BIRD-PERCH-05'],
  ['Gentle Brush', 'Dogs', 'Grooming', 1100, false, true, null, 'Care for their coat.', 'DOG-BRUSH-06'],
  ['Daily Care', 'Dogs', 'Health', 800, true, false, null, 'Everyday care essentials.', 'DOG-CARE-07'],
  ['Trail Lead', 'Dogs', 'Walking', 1200, false, true, null, 'For everyday walks.', 'DOG-LEAD-08'],
  ['Bird Seed', 'Birds', 'Food', 700, false, true, null, 'A seed mix for birds.', 'BIRD-SEED-09'],
].map(([name, pet, category, amount, featured, available, badge, description, sku], index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  name: String(name), slug: String(name).toLowerCase().replaceAll(' ', '-'), sku: String(sku), description: String(description),
  pet: String(pet), category: String(category), price: { amount: Number(amount), currency: 'GBP' }, featured: Boolean(featured), available: Boolean(available),
  badge: badge ? String(badge) : null, image: { url: '/brand/mypetfood-logo.jpeg', altText: String(name) }, ratingAverage: null, reviewCount: 0,
}))
const defaultQuotes: DeliveryQuote[] = [
  { code: 'standard', name: 'Standard delivery', price: { amount: 395, currency: 'GBP' }, estimatedBusinessDays: { min: 2, max: 4 } },
  { code: 'express', name: 'Express delivery', price: { amount: 595, currency: 'GBP' }, estimatedBusinessDays: { min: 1, max: 2 } },
]

async function fixture(page: Page, options: { emptyContent?: boolean; basket?: Array<{ product: ReturnType<typeof apiProductToProduct>; quantity: number }>; catalogueError?: boolean; missingFirstImage?: boolean; detail?: Partial<ApiProductDetail> } = {}) {
  if (options.basket) await page.addInitScript(basket => { if (!localStorage.getItem('mypetfood-cart')) localStorage.setItem('mypetfood-cart', JSON.stringify(basket)) }, options.basket)
  const calls: any[] = []
  let quotes = defaultQuotes, failure: { code: string; message: string; status: number; retry?: string } | null = null
  let delay: Promise<void> | null = null, release: (() => void) | undefined
  let catalogueError = options.catalogueError ?? false
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url())
    if (url.hostname !== 'api.test') return url.hostname === '127.0.0.1' ? route.continue() : route.abort()
    const reply = (json: unknown, status = 200, headers = {}) => route.fulfill({ status, json, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Expose-Headers': 'X-Request-Id, Retry-After', 'X-Request-Id': 'test-request', ...headers } })
    if (request.method() === 'OPTIONS') return reply({})
    if (url.pathname === '/v1/products') return catalogueError ? reply({ error: { message: 'Catalogue temporarily unavailable' } }, 503) : reply({ data: products, hasMore: false })
    if (url.pathname.startsWith('/v1/products/')) {
      const product = products.find(product => url.pathname.endsWith(`/${product.slug}`))
      return product ? reply({ product, images: [{ url: options.missingFirstImage ? '/missing-test-package.jpeg' : '/brand/mypetfood-logo.jpeg', altText: 'Front of package', position: 0 }, { url: '/brand/mypetfood-logo.jpeg?back', altText: 'Back of package', position: 1 }], weightGrams: 1500, lengthMm: null, widthMm: null, heightMm: null, ...options.detail }) : reply({ error: { message: 'Not found' } }, 404)
    }
    if (url.pathname === '/v1/content/site') return reply({ contact: { email: '', phones: [], address: { line1: '', line2: '', townCity: '', county: '', postcode: '', country: '' }, openingHours: '', responseTime: '', version: 0, updatedAt: '2026-10-06T12:00:00Z' }, footer: { tagline: '', groups: [{ title: 'Help', links: [{ label: 'Delivery', route: '/delivery', active: true }] }], version: 0, updatedAt: '2026-10-06T12:00:00Z' } })
    if (url.pathname.startsWith('/v1/content/pages/')) {
      const slug = url.pathname.split('/').at(-1)
      return reply({ slug, title: slug === 'our-story' ? 'Our Story' : 'Pet Care Guides', intro: options.emptyContent ? '' : 'Approved shop story, written by the business.', sections: options.emptyContent ? [] : [
        { heading: 'Feeding your cat', body: 'Approved cat feeding guide.', bullets: [] },
        { heading: 'A draft heading', body: '', bullets: [] },
        { heading: 'Walking your dog', body: 'Approved dog walking guide.', bullets: [] },
        { heading: 'Caring for birds', body: 'Approved bird care guide.', bullets: [] },
        { heading: 'More advice', body: 'Another published guide.', bullets: [] },
      ], version: 0, updatedAt: '2026-10-06T12:00:00Z' })
    }
    if (url.pathname === '/v1/delivery-quotes') {
      calls.push(request.postDataJSON())
      const responseQuotes = quotes, responseFailure = failure
      if (delay) await delay
      if (responseFailure) return reply({ error: { code: responseFailure.code, message: responseFailure.message, requestId: 'test-request' } }, responseFailure.status, responseFailure.retry ? { 'Retry-After': responseFailure.retry } : {})
      return reply({ data: responseQuotes })
    }
    return reply({ error: { message: `Unexpected test request: ${url.pathname}` } }, 404)
  })
  return { calls, setQuotes: (value: DeliveryQuote[]) => { quotes = value }, fail: (value: typeof failure) => { failure = value }, pause: () => { delay = new Promise(resolve => { release = resolve }) }, resume: () => { release?.(); delay = null }, recoverCatalogue: () => { catalogueError = false } }
}

const cards = (page: Page) => page.locator('main article')
const basket = (index = 0, quantity = 1) => [{ product: apiProductToProduct(products[index]), quantity }]
async function search(page: Page, query: string) {
  const form = page.getByRole('search', { name: 'Search products', exact: true }).filter({ visible: true })
  await form.getByRole('searchbox').fill(query)
  await form.getByRole('button', { name: 'Search', exact: true }).click()
}
async function navigate(page: Page, label: string) {
  const mobile = page.getByRole('button', { name: 'Open navigation' })
  if (await mobile.isVisible()) { await mobile.click(); await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: label, exact: true }).click() }
  else await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: label, exact: true }).click()
}

test('catalogue matching covers all words, SKU, descriptions and pet/category aliases', () => {
  const catalogue = products.map(apiProductToProduct)
  expect(searchScore(catalogue[0], 'DOGS chicken food')).not.toBeNull()
  expect(searchScore(catalogue[0], 'DOG CHICKEN 01')).not.toBeNull()
  expect(searchScore(catalogue[0], 'fresh water')).not.toBeNull()
  expect(searchScore(catalogue[0], 'chicken salmon')).toBeNull()
  expect(filterCatalog(catalogue, catalogFilters(new URLSearchParams('category=food&category=Treats')))).toHaveLength(4)
})

test('repeated header searches commit fresh queries, normalize whitespace and survive history/reload', async ({ page }) => {
  await fixture(page); await page.goto('/')
  await search(page, '  DOGS   chicken  ')
  await expect(page.locator('main h1')).toHaveText('Results for “DOGS chicken”')
  await expect(cards(page)).toHaveCount(2)
  await search(page, 'cats salmon')
  await expect(cards(page)).toHaveCount(1); await expect(cards(page)).toContainText('Salmon Supper')
  await page.goBack(); await expect(page.locator('main h1')).toHaveText('Results for “DOGS chicken”')
  await page.goForward(); await expect(cards(page)).toHaveCount(1)
  await page.reload(); await expect(page.getByRole('searchbox', { name: 'Search this collection' })).toHaveValue('cats salmon')
  await search(page, ''); await expect(cards(page)).toHaveCount(9)
})

test('grouped navigation and Offers use their actual filters', async ({ page }) => {
  await fixture(page); await page.goto('/')
  for (const [label, count] of [['Food & Treats', 4], ['Health & Care', 2], ['Toys & Accessories', 3], ['Offers', 1]] as const) {
    await navigate(page, label)
    await expect(cards(page)).toHaveCount(count)
    if (label === 'Offers') await expect(page).toHaveURL(/offer=true/)
  }
  const help = page.getByRole('link', { name: 'Help', exact: true })
  if (await help.isVisible()) { await help.click(); await expect(page).toHaveURL(/\/faqs$/) }
})

test('bird accessories and desktop dropdown keyboard controls', async ({ page }) => {
  await fixture(page); await page.goto('/')
  const mobile = page.getByRole('button', { name: 'Open navigation' })
  if (await mobile.isVisible()) { await mobile.click(); await page.getByRole('dialog').getByRole('link', { name: 'Cage Accessories' }).click() }
  else {
    const button = page.getByRole('button', { name: 'Browse birds categories' })
    await button.focus(); await page.keyboard.press('Enter'); await expect(button).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Escape'); await expect(button).toBeFocused(); await expect(button).toHaveAttribute('aria-expanded', 'false')
    await button.press('Enter'); await page.getByRole('link', { name: 'Cage Accessories' }).click()
  }
  await expect(cards(page)).toHaveCount(1); await expect(cards(page)).toContainText('Cage Perch')
  await expect(page).toHaveURL(/category=Accessories/)
})

test('category pages share URL filters, featured/price sorting, and empty-state reset', async ({ page }) => {
  await fixture(page); await page.goto('/category/dogs')
  await expect(cards(page)).toHaveCount(5)
  await expect(cards(page).first()).toContainText('Dry Chicken Meal')
  await page.getByRole('combobox', { name: 'Sort products' }).selectOption('low')
  await expect(cards(page).first()).toContainText('Crunchy Training Bites')
  await page.getByRole('combobox', { name: 'Sort products' }).selectOption('high')
  await expect(cards(page).first()).toContainText('Dry Chicken Meal')
  await page.getByLabel('Available now', { exact: true }).click(); await expect(page.getByLabel('Available now', { exact: true })).toBeChecked(); await expect(cards(page)).toHaveCount(4)
  await page.getByText('Categories', { exact: true }).click()
  await page.getByLabel('Food', { exact: true }).click(); await expect(page.getByLabel('Food', { exact: true })).toBeChecked(); await expect(cards(page)).toHaveCount(1)
  await page.reload(); await expect(cards(page)).toHaveCount(1)
  await expect(page.getByLabel('Food', { exact: true })).toBeChecked()
  const form = page.getByRole('search', { name: 'Search this collection' })
  await form.getByRole('searchbox').fill('nonexistent'); await form.getByRole('button', { name: 'Search' }).click()
  await expect(page.getByRole('heading', { name: /No products match/ })).toBeVisible()
  await page.getByRole('button', { name: 'Clear search and filters' }).click()
  await expect(cards(page)).toHaveCount(5); await expect(page.locator('main h1')).toHaveText('Dogs products')
})

test('homepage uses published teasers, real featured products and correct guide anchors', async ({ page }) => {
  await fixture(page); await page.goto('/')
  await expect(page.locator('main h1')).toHaveText('Shop pet supplies')
  await expect(page.getByRole('region', { name: 'Shop products', exact: true }).locator('article')).toHaveCount(9)
  await expect(page.getByRole('region', { name: 'About the business' })).toContainText('Approved shop story')
  const guides = page.getByRole('region', { name: 'Helpful guides' })
  await expect(guides.locator('h3')).toHaveCount(3)
  await expect(guides).not.toContainText('A draft heading')
  await guides.getByRole('link', { name: /Walking your dog/ }).click()
  await expect(page).toHaveURL(/\/guides#section-3$/)
  await expect(page.locator('#section-3')).toBeInViewport()
  await page.reload(); await expect(page.locator('#section-3')).toBeInViewport()
})

test('homepage does not publish empty story/guide placeholders', async ({ page }) => {
  await fixture(page, { emptyContent: true }); await page.goto('/')
  await expect(cards(page)).toHaveCount(9)
  await expect(page.getByRole('region', { name: 'About the business' })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Helpful guides' })).toHaveCount(0)
  await expect(page.getByRole('searchbox').filter({ visible: true })).toHaveCount(1)
})

test('product gallery, weight, description layout and quantity bounds', async ({ page }) => {
  await fixture(page); await page.goto('/product/dry-chicken-meal')
  await expect(page.getByRole('region', { name: 'Order this product' })).toContainText('1.5 kg')
  await expect(page.getByText('Nutritious kibble.\nServe fresh water alongside.', { exact: true })).toHaveCSS('white-space', 'pre-wrap')
  await page.getByRole('button', { name: 'Show product image 2' }).click()
  await expect(page.getByRole('region', { name: 'Product images' }).getByRole('img', { name: 'Back of package', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Delivery information', exact: true }).last()).toHaveAttribute('href', '/delivery')
  await expect(page.getByRole('button', { name: 'Decrease quantity', exact: true })).toBeDisabled()
  await page.getByRole('spinbutton', { name: 'Quantity', exact: true }).fill('1000')
  await expect(page.getByRole('spinbutton')).toHaveValue('99')
  await expect(page.getByRole('button', { name: 'Increase quantity', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Add to basket', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Your basket' })).toBeVisible()
  await expect(page.getByRole('dialog').getByLabel('Quantity of Dry Chicken Meal', { exact: true })).toHaveText('99')
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Add to basket', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Buy now', exact: true })).toBeDisabled()
  await page.reload(); await page.getByRole('button', { name: 'Open basket' }).click()
  await expect(page.getByRole('dialog').getByLabel('Quantity of Dry Chicken Meal', { exact: true })).toHaveText('99')
})

test('basket modal contains focus, handles Escape, restores focus and hides closed content', async ({ page }) => {
  await fixture(page, { basket: basket() }); await page.goto('/shop')
  const opener = page.getByRole('button', { name: 'Open basket', exact: true })
  await opener.click(); const dialog = page.getByRole('dialog', { name: 'Your basket' })
  await expect(dialog).toBeVisible()
  for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true) }
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible(); await expect(opener).toBeFocused()
  await expect(page.getByRole('button', { name: 'Close basket' })).toHaveCount(0)
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
})

test('gallery recovers when a failed first image is replaced by another image', async ({ page }) => {
  await fixture(page, { missingFirstImage: true }); await page.goto('/product/dry-chicken-meal')
  const gallery = page.getByRole('region', { name: 'Product images' })
  await expect(gallery.getByText('No image available').first()).toBeVisible()
  await page.getByRole('button', { name: 'Show product image 2' }).click()
  await expect(gallery.getByRole('img', { name: 'Back of package', exact: true })).toBeVisible()
})

test('mobile menu contains focus and restores its opener on Escape', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile-only menu')
  await fixture(page); await page.goto('/')
  const opener = page.getByRole('button', { name: 'Open navigation' }); await opener.click()
  const dialog = page.getByRole('dialog', { name: 'My Pet Food', exact: true })
  for (let i = 0; i < 35; i++) { await page.keyboard.press('Tab'); expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true) }
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible(); await expect(opener).toBeFocused()
})

test('persisted quantities clamp/merge, and unavailable products stay visible until removed', async ({ page }) => {
  const removed = { ...apiProductToProduct(products[0]), id: 'removed-product', name: 'Discontinued item' }
  await fixture(page, { basket: [...basket(0, 500), ...basket(0, 2), ...basket(6), { product: removed, quantity: 1 }] })
  await page.goto('/basket')
  await expect(page.getByLabel('Quantity of Dry Chicken Meal', { exact: true })).toHaveText('99')
  await expect(page.getByRole('button', { name: 'Increase quantity of Dry Chicken Meal' })).toBeDisabled()
  await expect(page.locator('main')).toContainText('No longer available in the shop')
  await expect(page.locator('main')).toContainText('Currently unavailable. Remove this item')
  await expect(page.getByRole('button', { name: 'Proceed to checkout' })).toBeDisabled()
  await page.getByRole('button', { name: 'Remove Discontinued item', exact: true }).click()
  await page.getByRole('button', { name: 'Remove Daily Care', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Proceed to checkout' })).toBeVisible()
})

test('delivery validates postcode, sends exact basket, selects options and invalidates on edits', async ({ page }) => {
  const mock = await fixture(page, { basket: basket(0, 2) }); await page.goto('/basket')
  await page.getByRole('button', { name: 'Check delivery options' }).click()
  await expect(page.getByRole('alert')).toContainText('Enter a full UK postcode')
  expect(mock.calls).toHaveLength(0)
  await page.getByLabel('Delivery postcode').fill(' sw1a 1aa ')
  await page.getByRole('button', { name: 'Check delivery options' }).click()
  await expect(page.getByRole('radio')).toHaveCount(2)
  expect(mock.calls[0]).toEqual({ postcode: 'SW1A1AA', countryCode: 'GB', items: [{ productId: products[0].id, quantity: 2 }] })
  await expect(page.locator('main')).not.toContainText('Estimated total')
  await page.getByRole('radio', { name: /Standard delivery/ }).check()
  await expect(page.getByRole('status')).toContainText('£31.95')
  await page.getByRole('radio', { name: /Express delivery/ }).check()
  await expect(page.getByRole('status')).toContainText('£33.95')
  await page.getByRole('button', { name: 'Increase quantity of Dry Chicken Meal' }).click()
  await expect(page.getByRole('radio')).toHaveCount(0); await expect(page.locator('main')).not.toContainText('Estimated total')
  await page.getByRole('button', { name: 'Check delivery options' }).click()
  await page.getByRole('radio', { name: /Standard delivery/ }).check()
  await expect(page.getByRole('status')).toContainText('£45.95')
  await page.getByLabel('Delivery postcode').fill('M1 1AE')
  await expect(page.getByRole('radio')).toHaveCount(0)
})

test('free delivery is shown only when quoted, not as a hardcoded threshold', async ({ page }) => {
  const mock = await fixture(page, { basket: basket() }); mock.setQuotes([{ ...defaultQuotes[0], price: { amount: 0, currency: 'GBP' } }])
  await page.goto('/basket'); await page.getByLabel('Delivery postcode').fill('SW1A 1AA')
  await expect(page.locator('body')).not.toContainText('£45')
  await page.getByRole('button', { name: 'Check delivery options' }).click()
  await page.getByRole('radio', { name: /Standard delivery Free/ }).check()
  await expect(page.getByRole('status')).toContainText('£14.00')
})

test('late delivery responses cannot resurrect an estimate for an old postcode', async ({ page }) => {
  const mock = await fixture(page, { basket: basket() }); mock.pause()
  await page.goto('/basket'); await page.getByLabel('Delivery postcode').fill('SW1A 1AA')
  await page.getByRole('button', { name: 'Check delivery options' }).click()
  await expect.poll(() => mock.calls.length).toBe(1)
  await page.getByLabel('Delivery postcode').fill('M1 1AE'); mock.resume()
  await expect(page.getByRole('button', { name: 'Check delivery options' })).toBeEnabled()
  await expect(page.getByRole('radio')).toHaveCount(0)
  await page.getByRole('button', { name: 'Check delivery options' }).click()
  await expect(page.getByRole('radio')).toHaveCount(2)
  expect(mock.calls[1].postcode).toBe('M11AE')
})

test('delivery stock errors are actionable and block proceeding until the basket changes', async ({ page }) => {
  const mock = await fixture(page, { basket: basket(0, 2) }); mock.fail({ code: 'INSUFFICIENT_STOCK', message: 'Only one Dry Chicken Meal is available.', status: 409 })
  await page.goto('/basket'); await page.getByLabel('Delivery postcode').fill('SW1A 1AA'); await page.getByRole('button', { name: 'Check delivery options' }).click()
  await expect(page.getByRole('alert')).toContainText('Only one Dry Chicken Meal')
  await expect(page.getByRole('alert')).toContainText('test-request')
  await expect(page.getByRole('button', { name: 'Proceed to checkout' })).toBeDisabled()
  await page.getByLabel('Delivery postcode').fill('M1 1AE')
  await expect(page.getByRole('button', { name: 'Proceed to checkout' })).toBeDisabled()
  mock.fail(null); await page.getByRole('button', { name: 'Decrease quantity of Dry Chicken Meal' }).click()
  await page.getByRole('button', { name: 'Check delivery options' }).click()
  await expect(page.getByRole('radio')).toHaveCount(2)
  await expect(page.getByRole('link', { name: 'Proceed to checkout' })).toBeVisible()
})

test('rate-limited delivery retains the draft postcode and exposes a retry countdown', async ({ page }) => {
  const mock = await fixture(page, { basket: basket() }); mock.fail({ code: 'RATE_LIMITED', message: 'Please wait before checking again.', status: 429, retry: '30' })
  await page.goto('/basket'); await page.getByLabel('Delivery postcode').fill('SW1A 1AA'); await page.getByRole('button', { name: 'Check delivery options' }).click()
  await expect(page.getByRole('button', { name: /Try again in \d+s/ })).toBeDisabled()
  await expect(page.getByLabel('Delivery postcode')).toHaveValue('SW1A 1AA')
  await expect(page.locator('main')).not.toContainText('Estimated total')
})

test('catalogue failure blocks checkout, supports retry and preserves basket lines', async ({ page }) => {
  const mock = await fixture(page, { basket: basket(), catalogueError: true }); await page.goto('/basket')
  await expect(page.getByRole('alert')).toContainText('We cannot check availability')
  await expect(page.getByRole('button', { name: 'Proceed to checkout' })).toBeDisabled()
  mock.recoverCatalogue(); await page.getByRole('button', { name: 'Refresh availability' }).click()
  await expect(page.getByRole('link', { name: 'Proceed to checkout' })).toBeVisible()
  await expect(page.getByLabel('Quantity of Dry Chicken Meal', { exact: true })).toHaveText('1')
})

test('checkout guards direct visits with unavailable/empty baskets', async ({ page }) => {
  await fixture(page, { basket: basket(6) }); await page.goto('/checkout')
  await expect(page.getByRole('heading', { name: 'Check your basket first' })).toBeVisible()
  await page.getByRole('link', { name: 'Back to basket' }).click()
  await page.getByRole('button', { name: 'Remove Daily Care', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your basket is empty' })).toBeVisible()
})

test('primary storefront screens have no horizontal overflow, including narrow mobile', async ({ page, isMobile }) => {
  await fixture(page, { basket: basket() })
  if (isMobile) await page.setViewportSize({ width: 320, height: 700 })
  for (const route of ['/', '/shop', '/category/birds', '/product/dry-chicken-meal', '/basket']) {
    await page.goto(route); await expect(page.locator('main h1')).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})

test('empty, malformed and failed delivery responses never produce a fabricated total', async ({ page }) => {
  const mock = await fixture(page, { basket: basket() }); mock.setQuotes([])
  await page.goto('/basket'); await page.getByLabel('Delivery postcode').fill('SW1A 1AA')
  await page.getByRole('button', { name: 'Check delivery options' }).click()
  await expect(page.getByRole('status')).toContainText('No delivery options were returned')
  mock.setQuotes([{ ...defaultQuotes[0], price: { amount: -100, currency: 'GBP' } }])
  await page.getByRole('button', { name: 'Check delivery options' }).click()
  await expect(page.getByRole('alert')).toContainText('Delivery information could not be read')
  await expect(page.getByRole('radio')).toHaveCount(0)
  mock.fail({ code: 'SERVICE_UNAVAILABLE', message: 'Delivery is temporarily unavailable.', status: 503 })
  await page.getByRole('button', { name: 'Check delivery options' }).click()
  await expect(page.getByRole('alert')).toContainText('Delivery is temporarily unavailable')
  await expect(page.getByLabel('Delivery postcode')).toHaveValue('SW1A 1AA')
  await expect(page.locator('main')).not.toContainText('Estimated total')
  mock.fail(null); mock.setQuotes(defaultQuotes)
  await page.getByRole('button', { name: 'Check delivery options' }).click()
  await expect(page.getByRole('radio')).toHaveCount(2)
})

test('late delivery responses are also discarded when basket quantities change', async ({ page }) => {
  const mock = await fixture(page, { basket: basket() }); mock.pause()
  await page.goto('/basket'); await page.getByLabel('Delivery postcode').fill('SW1A 1AA')
  await page.getByRole('button', { name: 'Check delivery options' }).click()
  await expect.poll(() => mock.calls.length).toBe(1)
  await page.getByRole('button', { name: 'Increase quantity of Dry Chicken Meal' }).click(); mock.resume()
  await expect(page.getByRole('button', { name: 'Check delivery options' })).toBeEnabled()
  await expect(page.getByRole('radio')).toHaveCount(0)
  await page.getByRole('button', { name: 'Check delivery options' }).click()
  await expect(page.getByRole('radio')).toHaveCount(2)
  expect(mock.calls[1].items[0].quantity).toBe(2)
})

test('product cards open details and gallery arrows/keyboard wrap between images', async ({ page }) => {
  await fixture(page); await page.goto('/shop')
  await expect(page.getByRole('button', { name: /^Add/ })).toHaveCount(0)
  await page.getByRole('link', { name: 'View Dry Chicken Meal', exact: true }).click()
  await expect(page.locator('main h1')).toHaveText('Dry Chicken Meal')
  const gallery = page.getByRole('region', { name: 'Product images' })
  await gallery.getByRole('button', { name: 'Next product image' }).click()
  await expect(gallery.getByRole('img', { name: 'Back of package' })).toBeVisible()
  await gallery.getByRole('button', { name: 'Next product image' }).click()
  await expect(gallery.getByRole('img', { name: 'Front of package' })).toBeVisible()
  await gallery.focus(); await gallery.press('ArrowLeft')
  await expect(gallery.getByRole('img', { name: 'Back of package' })).toBeVisible()
  await gallery.getByRole('button', { name: 'Previous product image' }).click()
  await expect(gallery.getByRole('img', { name: 'Front of package' })).toBeVisible()
})

test('product accordions open with keyboard and similar products stay relevant', async ({ page }) => {
  await fixture(page, { detail: { lengthMm: 250, widthMm: 120, heightMm: 60 } }); await page.goto('/product/dry-chicken-meal')
  const details = page.getByRole('region', { name: 'Product details', exact: true })
  await expect(details.locator('details[open]')).toHaveCount(0)
  const specs = details.locator('summary').filter({ hasText: 'Product specifications' })
  await specs.focus(); await specs.press('Enter')
  await expect(details.getByText('250 mm', { exact: true })).toBeVisible()
  await specs.press('Enter'); await expect(details.getByText('250 mm', { exact: true })).not.toBeVisible()
  await page.getByRole('button', { name: 'No reviews yet', exact: true }).click()
  await expect(details.getByText('No customer reviews yet.', { exact: true })).toBeVisible()
  await details.locator('summary').filter({ hasText: 'Seller information' }).click()
  await expect(details.getByText('Sold by My Pet Food', { exact: true })).toBeVisible()
  const related = page.getByRole('region', { name: 'Similar products' })
  await expect(related.locator('article')).toHaveCount(3)
  await expect(related).not.toContainText('Dry Chicken Meal')
  await expect(related).not.toContainText('Daily Care')
  await related.getByRole('link', { name: 'View Crunchy Training Bites', exact: true }).click()
  await expect(page.locator('main h1')).toHaveText('Crunchy Training Bites')
  await expect(page.getByRole('spinbutton', { name: 'Quantity', exact: true })).toHaveValue('1')
})

test('buy now adds the selected quantity, preserves other items and opens checkout without a drawer', async ({ page }) => {
  await fixture(page, { basket: basket(1, 1) }); await page.goto('/product/dry-chicken-meal')
  await page.getByRole('spinbutton', { name: 'Quantity', exact: true }).fill('2')
  await page.getByRole('button', { name: 'Buy now', exact: true }).click()
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('main')).toContainText('3 items in basket')
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mypetfood-cart') ?? '[]'))
  expect(saved.find((item: any) => item.product.id === products[0].id).quantity).toBe(2)
  expect(saved.find((item: any) => item.product.id === products[1].id).quantity).toBe(1)
})

test('unavailable products remain viewable but cannot be purchased', async ({ page }) => {
  await fixture(page); await page.goto('/shop')
  await page.getByRole('link', { name: 'View Daily Care', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Currently unavailable', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Buy now', exact: true })).toBeDisabled()
})

test('optional backend size choices select the real product and checkout ID', async ({ page }) => {
  await fixture(page, { detail: { sizeLabel: 'Small', sizeOptions: [
    { productId: products[0].id, slug: products[0].slug, label: 'Small', available: true },
    { productId: products[2].id, slug: products[2].slug, label: 'Large', available: true },
  ] } })
  await page.goto('/product/dry-chicken-meal')
  const sizes = page.getByRole('region', { name: 'Product sizes' })
  await expect(sizes.getByRole('link', { name: 'Small', exact: true })).toHaveAttribute('aria-current', 'page')
  await sizes.getByRole('link', { name: 'Large', exact: true }).click()
  await expect(page.locator('main h1')).toHaveText('Crunchy Training Bites')
  await expect(sizes.getByRole('link', { name: 'Large', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.getByRole('button', { name: 'Buy now', exact: true }).click()
  await expect(page).toHaveURL(/\/checkout$/)
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mypetfood-cart') ?? '[]'))
  expect(saved).toHaveLength(1); expect(saved[0].product.id).toBe(products[2].id)
})

test('storefront design screenshots', async ({ page }, testInfo) => {
  await fixture(page, { basket: basket() })
  for (const route of ['/', '/shop', '/product/dry-chicken-meal', '/basket']) {
    await page.goto(route); await expect(page.locator('main h1')).toBeVisible()
    if (route === '/') await expect(page.getByRole('region', { name: 'Helpful guides' })).toBeVisible()
    if (route === '/shop') await expect(cards(page)).toHaveCount(9)
    if (route === '/basket') {
      await page.getByLabel('Delivery postcode').fill('SW1A 1AA'); await page.getByRole('button', { name: 'Check delivery options' }).click()
      await page.getByRole('radio', { name: /Standard delivery/ }).check()
    }
    await page.screenshot({ path: testInfo.outputPath(`${route === '/' ? 'home' : route.slice(1)}.png`), fullPage: true, animations: 'disabled' })
  }
})
