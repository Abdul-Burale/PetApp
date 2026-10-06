import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { BackendApiError, getSiteContent, updateStaffContact, updateStaffFooter, type SiteContent } from '../lib/api'
import { isPageSlug, pageBriefs, pageSlugs, plainTextError, validUkPhone, type PageSlug } from '../lib/contentPages'
import { ContentError, ContentPageEditor, useDraftGuard } from './ContentPageEditor'

const pages = pageSlugs.map(slug => [slug, pageBriefs[slug].title] as const)
type Selection = PageSlug | 'contact-settings' | 'footer-settings'
type FooterContent = SiteContent['footer']
type ContactContent = SiteContent['contact']
type ContactDraft = Omit<ContactContent, 'updatedAt' | 'structuredContactSupported'>
type FooterDraft = Omit<FooterContent, 'updatedAt'>
const footerRoutes = ['/', '/shop', '/shop?offer=true', '/category/cats', '/category/dogs', '/category/birds', ...pageSlugs.map(slug => `/${slug}`)]

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="block text-sm font-semibold"><span>{label}</span>{hint && <span className="mb-2 mt-1 block text-sm font-normal italic leading-6 text-gray-500">{hint}</span>}{children}</label>
}
function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`mt-1 w-full rounded-lg border border-line bg-white px-4 py-3 font-normal focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand ${props.className ?? ''}`} />
}
function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`mt-1 w-full rounded-lg border border-line bg-white px-4 py-3 font-normal focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand ${props.className ?? ''}`} />
}

function contactDraftFrom(value: ContactContent): ContactDraft {
  return { email: value.email, phones: value.phones, address: value.address, openingHours: value.openingHours, responseTime: value.responseTime, version: value.version }
}
function footerDraftFrom(value: FooterContent): FooterDraft {
  return { tagline: value.tagline, groups: value.groups, version: value.version }
}

