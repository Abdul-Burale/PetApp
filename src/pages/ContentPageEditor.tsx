import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { BackendApiError, getContentPage, getStaffContentPage, updateStaffContentPage, type ContentPage, type EditableContentPage } from '../lib/api'
import { pageBriefs, plainTextError, type PageSlug } from '../lib/contentPages'

type DraftSection = { id: string; heading: string; body: string; bulletsText: string; originalBullets?: string[] }
type DraftFAQ = { id: string; question: string; answer: string }
type Draft = { title: string; intro: string; sections: DraftSection[]; faqs: DraftFAQ[] }
const newSection = (heading = ''): DraftSection => ({ id: crypto.randomUUID(), heading, body: '', bulletsText: '' })
function draftFrom(page: ContentPage): Draft {
  return { title: page.title, intro: page.intro, sections: page.sections.map(section => ({ ...section, id: crypto.randomUUID(), bulletsText: section.bullets.join('\n'), originalBullets: section.bullets })), faqs: (page.faqs ?? []).map(faq => ({ ...faq, id: crypto.randomUUID() })) }
}
function editableFrom(draft: Draft, slug: PageSlug): EditableContentPage {
  return { title: draft.title, intro: draft.intro, sections: draft.sections.map(section => ({ heading: section.heading, body: section.body, bullets: section.originalBullets && section.bulletsText === section.originalBullets.join('\n') ? section.originalBullets : section.bulletsText.split('\n').map(bullet => bullet.trim()).filter(Boolean) })), ...(slug === 'faqs' ? { faqs: draft.faqs.map(({ question, answer }) => ({ question, answer })) } : {}) }
}
function Field({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return <label className="block text-sm font-semibold">{label}<span className="mb-2 mt-1 block text-sm font-normal italic leading-6 text-gray-500">{hint}</span>{children}</label>
}
const inputStyle = 'w-full rounded-lg border border-line bg-white px-4 py-3 font-normal focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand'

function fieldLabel(path: string) {
  const labels: Record<string, string> = { sections: 'Topic', faqs: 'Question', bullets: 'Supporting point', phones: 'Phone', title: 'Title', intro: 'Introduction', heading: 'Heading', body: 'Text', question: 'Question', answer: 'Answer', email: 'Email', number: 'Number', label: 'Label', openingHours: 'Opening hours', responseTime: 'Response time', address: 'Address', line1: 'Line 1', line2: 'Line 2', townCity: 'Town / city', postcode: 'Postcode', county: 'County', country: 'Country', groups: 'Link group', links: 'Link', route: 'Destination', tagline: 'Tagline' }
  return path.split('.').map(part => { const match = part.match(/^(\w+)(?:\[(\d+)\])?$/); return match ? `${labels[match[1]] ?? match[1]}${match[2] != null ? ` ${Number(match[2]) + 1}` : ''}` : part }).join(' → ')
}

export function ContentError({ error }: { error: unknown }) {
  return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900">
    <p>{error instanceof Error ? error.message : String(error)}</p>
    {error instanceof BackendApiError && error.fieldErrors && <ul className="mt-2 list-disc pl-5">{Object.entries(error.fieldErrors).map(([field, messages]) => <li key={field}>{fieldLabel(field)}: {Array.isArray(messages) ? messages.join('; ') : messages}</li>)}</ul>}
    {error instanceof BackendApiError && error.requestId && <p className="mt-2 text-xs">Support reference: {error.requestId}</p>}
  </div>
}

export function useDraftGuard(dirty: boolean, onDirtyChange: (dirty: boolean) => void) {
  useEffect(() => { onDirtyChange(dirty); return () => onDirtyChange(false) }, [dirty, onDirtyChange])
  useEffect(() => {
    if (!dirty) return
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [dirty])
}

function OrderControls({ index, length, name, onMove, onRemove }: { index: number; length: number; name: string; onMove: (offset: number) => void; onRemove: () => void }) {
  return <div className="flex flex-wrap gap-2">
    <button type="button" aria-label={`Move ${name} up`} disabled={index === 0} onClick={() => onMove(-1)} className="rounded border border-line p-2 text-brand disabled:opacity-30"><ArrowUp size={16} /></button>
    <button type="button" aria-label={`Move ${name} down`} disabled={index === length - 1} onClick={() => onMove(1)} className="rounded border border-line p-2 text-brand disabled:opacity-30"><ArrowDown size={16} /></button>
    <button type="button" aria-label={`Remove ${name}`} onClick={onRemove} className="rounded border border-red-200 p-2 text-red-700"><Trash2 size={16} /></button>
  </div>
}

function SavedPageSummary({ page }: { page: ContentPage }) {
  return <div className="space-y-4 break-words text-sm"><h4 className="font-bold">{page.title}</h4><p className="whitespace-pre-wrap">{page.intro || 'No introduction'}</p>{page.sections.map((section, index) => <div key={index}><h5 className="font-semibold">{index + 1}. {section.heading}</h5><p className="mt-1 whitespace-pre-wrap">{section.body}</p><ul className="list-disc pl-5">{section.bullets.map((bullet, i) => <li key={i}>{bullet}</li>)}</ul></div>)}{page.faqs?.map((faq, index) => <div key={index}><h5 className="font-semibold">{faq.question}</h5><p className="whitespace-pre-wrap">{faq.answer}</p></div>)}</div>
}

export function ContentPageEditor({ slug, onDirtyChange }: { slug: PageSlug; onDirtyChange: (dirty: boolean) => void }) {
  const query = useQuery({ queryKey: ['staff-content-page', slug], queryFn: () => getStaffContentPage(slug), retry: false, refetchOnWindowFocus: false })
  if (query.isPending) return <p role="status" className="p-8">Loading {pageBriefs[slug].title.toLowerCase()}…</p>
  if (query.isError) return <div className="space-y-4 p-6"><h2 className="text-xl font-bold">Could not load the {pageBriefs[slug].title} editor</h2>
    {query.error instanceof BackendApiError && query.error.status === 404 && <p className="text-sm leading-6">The editor route is working, but the content API returned 404 for this system page. Check that the content backend and its V5 migration are deployed to the configured API.</p>}
    <ContentError error={query.error} /><button className="btn-secondary" onClick={() => void query.refetch()}>Retry loading page</button>
  </div>
  return <LoadedPageEditor key={slug} slug={slug} initial={query.data} onDirtyChange={onDirtyChange} />
}

function LoadedPageEditor({ slug, initial, onDirtyChange }: { slug: PageSlug; initial: ContentPage; onDirtyChange: (dirty: boolean) => void }) {
  const brief = pageBriefs[slug], queryClient = useQueryClient()
  const [saved, setSaved] = useState(initial)
  const [draft, setDraft] = useState(() => draftFrom(initial))
  const [collapsed, setCollapsed] = useState(() => new Set(draft.sections.slice(1).map(section => section.id)))
  const [version, setVersion] = useState(initial.version)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [message, setMessage] = useState('')
  const [conflict, setConflict] = useState<ContentPage | null>(null)
  const [conflictPending, setConflictPending] = useState(false)
  const [reloadingConflict, setReloadingConflict] = useState(false)
  const dirty = JSON.stringify(editableFrom(draft, slug)) !== JSON.stringify(editableFrom(draftFrom(saved), slug))
  useDraftGuard(dirty, onDirtyChange)
  function edit(update: Partial<Draft>) { setDraft(current => ({ ...current, ...update })); setMessage('') }
  function adopt(page: ContentPage) {
    const next = draftFrom(page)
    setDraft(next); setCollapsed(new Set(next.sections.slice(1).map(section => section.id)))
  }
  function move(kind: 'sections' | 'faqs', index: number, offset: number) {
    setDraft(current => {
      const items = [...current[kind]], target = index + offset
      if (target < 0 || target >= items.length) return current
      ;[items[index], items[target]] = [items[target], items[index]]
      return { ...current, [kind]: items }
    }); setMessage('')
  }
  async function loadConflict() {
    setReloadingConflict(true)
    try { setConflict(await getStaffContentPage(slug)); setError(null) }
    catch (caught) { setError(caught) }
    finally { setReloadingConflict(false) }
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (conflictPending || saving) return
    setError(null); setMessage('')
    const editable = editableFrom(draft, slug)
    const textError = plainTextError([editable.title, editable.intro, ...editable.sections.flatMap(section => [section.heading, section.body, ...section.bullets]), ...(editable.faqs ?? []).flatMap(faq => [faq.question, faq.answer])])
    if (textError || !editable.title.trim() || editable.sections.some(section => !section.heading.trim() || section.bullets.length > 30 || section.bullets.some(bullet => bullet.length > 1000)) || editable.faqs?.some(faq => !faq.question.trim() || !faq.answer.trim())) {
      setError(textError || 'Give every section a heading and each question an answer. Use no more than 30 points per section, each up to 1,000 characters.'); return
    }
    setSaving(true)
    try {
      const result = await updateStaffContentPage(slug, { ...editable, version })
      setSaved(result); setVersion(result.version); adopt(result); setConflict(null)
      queryClient.setQueryData(['staff-content-page', slug], result)
      queryClient.setQueryData(['content-page', slug], result)
      await queryClient.invalidateQueries({ queryKey: ['content-page', slug], refetchType: 'none' })
      try {
        const publicPage = await getContentPage(slug)
        queryClient.setQueryData(['content-page', slug], publicPage)
        const sameCopy = JSON.stringify(editableFrom(draftFrom(publicPage), slug)) === JSON.stringify(editableFrom(draftFrom(result), slug))
        setMessage(publicPage.version === result.version && sameCopy ? 'Saved and published. The public page has been checked and shows this content.' : 'Your save succeeded, but the public page returned a different version or content. Review the live page before making further changes.')
      } catch {
        setMessage('Your save succeeded, but we could not confirm the public page. Do not resubmit; check the live page or contact support.')
      }
    } catch (caught) {
      if (caught instanceof BackendApiError && (caught.status === 409 || caught.code === 'VERSION_CONFLICT')) {
        setConflictPending(true); setError(null); await loadConflict()
      } else setError(caught)
    } finally { setSaving(false) }
  }
  const suggested = brief.sections.filter(section => !draft.sections.some(item => item.heading === section.heading))
  const faqEditor = <section aria-label="Question editor" className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-bold">Questions & answers</h3><p className="mt-1 text-sm italic text-gray-500">One card creates one expandable answer, in this order.</p></div><button type="button" className="btn-secondary" disabled={draft.faqs.length >= 100} onClick={() => edit({ faqs: [...draft.faqs, { id: crypto.randomUUID(), question: '', answer: '' }] })}><Plus size={16} />Add question</button></div>
    {!draft.faqs.length && <p className="rounded-xl border border-dashed border-line p-6 text-sm text-gray-600">Start with a question your customers often ask. No sample answers are published automatically.</p>}
    {draft.faqs.map((faq, index) => <fieldset key={faq.id} className="space-y-5 rounded-xl border border-line bg-white p-5 sm:p-6"><legend className="px-2 text-sm font-bold">Question {index + 1}</legend>
      <div className="flex justify-end"><OrderControls index={index} length={draft.faqs.length} name={`question ${index + 1}`} onMove={offset => move('faqs', index, offset)} onRemove={() => edit({ faqs: draft.faqs.filter(item => item.id !== faq.id) })} /></div>
      <Field label="Customer's question" hint="Write the question as a customer would ask it, for example: ‘Where do you deliver?’"><input className={inputStyle} required maxLength={200} value={faq.question} onChange={event => edit({ faqs: draft.faqs.map(item => item.id === faq.id ? { ...item, question: event.target.value } : item) })} /></Field>
      <Field label="Your answer" hint="Answer directly, using only approved information. Line breaks are preserved."><textarea className={inputStyle} required rows={4} maxLength={5000} value={faq.answer} onChange={event => edit({ faqs: draft.faqs.map(item => item.id === faq.id ? { ...item, answer: event.target.value } : item) })} /></Field>
    </fieldset>)}
  </section>
  const sectionEditor = <section aria-label="Section editor" className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-bold">{slug === 'guides' ? 'Care guides' : slug === 'our-story' ? 'Story & values' : slug === 'privacy' || slug === 'terms' ? 'Document clauses' : slug === 'faqs' ? 'Optional supporting notes' : 'Page topics'}</h3><p className="mt-1 text-sm italic leading-6 text-gray-500">Shown on the public page in this order. Use the arrows to rearrange them.</p></div><button type="button" className="btn-secondary" disabled={draft.sections.length >= 40} onClick={() => edit({ sections: [...draft.sections, newSection()] })}><Plus size={16} />Add {brief.sectionName.toLowerCase()}</button></div>
    {suggested.length > 0 && <div className="rounded-xl bg-sand/60 p-5"><p className="text-sm font-semibold">Suggested topics for {brief.title}</p><p className="mt-1 text-sm italic leading-6 text-gray-500">Add a heading, then write your own approved information. No factual or legal copy is filled in.</p><div className="mt-3 flex flex-wrap gap-2">{suggested.map(section => <button key={section.heading} type="button" disabled={draft.sections.length >= 40} className="rounded-full border border-line bg-white px-3 py-2 text-sm text-brand" onClick={() => edit({ sections: [...draft.sections, newSection(section.heading)] })}>+ {section.heading}</button>)}</div>{!draft.sections.length && <button type="button" className="mt-4 text-sm font-bold text-brand underline" onClick={() => edit({ sections: brief.sections.map(section => newSection(section.heading)) })}>Start with all recommended headings</button>}</div>}
    {!draft.sections.length && !suggested.length && <p className="rounded-xl border border-dashed border-line p-6 text-sm text-gray-600">No supporting notes yet. These are optional.</p>}
    {draft.sections.map((section, index) => {
      const help = brief.sections.find(item => item.heading === section.heading)
      const location = slug === 'our-story' ? index === 0 ? 'Lead story' : 'Supporting story / values card' : slug === 'guides' ? `Guide ${index + 1} in the index and full guide listing` : slug === 'privacy' || slug === 'terms' ? `Clause ${index + 1} and its contents link` : `${brief.sectionName} ${index + 1}`
      return <fieldset key={section.id} className="overflow-hidden rounded-xl border border-line bg-white shadow-sm"><legend className="sr-only">{brief.sectionName} {index + 1}</legend>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-sand/40 p-5"><button type="button" aria-expanded={!collapsed.has(section.id)} aria-controls={`fields-${section.id}`} onClick={() => setCollapsed(current => { const next = new Set(current); if (next.has(section.id)) next.delete(section.id); else if (section.heading.trim()) next.add(section.id); return next })} className="min-w-0 flex-1 text-left"><span className="block text-xs font-bold uppercase tracking-wider text-accent">{location}</span><span className="mt-1 block font-bold">{section.heading || `Untitled ${brief.sectionName.toLowerCase()}`}</span><span className="mt-2 block text-xs italic text-brand">{collapsed.has(section.id) ? 'Edit this topic ↓' : 'Collapse fields ↑'}</span></button><OrderControls index={index} length={draft.sections.length} name={`section ${index + 1}`} onMove={offset => move('sections', index, offset)} onRemove={() => edit({ sections: draft.sections.filter(item => item.id !== section.id) })} /></div>
        <div id={`fields-${section.id}`} hidden={collapsed.has(section.id)} onInvalid={() => setCollapsed(current => { const next = new Set(current); next.delete(section.id); return next })} className="space-y-5 p-5 sm:p-6">
          <Field label={slug === 'guides' ? 'Guide title' : slug === 'privacy' || slug === 'terms' ? 'Clause heading' : 'Topic heading'} hint={slug === 'guides' ? 'A clear title customers can find in the guide index.' : 'This is the heading shown above this content on the public page.'}><input className={inputStyle} required maxLength={160} value={section.heading} onChange={event => edit({ sections: draft.sections.map(item => item.id === section.id ? { ...item, heading: event.target.value } : item) })} /></Field>
          <Field label={slug === 'guides' ? 'Full guide text' : slug === 'our-story' ? 'Your story' : slug === 'privacy' || slug === 'terms' ? 'Approved clause wording' : 'Explanation'} hint={help?.bodyHint ?? 'Write this topic in plain text. Keep only information that has been approved for the website.'}><textarea className={inputStyle} rows={slug === 'guides' || slug === 'privacy' || slug === 'terms' ? 7 : 5} maxLength={10000} value={section.body} onChange={event => edit({ sections: draft.sections.map(item => item.id === section.id ? { ...item, body: event.target.value } : item) })} /></Field>
          <Field label={slug === 'returns' ? 'Numbered points or steps (optional)' : slug === 'guides' ? 'Practical tips (optional)' : 'Supporting points (optional)'} hint={`${help?.bulletsHint ?? 'One supporting point per line.'} Up to 30 points, 1,000 characters each.`}><textarea className={inputStyle} rows={3} value={section.bulletsText} onChange={event => edit({ sections: draft.sections.map(item => item.id === section.id ? { ...item, bulletsText: event.target.value } : item) })} /></Field>
        </div>
      </fieldset>
    })}
  </section>
  return <form onSubmit={save} className="space-y-8 p-5 sm:p-8">
    <header><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-accent">{brief.group} page</p><h2 className="mt-2 text-2xl font-bold">Edit {brief.title}</h2></div><Link target="_blank" rel="noreferrer" to={`/${slug}`} className="btn-secondary">View live page ↗</Link></div><p className="mt-4 text-sm italic leading-7 text-gray-600">{brief.layoutHint}</p>{slug === 'contact' && <Link to="/admin/content?section=storefront&store=contact" onClick={event => { if (dirty && !window.confirm('Discard your unpublished page changes and edit shared contact details?')) event.preventDefault() }} className="mt-3 inline-block text-sm font-bold text-brand underline">Edit phone numbers, address, email & hours →</Link>}</header>
    <fieldset disabled={saving} className="space-y-8 disabled:opacity-60">
      <div className="space-y-5 rounded-xl bg-sand/50 p-5 sm:p-6"><h3 className="text-lg font-bold">At the top of the page</h3>
        <Field label="Page title" hint={`The main heading customers see on /${slug}. The page address cannot be renamed.`}><input className={inputStyle} required maxLength={200} value={draft.title} onChange={event => edit({ title: event.target.value })} /></Field>
        <Field label={slug === 'our-story' ? 'Opening words' : 'Short introduction'} hint={brief.introductionHint}><textarea className={inputStyle} rows={3} maxLength={2000} value={draft.intro} onChange={event => edit({ intro: event.target.value })} /></Field>
      </div>
      {slug === 'faqs' ? <>{faqEditor}<details className="rounded-xl border border-line p-5"><summary className="cursor-pointer font-semibold">Optional notes below the answers ({draft.sections.length})</summary><div className="mt-6">{sectionEditor}</div></details></> : sectionEditor}
    </fieldset>
    {error != null && <ContentError error={error} />}
    {message && <p role="status" className="rounded-xl border border-line bg-sand p-5 text-sm leading-6 text-brand">{message}</p>}
    {conflictPending && <section aria-label="Resolve edit conflict" className="space-y-4 rounded-xl border border-amber-300 bg-amber-50 p-5"><h3 className="font-bold">Another staff member saved this page first</h3><p className="text-sm leading-6">Your draft has not been changed. Compare the content, then explicitly choose how to continue. Nothing is retried automatically.</p>
      {conflict ? <><details><summary className="cursor-pointer font-semibold">Compare your draft with the latest saved page</summary><div className="mt-4 grid gap-4 md:grid-cols-2"><div className="max-h-96 overflow-auto rounded bg-white p-4"><p className="mb-4 font-bold">Your draft</p><SavedPageSummary page={{ ...saved, ...editableFrom(draft, slug) }} /></div><div className="max-h-96 overflow-auto rounded bg-white p-4"><p className="mb-4 font-bold">Latest saved page</p><SavedPageSummary page={conflict} /></div></div></details><div className="flex flex-wrap gap-3"><button type="button" className="btn-secondary" onClick={() => { setSaved(conflict); adopt(conflict); setVersion(conflict.version); setConflict(null); setConflictPending(false); setMessage('Latest saved content loaded. Your previous draft has been replaced.') }}>Use latest saved content</button><button type="button" className="btn-secondary" onClick={() => { setVersion(conflict.version); setConflict(null); setConflictPending(false); setMessage('Your draft is kept. Review it, then choose Save and publish to replace the version you compared.') }}>Keep my draft after comparison</button></div></> : <button type="button" className="btn-secondary" disabled={reloadingConflict} onClick={() => void loadConflict()}>{reloadingConflict ? 'Loading latest…' : 'Load latest for comparison'}</button>}
    </section>}
    <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6"><div><p className="text-sm font-semibold">{dirty ? 'Unpublished changes' : 'No unpublished changes'}</p><p className="mt-1 text-xs italic text-gray-500">Saves go live immediately. Last saved {new Date(saved.updatedAt).toLocaleString('en-GB')}.</p></div><button className="btn-primary" disabled={saving || conflictPending}>{saving ? 'Saving and checking…' : 'Save and publish'}</button></footer>
  </form>
}
