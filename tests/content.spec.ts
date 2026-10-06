import { expect, test, type Page } from '@playwright/test'
import { pageBriefs, pageSlugs, type PageSlug } from '../src/lib/contentPages'
import type { ContentPage, SiteContent } from '../src/lib/api'

// Every network mutation is intercepted. These tests cannot publish live copy.
async function fixture(page: Page, options: { role?: 'staff' | 'customer' | 'anonymous'; legacy?: boolean; missing?: string; empty?: boolean } = {}) {
  const role = options.role ?? 'staff'
  const user = { id: 'test-user', aud: 'authenticated', role: 'authenticated', email: 'staff@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
  if (role !== 'anonymous') await page.addInitScript(({ user }) => {
    localStorage.setItem('sb-supabase-auth-token', JSON.stringify({ access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer', expires_at: 4_102_444_800, expires_in: 3600, user }))
  }, { user })
  const content: Record<string, ContentPage> = Object.fromEntries(pageSlugs.map(slug => [slug, {
    slug, title: pageBriefs[slug].title, intro: options.empty ? '' : `Approved ${slug} introduction.`, version: 4, updatedAt: '2026-10-06T12:00:00Z',
    sections: options.empty ? [] : (pageBriefs[slug].sections.length ? pageBriefs[slug].sections : [{ heading: 'Supporting information' }]).map((section, index) => ({ heading: section.heading, body: `Approved ${slug} topic ${index + 1}. Literal entities: &amp; &lt;script&gt;.`, bullets: ['First approved point', 'Second approved point'] })),
    ...(slug === 'faqs' ? { faqs: options.empty ? [] : [{ question: 'Where do you deliver?', answer: 'Approved areas from the shop.' }, { question: 'How do I ask about a return?', answer: 'Use the enquiry form.' }] } : {}),
  }]))
  const site: SiteContent = {
    contact: { email: 'shop@example.test', phones: [{ label: 'Landline', number: '02012345678' }, { label: 'Mobile', number: '+447123456789' }], address: { line1: 'Test business address', line2: '', townCity: 'Test town', county: '', postcode: 'TEST', country: 'United Kingdom' }, openingHours: 'Approved opening hours', responseTime: 'Approved response time', version: 3, updatedAt: '2026-10-06T12:00:00Z' },
    footer: { tagline: 'Approved tagline', groups: ['Help', 'About'].map(group => ({ title: group, links: pageSlugs.filter(slug => pageBriefs[slug].group === group).map(slug => ({ label: pageBriefs[slug].title, route: `/${slug}`, active: true })) })).concat([{ title: 'Hidden group', links: [{ label: 'Hidden link', route: '/shop', active: false }] }]), version: 2, updatedAt: '2026-10-06T12:00:00Z' },
  }
  const writes: Array<{ path: string; body: any }> = []
  let conflict = false, contactRateLimited = false
  const reads: string[] = []
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname
    if (url.hostname === 'supabase.test') return route.fulfill({ json: user })
    if (url.hostname !== 'api.test') return url.hostname === '127.0.0.1' ? route.continue() : route.abort()
    const reply = (json: unknown, status = 200, headers = {}) => route.fulfill({ status, json, headers: { 'X-Request-Id': 'test-reference', 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'X-Request-Id, Retry-After', ...headers } })
    if (request.method() === 'OPTIONS') return reply({}, 200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' })
    if (path.startsWith('/v1/staff/') && (role !== 'staff' || request.headers().authorization !== 'Bearer test-access-token')) return reply({ error: { code: 'FORBIDDEN', message: 'Staff only', requestId: 'test-reference' } }, 403)
    if (path === '/v1/me') return reply({ id: user.id, email: user.email, displayName: 'Test user', role })
    if (path === '/v1/me/addresses') return reply([])
    if (path === '/v1/products') return reply({ data: [], hasMore: false })
    if (path === '/v1/content/site') return reply(options.legacy ? { ...site, contact: { email: site.contact.email, phone: '02012345678', openingHours: '', responseTime: '', version: 3, updatedAt: site.contact.updatedAt } } : site)
    const match = path.match(/^\/v1\/(?:staff\/)?content\/pages\/(.+)$/)
    if (match) {
      const slug = match[1]
      if (options.missing === slug || !content[slug]) return reply({ error: { code: 'NOT_FOUND', message: 'Missing page', requestId: 'test-reference' } }, 404)
      if (request.method() === 'GET') { reads.push(path); return reply({ data: content[slug] }) }
      const body = request.postDataJSON(); writes.push({ path, body })
      if (conflict) { conflict = false; content[slug] = { ...content[slug], title: 'Saved by another staff member', version: content[slug].version + 1 }; return reply({ error: { code: 'VERSION_CONFLICT', message: 'Changed', requestId: 'test-reference' } }, 409) }
      if (body.version !== content[slug].version || body.slug !== slug) return reply({ error: { code: 'VERSION_CONFLICT', message: 'Invalid version or slug' } }, 409)
      content[slug] = { ...body, version: body.version + 1, updatedAt: '2026-10-06T13:00:00Z' }
      return reply(content[slug])
    }
    if (path === '/v1/staff/content/contact' || path === '/v1/staff/content/footer') {
      const body = request.postDataJSON(); writes.push({ path, body })
      if (path.endsWith('/contact')) site.contact = { ...body, version: body.version + 1, updatedAt: '2026-10-06T13:00:00Z', phones: body.phones.map((phone: { label: string; number: string }) => ({ ...phone, number: phone.number.replace(/[() -]/g, '') })) }
      else site.footer = { ...body, version: body.version + 1, updatedAt: '2026-10-06T13:00:00Z' }
      return reply(path.endsWith('/contact') ? site.contact : site.footer)
    }
    if (path === '/v1/contact-messages') {
      writes.push({ path, body: request.postDataJSON() })
      return contactRateLimited ? reply({ error: { code: 'RATE_LIMITED', message: 'Slow down' } }, 429, { 'Retry-After': '30' }) : reply({ status: 'accepted', requestId: 'enquiry-reference' }, 202)
    }
    return reply({ error: { message: `Unhandled test endpoint ${path}` } }, 404)
  })
  return { content, site, writes, reads, causeConflict: () => { conflict = true }, rateLimit: () => { contactRateLimited = true } }
}

async function choose(page: Page, slug: PageSlug | 'contact-settings' | 'footer-settings') {
  const nav = page.getByRole('navigation', { name: 'Content selector' })
  await expect(nav).toBeVisible()
  const select = nav.getByRole('combobox')
  if (await select.isVisible()) await select.selectOption(slug)
  else await nav.getByRole('button', { name: slug === 'contact-settings' ? 'Contact details' : slug === 'footer-settings' ? 'Footer & links' : pageBriefs[slug].title, exact: true }).click()
}

for (const slug of pageSlugs) test(`${slug}: direct route, reload, escaped content and mobile width`, async ({ page }) => {
  const mock = await fixture(page)
  await page.goto(`/${slug}`)
  await expect(page.locator('main h1')).toHaveText(pageBriefs[slug].title)
  await expect(page.locator('main')).toContainText(`Approved ${slug} introduction.`)
  expect(mock.reads).toContain(`/v1/content/pages/${slug}`)
  await expect(page.locator('main')).toContainText('Literal entities: &amp; &lt;script&gt;.')
  await expect(page.locator('main script')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.reload()
  await expect(page.locator('main')).toContainText(`Approved ${slug} introduction.`)
  await expect(page.getByText('Page not found', { exact: true })).toHaveCount(0)
  await expect(page.locator('footer')).not.toContainText('Hidden group')
})

test('Pages card, all eight editors, save/read-back and footer navigation', async ({ page }) => {
  const mock = await fixture(page)
  await page.goto('/account')
  await page.getByRole('link', { name: /^Pages Edit help/ }).click()
  await expect(page.getByRole('heading', { name: 'Edit Delivery', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Edit Delivery', exact: true })).toBeVisible()
  for (const slug of pageSlugs) {
    await choose(page, slug)
    await expect(page.getByRole('heading', { name: `Edit ${pageBriefs[slug].title}`, exact: true })).toBeVisible()
    await page.getByLabel('Page title', { exact: false }).fill(`Edited ${pageBriefs[slug].title}`)
    await page.getByRole('button', { name: 'Save and publish', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('Saved and published')
    expect(mock.content[slug].version).toBe(5)
    expect(mock.writes.at(-1)?.body.slug).toBe(slug)
    expect(mock.writes.at(-1)?.body.updatedAt).toBeUndefined()
    const label = pageBriefs[slug].title
    await page.locator('footer').getByRole('link', { name: label, exact: true }).click()
    await expect(page.locator('main h1')).toHaveText(`Edited ${label}`)
    await page.goto(`/admin/content?section=pages&page=${slug}`)
  }
})

test('bullets retain typed newlines, sections reorder, and draft survives focus', async ({ page }) => {
  const mock = await fixture(page)
  await page.goto('/admin/content?section=pages&page=delivery')
  const points = page.getByLabel('Supporting points (optional)', { exact: false }).first()
  await points.fill('Point one')
  await points.press('End'); await points.press('Enter'); await points.pressSequentially('Point two')
  await expect(points).toHaveValue('Point one\nPoint two')
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(points).toHaveValue('Point one\nPoint two')
  await page.getByRole('button', { name: 'Move section 1 down', exact: true }).click()
  await page.getByRole('button', { name: 'Save and publish', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Saved and published')
  expect(mock.content.delivery.sections[1].heading).toBe('Delivery areas')
  expect(mock.content.delivery.sections[1].bullets).toEqual(['Point one', 'Point two'])
})

test('FAQ editor order maps to keyboard-accessible accordions and search', async ({ page }) => {
  const mock = await fixture(page)
  await page.goto('/admin/content?section=pages&page=faqs')
  await page.getByRole('button', { name: 'Move question 1 down', exact: true }).click()
  await page.getByRole('button', { name: 'Add question', exact: true }).click()
  await page.getByLabel("Customer's question", { exact: false }).last().fill('Can I ask about products?')
  await page.getByLabel('Your answer', { exact: false }).last().fill('Use the contact form for your product question.')
  await page.getByRole('button', { name: 'Save and publish', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Saved and published')
  expect(mock.content.faqs.faqs?.[0].question).toBe('How do I ask about a return?')
  await page.goto('/faqs')
  const summary = page.locator('summary').first()
  await expect(summary).toContainText('How do I ask about a return?')
  await summary.focus(); await page.keyboard.press('Enter')
  await expect(page.locator('details').first()).toHaveAttribute('open', '')
  await expect(page.getByText('Use the enquiry form.', { exact: true })).toBeVisible()
  await page.getByLabel('Find an answer', { exact: false }).fill('products')
  await expect(page.locator('summary')).toHaveCount(1)
})

test('409 preserves draft and requires explicit comparison before resaving', async ({ page }) => {
  const mock = await fixture(page)
  await page.goto('/admin/content?section=pages&page=delivery')
  await page.getByLabel('Page title', { exact: false }).fill('My unsaved title')
  mock.causeConflict()
  await page.getByRole('button', { name: 'Save and publish', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Another staff member saved this page first' })).toBeVisible()
  await expect(page.getByLabel('Page title', { exact: false })).toHaveValue('My unsaved title')
  await expect(page.getByRole('button', { name: 'Save and publish', exact: true })).toBeDisabled()
  expect(mock.writes).toHaveLength(1)
  await page.getByText('Compare your draft with the latest saved page', { exact: true }).click()
  await expect(page.getByText('Saved by another staff member', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Keep my draft after comparison', exact: true }).click()
  expect(mock.writes).toHaveLength(1)
  await page.getByRole('button', { name: 'Save and publish', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Saved and published')
  expect(mock.writes[1].body.version).toBe(5)
  expect(mock.content.delivery.title).toBe('My unsaved title')
})

test('backend 404 is visible in both public and staff views, never a fake editor', async ({ page }) => {
  await fixture(page, { missing: 'delivery' })
  await page.goto('/delivery')
  await expect(page.getByRole('heading', { name: 'This page is unavailable' })).toBeVisible()
  await expect(page.getByText('Delivery information is being prepared', { exact: true })).toHaveCount(0)
  await page.goto('/admin/content?section=pages&page=delivery')
  await expect(page.getByRole('alert')).toContainText('test-reference')
  await expect(page.getByText(/content API returned 404/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save and publish', exact: true })).toHaveCount(0)
})

test('contact phone/address save appears on public page and normalized phone links', async ({ page }) => {
  const mock = await fixture(page)
  await page.goto('/admin/content?section=storefront&store=contact')
  await page.getByLabel('Address line 1', { exact: true }).fill('Updated approved business address')
  await page.getByLabel('Number', { exact: false }).filter({ visible: true }).first().fill('020 (1234) 5678')
  await page.getByRole('button', { name: 'Save and publish', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Saved and published')
  expect(mock.writes[0].body.structuredContactSupported).toBeUndefined()
  await page.goto('/contact')
  const details = page.getByRole('region', { name: 'Contact details' })
  await expect(details).toContainText('Updated approved business address')
  await expect(details).toContainText('Landline')
  await expect(details).toContainText('Mobile')
  await expect(details.getByRole('link', { name: '02012345678', exact: true })).toHaveAttribute('href', 'tel:02012345678')
})

test('legacy contact response blocks unsupported editing instead of losing new fields', async ({ page }) => {
  const mock = await fixture(page, { legacy: true })
  await page.goto('/admin/content?section=storefront')
  await expect(page.getByRole('alert')).toContainText('old single-phone format')
  await expect(page.getByRole('button', { name: 'Save and publish', exact: true })).toBeDisabled()
  expect(mock.writes).toHaveLength(0)
})

test('empty API copy is designed but recommended editor headings are never auto-published', async ({ page }) => {
  const mock = await fixture(page, { empty: true })
  await page.goto('/delivery')
  await expect(page.getByRole('heading', { name: 'Delivery information is being prepared' })).toBeVisible()
  await page.goto('/admin/content?section=pages&page=delivery')
  await page.getByRole('button', { name: 'Start with all recommended headings', exact: true }).click()
  await expect(page.getByLabel('Topic heading', { exact: false })).toHaveCount(4)
  expect(mock.writes).toHaveLength(0)
  expect(mock.content.delivery.sections).toEqual([])
})

test('customers cannot open staff editors', async ({ page }) => {
  const mock = await fixture(page, { role: 'customer' })
  await page.goto('/admin/content?section=pages')
  await expect(page).toHaveURL(/\/account$/)
  await expect(page.getByRole('heading', { name: 'Admin tools', exact: true })).toHaveCount(0)
  expect(mock.reads.filter(path => path.includes('/staff/'))).toEqual([])
})

test('sign-in preserves the selected admin page in the return URL', async ({ page }) => {
  await fixture(page, { role: 'anonymous' })
  await page.goto('/admin/content?section=pages&page=privacy')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible()
  expect(await page.evaluate(() => window.history.state.usr.from)).toBe('/admin/content?section=pages&page=privacy')
})

test('invalid admin slug is not silently mapped to another page', async ({ page }) => {
  const mock = await fixture(page)
  await page.goto('/admin/content?section=pages&page=not-a-page')
  await expect(page.getByRole('alert')).toContainText('not a supported system page')
  expect(mock.reads).toEqual([])
  await choose(page, 'delivery')
  await expect(page.getByRole('heading', { name: 'Edit Delivery', exact: true })).toBeVisible()
})

test('plain-text checks and invalid phones stop requests without losing drafts', async ({ page }) => {
  const mock = await fixture(page)
  await page.goto('/admin/content?section=pages&page=delivery')
  await page.getByLabel('Short introduction', { exact: false }).fill('<b>This is not plain text</b>')
  await page.getByRole('button', { name: 'Save and publish', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Use plain text only')
  expect(mock.writes).toHaveLength(0)
  page.once('dialog', dialog => dialog.accept())
  await choose(page, 'contact-settings')
  await page.getByLabel('Number', { exact: false }).first().fill('020 123')
  await page.getByRole('button', { name: 'Save and publish', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('valid UK number')
  expect(mock.writes).toHaveLength(0)
})

test('failed saves display field errors and support reference without a success message', async ({ page }) => {
  await fixture(page)
  await page.route('http://api.test/v1/staff/content/pages/delivery', async route => {
    if (route.request().method() !== 'PUT') return route.fallback()
    return route.fulfill({ status: 400, headers: { 'Access-Control-Allow-Origin': '*' }, json: { error: { code: 'VALIDATION_ERROR', message: 'Review the highlighted information.', requestId: 'validation-reference', fieldErrors: { 'sections[0].heading': 'Must be supplied' } } } })
  })
  await page.goto('/admin/content?section=pages&page=delivery')
  await page.getByLabel('Page title', { exact: false }).fill('Draft stays here')
  await page.getByRole('button', { name: 'Save and publish', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Topic 1 → Heading: Must be supplied')
  await expect(page.getByRole('alert')).toContainText('validation-reference')
  await expect(page.getByLabel('Page title', { exact: false })).toHaveValue('Draft stays here')
  await expect(page.getByRole('status')).toHaveCount(0)
})

test('public read-back failure reports a saved but unconfirmed page, not a failed PUT', async ({ page }) => {
  const mock = await fixture(page)
  await page.route('http://api.test/v1/content/pages/delivery', route => route.fulfill({ status: 503, json: { error: { message: 'Temporary read failure' } } }))
  await page.goto('/admin/content?section=pages&page=delivery')
  await page.getByLabel('Page title', { exact: false }).fill('Saved once only')
  await page.getByRole('button', { name: 'Save and publish', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Your save succeeded, but we could not confirm the public page')
  expect(mock.writes).toHaveLength(1)
  expect(mock.content.delivery.title).toBe('Saved once only')
})

test('guide search and legal contents point to editable full-text sections', async ({ page }) => {
  await fixture(page)
  await page.goto('/guides')
  await page.getByLabel('Find a care guide', { exact: false }).fill('Cat care')
  await expect(page.locator('main article')).toHaveCount(1)
  await expect(page.getByRole('navigation', { name: 'Care guide index' }).getByRole('link')).toHaveAttribute('href', '#section-2')
  await page.goto('/privacy')
  const contents = page.getByRole('navigation', { name: 'Policy contents' })
  await expect(contents.getByRole('link')).toHaveCount(6)
  await contents.getByRole('link').nth(2).click()
  await expect(page).toHaveURL(/#section-3$/)
  await expect(page.locator('#section-3')).toContainText('How we use information')
})

test('contact acknowledgement and rate limit preserve message without promising email delivery', async ({ page }) => {
  const mock = await fixture(page)
  await page.goto('/contact')
  const fill = async () => {
    await page.getByLabel('Your name', { exact: true }).fill('Test person')
    await page.getByLabel('Email address', { exact: true }).fill('customer@example.test')
    await page.getByLabel('Subject', { exact: true }).fill('Product question')
    await page.getByLabel('Message', { exact: false }).fill('This is an approved test enquiry longer than twenty characters.')
    await page.getByRole('checkbox').check()
  }
  await fill()
  await page.getByRole('button', { name: 'Send enquiry' }).click()
  await expect(page.getByRole('status')).toContainText('enquiry-reference')
  expect(mock.writes[0].body.website).toBe('')
  await fill(); mock.rateLimit()
  await page.getByRole('button', { name: 'Send enquiry' }).click()
  await expect(page.getByRole('alert')).toContainText('wait 30 seconds')
  await expect(page.getByLabel('Message', { exact: false })).toHaveValue(/approved test enquiry/)
  await page.getByRole('button', { name: 'Send enquiry' }).click()
  expect(mock.writes).toHaveLength(2)
})

test('design snapshots', async ({ page }, testInfo) => {
  await fixture(page)
  for (const path of ['/delivery', '/our-story', '/privacy', '/contact', '/admin/content?section=pages&page=delivery']) {
    await page.goto(path)
    await expect(page.locator('main h1')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath(`${path.split('?')[0].replaceAll('/', '-')}.png`), fullPage: true })
  }
})