export function AdminContentPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [dirty, setDirty] = useState(false)
  const requested = searchParams.get('page')
  const invalidPage = searchParams.get('section') !== 'storefront' && requested !== null && !isPageSlug(requested)
  const selection: Selection = searchParams.get('section') === 'storefront'
    ? searchParams.get('store') === 'footer' ? 'footer-settings' : 'contact-settings'
    : isPageSlug(requested) ? requested : 'delivery'
  const select = (next: Selection) => {
    if ((!invalidPage && next === selection) || (dirty && !window.confirm('You have unpublished changes. Discard them and open different content?'))) return
    setDirty(false)
    setSearchParams(next === 'contact-settings' || next === 'footer-settings'
      ? { section: 'storefront', store: next === 'footer-settings' ? 'footer' : 'contact' }
      : { section: 'pages', page: next })
  }
  const backGuard = (event: React.MouseEvent) => { if (dirty && !window.confirm('Discard your unpublished changes and return to your account?')) event.preventDefault() }
  return <main className="container-page max-w-7xl py-8 sm:py-12">
    <p className="text-sm text-gray-500"><Link to="/account" onClick={backGuard} className="underline">Account</Link> / Admin tools / {isPageSlug(selection) ? 'Pages' : 'Storefront'}</p>
    <header className="mt-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-red-800">Staff workspace</p><h1 className="mt-2 text-3xl font-bold">{isPageSlug(selection) ? 'Pages' : 'Storefront'}</h1><p className="mt-3 max-w-2xl text-gray-600">Choose what to edit, fill in your approved information, then publish when you are ready.</p></header>
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
      <nav aria-label="Content selector" className="rounded-xl border border-line bg-white p-5 lg:sticky lg:top-6">
        <label className="block text-sm font-bold lg:hidden">Choose content<select className="mt-2 w-full rounded-lg border border-line p-3" value={selection} onChange={event => select(event.target.value as Selection)}>
          <optgroup label="Pages">{pages.map(([slug, title]) => <option key={slug} value={slug}>{title}</option>)}</optgroup><optgroup label="Shared storefront"><option value="contact-settings">Contact details</option><option value="footer-settings">Footer</option></optgroup>
        </select></label>
        <div className="hidden space-y-6 lg:block">{(['Help', 'About'] as const).map(group => <div key={group}><h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">{group}</h2><ul className="space-y-1">{pageSlugs.filter(slug => pageBriefs[slug].group === group).map(slug => <li key={slug}><button type="button" aria-current={selection === slug ? 'page' : undefined} onClick={() => select(slug)} className={`w-full rounded-lg px-3 py-2.5 text-left text-sm ${selection === slug ? 'bg-brand font-bold text-white' : 'text-gray-600 hover:bg-sand'}`}>{pageBriefs[slug].title}</button></li>)}</ul></div>)}
          <div><h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">Shared storefront</h2>{(['contact-settings', 'footer-settings'] as const).map(resource => <button key={resource} type="button" onClick={() => select(resource)} aria-current={selection === resource ? 'page' : undefined} className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm ${selection === resource ? 'bg-brand font-bold text-white' : 'text-gray-600 hover:bg-sand'}`}>{resource === 'contact-settings' ? 'Contact details' : 'Footer & links'}</button>)}</div>
        </div>
        <Link to="/account" onClick={backGuard} className="mt-6 inline-block text-sm text-brand underline">Back to admin tools</Link>
      </nav>
      <section className="min-w-0 rounded-2xl border border-line bg-white shadow-card">
        {invalidPage ? <div className="p-6"><ContentError error="This is not a supported system page. Choose a page from Help or About to open its editor." /></div> : isPageSlug(selection) ? <ContentPageEditor key={selection} slug={selection} onDirtyChange={setDirty} /> : <SharedContentEditor key={selection} resource={selection} onDirtyChange={setDirty} />}
      </section>
    </div>
  </main>
}

function SharedContentEditor({ resource, onDirtyChange }: { resource: 'contact-settings' | 'footer-settings'; onDirtyChange: (dirty: boolean) => void }) {
  const query = useQuery({ queryKey: ['site-content'], queryFn: getSiteContent, retry: false, refetchOnWindowFocus: false })
  if (query.isPending) return <p role="status" className="p-8">Loading shared content…</p>
  if (query.isError) return <div className="space-y-4 p-6"><ContentError error={query.error} /><button className="btn-secondary" onClick={() => void query.refetch()}>Retry loading content</button></div>
  return <LoadedSharedEditor initial={query.data} resource={resource} onDirtyChange={onDirtyChange} />
}

// Query refetches never reset a draft: it is initialized once per selected resource.
function LoadedSharedEditor({ initial, resource, onDirtyChange }: { initial: SiteContent; resource: 'contact-settings' | 'footer-settings'; onDirtyChange: (dirty: boolean) => void }) {
  const isContact = resource === 'contact-settings'
  const queryClient = useQueryClient()
  const [contact, setContact] = useState(() => contactDraftFrom(initial.contact))
  const [footer, setFooter] = useState(() => footerDraftFrom(initial.footer))
  const [baseline, setBaseline] = useState(() => JSON.stringify(isContact ? contactDraftFrom(initial.contact) : footerDraftFrom(initial.footer)))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [conflict, setConflict] = useState<SiteContent | null>(null)
  const [conflictPending, setConflictPending] = useState(false)
  const dirty = JSON.stringify(isContact ? contact : footer) !== baseline
  useDraftGuard(dirty, onDirtyChange)
  async function fetchLatest() {
    try { setConflict(await getSiteContent()); setError(null) } catch (caught) { setError(caught) }
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (saving || conflictPending || (isContact && !initial.contact.structuredContactSupported)) return
    setError(null); setMessage('')
    if (isContact && contact.phones.some(phone => !phone.label.trim() || !validUkPhone(phone.number))) {
      setError('Give every phone a label and a valid UK number: 11 digits starting 01–09, or +44 followed by 10 digits. Parentheses must be balanced.'); return
    }
    const strings = isContact ? [contact.email, ...contact.phones.flatMap(phone => [phone.label, phone.number]), ...Object.values(contact.address), contact.openingHours, contact.responseTime] : [footer.tagline, ...footer.groups.flatMap(group => [group.title, ...group.links.map(link => link.label)])]
    const invalid = plainTextError(strings)
    if (invalid) { setError(invalid); return }
    setSaving(true)
    try {
      let publishedVersion: number
      if (isContact) {
        const result = await updateStaffContact(contact)
        publishedVersion = result.version
        const next = contactDraftFrom(result)
        setContact(next); setBaseline(JSON.stringify(next))
        queryClient.setQueryData<SiteContent>(['site-content'], current => current ? { ...current, contact: result } : current)
      } else {
        const result = await updateStaffFooter(footer)
        publishedVersion = result.version
        const next = footerDraftFrom(result)
        setFooter(next); setBaseline(JSON.stringify(next))
        queryClient.setQueryData<SiteContent>(['site-content'], current => current ? { ...current, footer: result } : current)
      }
      await queryClient.invalidateQueries({ queryKey: ['site-content'], refetchType: 'none' })
      try {
        const publicSite = await getSiteContent()
        queryClient.setQueryData(['site-content'], publicSite)
        setMessage((isContact ? publicSite.contact.version : publicSite.footer.version) === publishedVersion
          ? 'Saved and published. The shared storefront content has been checked and refreshed.'
          : 'Your save succeeded, but the public storefront returned another version. Review the live page before making further changes.')
      } catch {
        setMessage('Your save succeeded, but the public storefront could not be checked. Do not resubmit; check the live page or contact support.')
      }
    } catch (caught) {
      if (caught instanceof BackendApiError && (caught.status === 409 || caught.code === 'VERSION_CONFLICT')) {
        setConflictPending(true); await fetchLatest()
      } else setError(caught)
    } finally { setSaving(false) }
  }
  const latestResource = conflict ? isContact ? conflict.contact : conflict.footer : null
  return <form onSubmit={save} className="space-y-6 p-5 sm:p-8">
    <p className="text-sm italic leading-6 text-gray-600">{isContact ? 'These details are shared with the Contact Us page and footer. Leave a field blank to hide it. Publish only real business information.' : 'Choose which navigation links customers see. Inactive links and empty groups are hidden; order is preserved.'}</p>
    {isContact && !initial.contact.structuredContactSupported && <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm leading-6">This backend still returns the old single-phone format. Publishing is disabled to avoid losing phone/address changes. Deploy the V6 contact migration and updated contact endpoints, then reload this editor.</div>}
    <fieldset disabled={saving || (isContact && !initial.contact.structuredContactSupported)} className="space-y-6 disabled:opacity-60">
      {isContact ? <ContactEditor value={contact} onChange={value => { setContact(value); setMessage('') }} /> : <FooterEditor value={footer} onChange={value => { setFooter(value); setMessage('') }} />}
    </fieldset>
    {error != null && <ContentError error={error} />}
    {message && <p role="status" className="rounded-lg bg-sand p-4 text-sm leading-6 text-brand">{message}</p>}
    {conflictPending && <section className="space-y-4 rounded-xl border border-amber-300 bg-amber-50 p-5"><h3 className="font-bold">Another staff member saved newer content</h3><p className="text-sm leading-6">Your draft is preserved. Compare the latest saved information before choosing whether to replace it.</p>
      {latestResource ? <><details><summary className="cursor-pointer font-semibold">Review the latest saved content</summary><div className="mt-4 max-h-96 overflow-auto rounded bg-white p-4"><ContentSnapshot value={latestResource} /></div></details><div className="flex flex-wrap gap-3">
        <button type="button" className="btn-secondary" onClick={() => { if (!conflict) return; const next = isContact ? contactDraftFrom(conflict.contact) : footerDraftFrom(conflict.footer); if (isContact) setContact(next as ContactDraft); else setFooter(next as FooterDraft); setBaseline(JSON.stringify(next)); setConflict(null); setConflictPending(false); setMessage('Latest saved content loaded.') }}>Use latest saved content</button>
        <button type="button" className="btn-secondary" onClick={() => { if (isContact) setContact(current => ({ ...current, version: latestResource.version })); else setFooter(current => ({ ...current, version: latestResource.version })); setConflict(null); setConflictPending(false); setMessage('Your draft is kept. Review it, then explicitly save to publish.') }}>Keep my draft after comparison</button>
      </div></> : <button type="button" className="btn-secondary" onClick={() => void fetchLatest()}>Load latest for comparison</button>}
    </section>}
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6"><p className="text-sm text-gray-500">{dirty ? 'Unpublished changes' : 'No unpublished changes'}</p><button className="btn-primary" disabled={saving || conflictPending || (isContact && !initial.contact.structuredContactSupported)}>{saving ? 'Saving…' : 'Save and publish'}</button></div>
  </form>
}

function ContentSnapshot({ value }: { value: unknown }) {
  if (Array.isArray(value)) return <ol className="list-decimal space-y-3 pl-5">{value.map((entry, index) => <li key={index}><ContentSnapshot value={entry} /></li>)}</ol>
  if (value && typeof value === 'object') return <dl className="space-y-3">{Object.entries(value).filter(([key]) => !['version', 'updatedAt', 'structuredContactSupported'].includes(key)).map(([key, entry]) => <div key={key}><dt className="text-xs font-bold uppercase tracking-wide text-gray-500">{key.replace(/([A-Z])/g, ' $1')}</dt><dd className="mt-1"><ContentSnapshot value={entry} /></dd></div>)}</dl>
  return <span className="whitespace-pre-wrap break-words text-sm">{typeof value === 'boolean' ? value ? 'Visible' : 'Hidden' : String(value || 'Not supplied')}</span>
}

function ContactEditor({ value, onChange }: { value: ContactDraft; onChange: (value: ContactDraft) => void }) {
  const addressFields = [['line1', 'Address line 1'], ['line2', 'Address line 2'], ['townCity', 'Town or city'], ['county', 'County'], ['postcode', 'Postcode'], ['country', 'Country']] as const
  return <><div><h2 className="text-xl font-bold">Contact details</h2><p className="mt-1 text-xs text-gray-500">Version {value.version}</p></div>
    <Field label="Email"><TextInput type="email" maxLength={254} value={value.email} onChange={event => onChange({ ...value, email: event.target.value })} /></Field>
    <div className="space-y-3"><div className="flex items-center justify-between"><h3 className="font-bold">Phone numbers</h3><button type="button" disabled={value.phones.length >= 5} onClick={() => onChange({ ...value, phones: [...value.phones, { label: '', number: '' }] })} className="btn-secondary">Add phone</button></div>
      {!value.phones.length && <p className="text-sm text-gray-600">No phone numbers added.</p>}
      {value.phones.map((phone, index) => <div key={index} className="grid gap-3 border border-line bg-sand/40 p-4 sm:grid-cols-[1fr_1fr_auto]"><Field label="Label"><TextInput required maxLength={40} placeholder="Landline or Mobile" value={phone.label} onChange={event => onChange({ ...value, phones: value.phones.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) })} /></Field><Field label="Number" hint={phone.number && !validUkPhone(phone.number) ? 'Enter 11 digits starting with 01–09, or +44 followed by 10 digits.' : '11 digits starting with 01–09, or +44 followed by 10 digits. Spaces and hyphens are okay.'}><TextInput required type="tel" maxLength={40} aria-invalid={phone.number.length > 0 && !validUkPhone(phone.number)} value={phone.number} onChange={event => onChange({ ...value, phones: value.phones.map((item, itemIndex) => itemIndex === index ? { ...item, number: event.target.value } : item) })} /></Field><button type="button" onClick={() => onChange({ ...value, phones: value.phones.filter((_, itemIndex) => itemIndex !== index) })} className="self-end pb-2 text-sm text-red-700 underline">Remove</button></div>)}
    </div>
    <div className="space-y-3"><h3 className="font-bold">Postal address</h3><div className="grid gap-4 sm:grid-cols-2">{addressFields.map(([key, label]) => <Field key={key} label={label}><TextInput maxLength={160} value={value.address[key]} onChange={event => onChange({ ...value, address: { ...value.address, [key]: event.target.value } })} /></Field>)}</div></div>
    <Field label="Opening hours"><TextArea maxLength={1000} rows={3} value={value.openingHours} onChange={event => onChange({ ...value, openingHours: event.target.value })} /></Field>
    <Field label="Expected response time"><TextArea maxLength={500} rows={3} value={value.responseTime} onChange={event => onChange({ ...value, responseTime: event.target.value })} /></Field>
  </>
}

function FooterEditor({ value, onChange }: { value: Omit<FooterContent, 'updatedAt'>; onChange: (value: Omit<FooterContent, 'updatedAt'>) => void }) {
  return <><div><h2 className="text-xl font-bold">Footer</h2><p className="mt-1 text-xs text-gray-500">Version {value.version}</p></div>
    <Field label="Tagline"><TextInput maxLength={300} value={value.tagline} onChange={event => onChange({ ...value, tagline: event.target.value })} /></Field>
    <div className="space-y-4"><div className="flex items-center justify-between"><h3 className="text-lg font-bold">Link groups</h3><button type="button" disabled={value.groups.length >= 6} onClick={() => onChange({ ...value, groups: [...value.groups, { title: '', links: [] }] })} className="btn-secondary">Add group</button></div>
      {value.groups.map((group, groupIndex) => <fieldset key={groupIndex} className="space-y-4 border border-line bg-sand/40 p-4"><legend className="px-1 text-sm font-bold">Group {groupIndex + 1}</legend>
        <div className="flex justify-end gap-3"><button type="button" disabled={groupIndex === 0} onClick={() => { const groups = [...value.groups]; [groups[groupIndex - 1], groups[groupIndex]] = [groups[groupIndex], groups[groupIndex - 1]]; onChange({ ...value, groups }) }} className="text-sm text-brand underline disabled:opacity-40">Move up</button><button type="button" disabled={groupIndex === value.groups.length - 1} onClick={() => { const groups = [...value.groups]; [groups[groupIndex + 1], groups[groupIndex]] = [groups[groupIndex], groups[groupIndex + 1]]; onChange({ ...value, groups }) }} className="text-sm text-brand underline disabled:opacity-40">Move down</button><button type="button" onClick={() => onChange({ ...value, groups: value.groups.filter((_, index) => index !== groupIndex) })} className="text-sm text-red-700 underline">Remove group</button></div>
        <Field label="Group title"><TextInput required maxLength={80} value={group.title} onChange={event => { const groups = [...value.groups]; groups[groupIndex] = { ...group, title: event.target.value }; onChange({ ...value, groups }) }} /></Field>
        <div className="space-y-3"><div className="flex items-center justify-between"><h4 className="font-semibold">Links</h4><button type="button" disabled={group.links.length >= 12} onClick={() => { const groups = [...value.groups]; groups[groupIndex] = { ...group, links: [...group.links, { label: '', route: '/', active: true }] }; onChange({ ...value, groups }) }} className="text-sm text-brand underline">Add link</button></div>
          {group.links.map((link, linkIndex) => <div key={linkIndex} className="grid gap-3 border border-line bg-white p-3 sm:grid-cols-2">
            <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" disabled={linkIndex === 0} onClick={() => { const links = [...group.links]; [links[linkIndex - 1], links[linkIndex]] = [links[linkIndex], links[linkIndex - 1]]; const groups = [...value.groups]; groups[groupIndex] = { ...group, links }; onChange({ ...value, groups }) }} className="text-sm text-brand underline disabled:opacity-40">Move up</button><button type="button" disabled={linkIndex === group.links.length - 1} onClick={() => { const links = [...group.links]; [links[linkIndex + 1], links[linkIndex]] = [links[linkIndex], links[linkIndex + 1]]; const groups = [...value.groups]; groups[groupIndex] = { ...group, links }; onChange({ ...value, groups }) }} className="text-sm text-brand underline disabled:opacity-40">Move down</button></div>
            <Field label="Label"><TextInput required maxLength={80} value={link.label} onChange={event => { const links = [...group.links]; links[linkIndex] = { ...link, label: event.target.value }; const groups = [...value.groups]; groups[groupIndex] = { ...group, links }; onChange({ ...value, groups }) }} /></Field>
            <Field label="Destination"><select value={link.route} onChange={event => { const links = [...group.links]; links[linkIndex] = { ...link, route: event.target.value }; const groups = [...value.groups]; groups[groupIndex] = { ...group, links }; onChange({ ...value, groups }) }} className="mt-1 w-full border border-line bg-white px-3 py-2.5 font-normal">{footerRoutes.map(route => <option value={route} key={route}>{route}</option>)}</select></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={link.active} onChange={event => { const links = [...group.links]; links[linkIndex] = { ...link, active: event.target.checked }; const groups = [...value.groups]; groups[groupIndex] = { ...group, links }; onChange({ ...value, groups }) }} />Show link in storefront</label><button type="button" onClick={() => { const groups = [...value.groups]; groups[groupIndex] = { ...group, links: group.links.filter((_, index) => index !== linkIndex) }; onChange({ ...value, groups }) }} className="justify-self-start text-sm text-red-700 underline">Remove link</button>
          </div>)}
        </div>
      </fieldset>)}
    </div>
  </>
}
