import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { BackendApiError, getSiteContent, getStaffContentPage, updateStaffContact, updateStaffFooter, updateStaffContentPage, type ContentPage, type EditableContentPage, type SiteContent } from '../lib/api'

const pages = [
  ['contact', 'Contact'], ['delivery', 'Delivery'], ['returns', 'Returns'], ['faqs', 'FAQs'],
  ['our-story', 'Our Story'], ['guides', 'Pet Care Guides'], ['privacy', 'Privacy Policy'], ['terms', 'Terms'],
] as const
type PageSlug = typeof pages[number][0]
type Selection = PageSlug | 'contact-settings' | 'footer-settings'
type Section = EditableContentPage['sections'][number]
type FAQ = NonNullable<EditableContentPage['faqs']>[number]
type FooterContent = SiteContent['footer']
type ContactContent = SiteContent['contact']
type ContactDraft = Omit<ContactContent, 'updatedAt'>

const blankSection = (): Section => ({ heading: '', body: '', bullets: [] })
const blankFAQ = (): FAQ => ({ question: '', answer: '' })
const footerRoutes = ['/', '/shop', '/shop?offer=true', '/category/cats', '/category/dogs', '/category/birds', ...pages.map(([slug]) => `/${slug}`)]
const validUkPhone = (phone: string) => /^(?:0[1-9]\d{9}|\+44[1-9]\d{9})$/.test(phone.replace(/[\s()-]/g, ''))

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="block text-sm font-semibold"><span>{label}</span>{children}{hint && <span className="mt-1 block text-xs font-normal text-gray-500">{hint}</span>}</label>
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`mt-1 w-full border border-line bg-white px-3 py-2.5 font-normal ${props.className ?? ''}`} />
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`mt-1 w-full border border-line bg-white px-3 py-2.5 font-normal ${props.className ?? ''}`} />
}

function ConflictNotice({ version, latest, onUseLatest }: { version: number; latest: unknown; onUseLatest: () => void }) {
  return <div className="mt-5 border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
    <p className="font-bold">Someone saved a newer version while you were editing.</p>
    <p className="mt-1">Review the latest saved content below. Your edits are still here. Choose whether to keep or replace them before saving again.</p>
    <details className="mt-3"><summary className="cursor-pointer font-semibold">Review latest saved version {version}</summary><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded bg-white p-3 text-xs">{JSON.stringify(latest, null, 2)}</pre></details>
    <div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={onUseLatest} className="btn-secondary">Keep my edits and use version {version}</button></div>
  </div>
}

export function AdminContentPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selection, setSelection] = useState<Selection>(() => searchParams.get('section') === 'storefront' ? searchParams.get('store') === 'footer' ? 'footer-settings' : 'contact-settings' : pages.some(([slug]) => slug === searchParams.get('page')) ? searchParams.get('page') as PageSlug : 'delivery')
  const siteQuery = useQuery({ queryKey: ['site-content'], queryFn: getSiteContent, retry: false })
  const pageQuery = useQuery({ queryKey: ['staff-content-page', selection], queryFn: () => getStaffContentPage(selection as PageSlug), enabled: !['contact-settings', 'footer-settings'].includes(selection), retry: false })
  const queryClient = useQueryClient()
  const [pageDraft, setPageDraft] = useState<EditableContentPage>({ title: '', intro: '', sections: [], faqs: [] })
  const [pageVersion, setPageVersion] = useState(0)
  const [contactDraft, setContactDraft] = useState<ContactDraft>({ email: '', phones: [], address: { line1: '', line2: '', townCity: '', county: '', postcode: '', country: '' }, openingHours: '', responseTime: '', version: 0 })
  const [footerDraft, setFooterDraft] = useState<Omit<FooterContent, 'updatedAt'>>({ tagline: '', groups: [], version: 0 })
  const [conflict, setConflict] = useState<{ version: number; latest: unknown; resource: Selection } | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const requestedPage = searchParams.get('page')
    if (searchParams.get('section') === 'storefront') setSelection(searchParams.get('store') === 'footer' ? 'footer-settings' : 'contact-settings')
    else if (pages.some(([slug]) => slug === requestedPage)) setSelection(requestedPage as PageSlug)
    else setSelection('delivery')
  }, [searchParams])

  useEffect(() => {
    const value = pageQuery.data
    if (!value || ['contact-settings', 'footer-settings'].includes(selection)) return
    setPageDraft({ title: value.title, intro: value.intro, sections: value.sections ?? [], faqs: value.faqs ?? [] })
    setPageVersion(value.version)
    setConflict(null); setMessage(''); setError('')
  }, [pageQuery.data, selection])

  useEffect(() => {
    const value = siteQuery.data
    if (!value) return
    setContactDraft({ email: value.contact.email, phones: value.contact.phones ?? [], address: value.contact.address ?? { line1: '', line2: '', townCity: '', county: '', postcode: '', country: '' }, openingHours: value.contact.openingHours, responseTime: value.contact.responseTime, version: value.contact.version })
    setFooterDraft({ tagline: value.footer.tagline, groups: value.footer.groups.map(group => ({ ...group, links: group.links.map(link => ({ ...link })) })), version: value.footer.version })
  }, [siteQuery.data])

  async function loadLatestPage() {
    const latest = await getStaffContentPage(selection as PageSlug)
    setConflict({ version: latest.version, latest, resource: selection })
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('')
    if (selection === 'contact-settings' && contactDraft.phones.some(phone => !validUkPhone(phone.number))) {
      setError('Check each UK phone number. Enter 11 digits starting with 01–09, or +44 followed by 10 digits.')
      return
    }
    setSaving(true)
    try {
      if (selection === 'contact-settings') {
        const saved = await updateStaffContact(contactDraft)
        setContactDraft({ email: saved.email, phones: saved.phones ?? [], address: saved.address, openingHours: saved.openingHours, responseTime: saved.responseTime, version: saved.version })
        queryClient.setQueryData<SiteContent>(['site-content'], current => current ? { ...current, contact: saved } : current)
        await queryClient.invalidateQueries({ queryKey: ['site-content'], refetchType: 'all' })
      } else if (selection === 'footer-settings') {
        const saved = await updateStaffFooter(footerDraft)
        setFooterDraft({ tagline: saved.tagline, groups: saved.groups, version: saved.version })
        queryClient.setQueryData<SiteContent>(['site-content'], current => current ? { ...current, footer: saved } : current)
        await queryClient.invalidateQueries({ queryKey: ['site-content'], refetchType: 'all' })
      } else {
        const input: EditableContentPage & { version: number } = {
          title: pageDraft.title,
          intro: pageDraft.intro,
          sections: pageDraft.sections,
          version: pageVersion,
          ...(selection === 'faqs' ? { faqs: pageDraft.faqs ?? [] } : {}),
        }
        const saved = await updateStaffContentPage(selection, input)
        setPageVersion(saved.version); setPageDraft({ title: saved.title, intro: saved.intro, sections: saved.sections, faqs: saved.faqs ?? [] })
        await queryClient.invalidateQueries({ queryKey: ['content-page', selection] })
      }
      setConflict(null); setMessage('Changes saved and are live now.')
    } catch (caught) {
      if (caught instanceof BackendApiError && (caught.status === 409 || caught.code === 'VERSION_CONFLICT')) {
        setError('A newer version was saved. Review it before choosing how to continue.')
        if (selection === 'contact-settings' || selection === 'footer-settings') {
          const latestSite = await getSiteContent()
          const latest = selection === 'contact-settings' ? latestSite.contact : latestSite.footer
          setConflict({ version: latest.version, latest, resource: selection })
        } else await loadLatestPage()
      } else setError(caught instanceof Error ? caught.message : 'The content could not be saved.')
    } finally { setSaving(false) }
  }

  function acceptLatestVersion() {
    if (!conflict) return
    if (conflict.resource === 'contact-settings') setContactDraft(current => ({ ...current, version: conflict.version }))
    else if (conflict.resource === 'footer-settings') setFooterDraft(current => ({ ...current, version: conflict.version }))
    else setPageVersion(conflict.version)
    setConflict(null); setError(''); setMessage('Your edits are unchanged. Saving now will replace the version you just reviewed.')
  }

  function replaceWithLatest() {
    if (!conflict) return
    if (conflict.resource === 'contact-settings') {
      const latest = conflict.latest as ContactContent
      setContactDraft({ email: latest.email, phones: latest.phones, address: latest.address, openingHours: latest.openingHours, responseTime: latest.responseTime, version: latest.version })
    } else if (conflict.resource === 'footer-settings') {
      const latest = conflict.latest as FooterContent
      setFooterDraft({ tagline: latest.tagline, groups: latest.groups, version: latest.version })
    } else {
      const latest = conflict.latest as ContentPage
      setPageDraft({ title: latest.title, intro: latest.intro, sections: latest.sections, faqs: latest.faqs ?? [] })
      setPageVersion(latest.version)
    }
    setConflict(null); setError(''); setMessage('The latest saved version is loaded into the editor.')
  }

  const moveSection = (index: number, offset: number) => setPageDraft(current => {
    const next = [...current.sections]; const target = index + offset
    if (target < 0 || target >= next.length) return current
    ;[next[index], next[target]] = [next[target], next[index]]
    return { ...current, sections: next }
  })

  function updateSection(index: number, update: Partial<Section>) {
    setPageDraft(current => ({ ...current, sections: current.sections.map((section, itemIndex) => itemIndex === index ? { ...section, ...update } : section) }))
  }

  const loading = selection === 'contact-settings' || selection === 'footer-settings' ? siteQuery.isLoading : pageQuery.isLoading
  const loadError = selection === 'contact-settings' || selection === 'footer-settings' ? siteQuery.error : pageQuery.error

  return <main className="container-page max-w-5xl py-12 sm:py-16">
    <p className="text-sm text-gray-500"><Link to="/account" className="underline">Account</Link> / Admin tools / Store content</p>
    <div className="mt-5"><p className="text-xs font-bold uppercase tracking-[.18em] text-accent">Admin tools</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">Store content</h1><p className="mt-3 text-gray-600">Edit storefront pages and shared details. Saved changes go live immediately.</p></div>
    <div className="mt-8 grid gap-6 lg:grid-cols-[240px_1fr]">
      <nav aria-label="Content selector" className="h-fit border border-line bg-white p-4">
        <label className="block text-sm font-bold">Choose content<select value={selection} onChange={event => { const next = event.target.value as Selection; setSelection(next); setSearchParams(next === 'contact-settings' || next === 'footer-settings' ? { section: 'storefront', store: next === 'footer-settings' ? 'footer' : 'contact' } : { section: 'pages', page: next }); setConflict(null); setMessage(''); setError('') }} className="mt-2 w-full border border-line bg-white px-3 py-2.5 font-normal">
          <optgroup label="Pages">{pages.map(([slug, title]) => <option key={slug} value={slug}>{title}</option>)}</optgroup><optgroup label="Shared storefront"><option value="contact-settings">Contact details</option><option value="footer-settings">Footer</option></optgroup>
        </select></label>
        <Link to="/account" className="mt-5 inline-block text-sm text-brand underline">Back to account</Link>
      </nav>
      <section className="border border-line bg-white p-5 shadow-card sm:p-7">
        {loading && <p className="text-sm text-gray-600">Loading saved content…</p>}
        {loadError && !loading && <div role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError instanceof Error ? loadError.message : 'Content could not be loaded.'}</div>}
        {!loading && !loadError && <form onSubmit={save} className="space-y-6">
          {selection === 'contact-settings' ? <ContactEditor value={contactDraft} onChange={setContactDraft} /> : selection === 'footer-settings' ? <FooterEditor value={footerDraft} onChange={setFooterDraft} /> : <>
            <div><h2 className="text-xl font-bold">{pages.find(([slug]) => slug === selection)?.[1]} page</h2><p className="mt-1 text-xs text-gray-500">Version {pageVersion}{pageQuery.data?.updatedAt ? ` · Updated ${new Date(pageQuery.data.updatedAt).toLocaleString()}` : ''}</p></div>
            <Field label="Title"><TextInput required maxLength={200} value={pageDraft.title} onChange={event => setPageDraft(current => ({ ...current, title: event.target.value }))} /></Field>
            <Field label="Intro"><TextArea maxLength={2000} rows={3} value={pageDraft.intro} onChange={event => setPageDraft(current => ({ ...current, intro: event.target.value }))} /></Field>
            <div className="space-y-4"><div className="flex items-center justify-between"><h3 className="text-lg font-bold">Sections</h3><button type="button" disabled={pageDraft.sections.length >= 40} onClick={() => setPageDraft(current => ({ ...current, sections: [...current.sections, blankSection()] }))} className="btn-secondary">Add section</button></div>
              {pageDraft.sections.map((section, index) => <fieldset key={index} className="space-y-4 border border-line bg-sand/40 p-4"><legend className="px-1 text-sm font-bold">Section {index + 1}</legend>
                <div className="flex justify-end gap-3"><button type="button" disabled={index === 0} onClick={() => moveSection(index, -1)} className="text-sm text-brand underline disabled:opacity-40">Move up</button><button type="button" disabled={index === pageDraft.sections.length - 1} onClick={() => moveSection(index, 1)} className="text-sm text-brand underline disabled:opacity-40">Move down</button><button type="button" onClick={() => setPageDraft(current => ({ ...current, sections: current.sections.filter((_, itemIndex) => itemIndex !== index) }))} className="text-sm text-red-700 underline">Remove</button></div>
                <Field label="Heading"><TextInput required maxLength={160} value={section.heading} onChange={event => updateSection(index, { heading: event.target.value })} /></Field>
                <Field label="Body"><TextArea maxLength={10000} rows={5} value={section.body} onChange={event => updateSection(index, { body: event.target.value })} /></Field>
                <Field label="Bullets" hint="One bullet per line, up to 30 bullets."><TextArea rows={4} value={section.bullets.join('\n')} onChange={event => updateSection(index, { bullets: event.target.value.split('\n').slice(0, 30) })} /></Field>
              </fieldset>)}
            </div>
            {selection === 'faqs' && <div className="space-y-4"><div className="flex items-center justify-between"><h3 className="text-lg font-bold">FAQs</h3><button type="button" disabled={(pageDraft.faqs?.length ?? 0) >= 100} onClick={() => setPageDraft(current => ({ ...current, faqs: [...(current.faqs ?? []), blankFAQ()] }))} className="btn-secondary">Add FAQ</button></div>{(pageDraft.faqs ?? []).map((faq, index) => <fieldset key={index} className="space-y-3 border border-line p-4"><legend className="px-1 text-sm font-bold">FAQ {index + 1}</legend><div className="flex justify-end gap-3"><button type="button" disabled={index === 0} onClick={() => setPageDraft(current => { const faqs = [...(current.faqs ?? [])]; [faqs[index - 1], faqs[index]] = [faqs[index], faqs[index - 1]]; return { ...current, faqs } })} className="text-sm text-brand underline disabled:opacity-40">Move up</button><button type="button" disabled={index === (pageDraft.faqs?.length ?? 0) - 1} onClick={() => setPageDraft(current => { const faqs = [...(current.faqs ?? [])]; [faqs[index + 1], faqs[index]] = [faqs[index], faqs[index + 1]]; return { ...current, faqs } })} className="text-sm text-brand underline disabled:opacity-40">Move down</button><button type="button" onClick={() => setPageDraft(current => ({ ...current, faqs: (current.faqs ?? []).filter((_, itemIndex) => itemIndex !== index) }))} className="text-sm text-red-700 underline">Remove</button></div><Field label="Question"><TextInput required maxLength={200} value={faq.question} onChange={event => setPageDraft(current => ({ ...current, faqs: (current.faqs ?? []).map((item, itemIndex) => itemIndex === index ? { ...item, question: event.target.value } : item) }))} /></Field><Field label="Answer"><TextArea required maxLength={5000} rows={3} value={faq.answer} onChange={event => setPageDraft(current => ({ ...current, faqs: (current.faqs ?? []).map((item, itemIndex) => itemIndex === index ? { ...item, answer: event.target.value } : item) }))} /></Field></fieldset>)}</div>}
          </>}
          {error && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {message && <p role="status" className="border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</p>}
          {conflict && <><ConflictNotice version={conflict.version} latest={conflict.latest} onUseLatest={acceptLatestVersion} /><button type="button" onClick={replaceWithLatest} className="text-sm font-semibold text-brand underline">Replace my edits with the latest saved version</button></>}
          <div className="border-t border-line pt-5"><button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save and publish'}</button></div>
        </form>}
      </section>
    </div>
  </main>
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
