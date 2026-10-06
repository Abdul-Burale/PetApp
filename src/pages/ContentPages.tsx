import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Clock3, Heart, Mail, MapPin, Phone, RotateCcw, Truck } from 'lucide-react'
import { BackendApiError, getContentPage, getSiteContent, submitContactMessage, type ContentPage, type ContentContact } from '../lib/api'
import { pageBriefs, pageSlugs, plainTextError, type PageSlug } from '../lib/contentPages'

type Section = ContentPage['sections'][number]
const anchor = (index: number) => `section-${index + 1}`

function SectionText({ section, numbered = false }: { section: Section; numbered?: boolean }) {
  const List = numbered ? 'ol' : 'ul'
  return <>
    {section.body && <p className="mt-4 whitespace-pre-wrap break-words leading-7 text-gray-700">{section.body}</p>}
    {section.bullets.length > 0 && <List className={`mt-4 space-y-3 pl-5 leading-7 text-gray-700 ${numbered ? 'list-decimal marker:font-bold marker:text-brand' : 'list-disc marker:text-accent'}`}>
      {section.bullets.map((bullet, index) => <li key={index} className="whitespace-pre-wrap break-words pl-1">{bullet}</li>)}
    </List>}
  </>
}

function EmptyContent({ slug }: { slug: PageSlug }) {
  const titles: Record<PageSlug, string> = { contact: 'Contact information is being prepared', delivery: 'Delivery information is being prepared', returns: 'Returns information is being prepared', faqs: 'Answers are being prepared', 'our-story': 'Our story is being prepared', guides: 'New care guides are being prepared', privacy: 'Privacy notice is being prepared', terms: 'Terms are being prepared' }
  return <div className="rounded-2xl border border-dashed border-line bg-sand/50 px-6 py-12 text-center">
    <h2 className="text-xl font-bold">{titles[slug]}</h2>
    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-600">This page has not yet been populated with approved store information.</p>
    {slug !== 'contact' && <Link to="/contact" className="mt-5 inline-flex items-center gap-2 font-semibold text-brand underline">Contact the shop <ArrowRight size={16} /></Link>}
  </div>
}

function DeliveryContent({ page }: { page: ContentPage }) {
  return <section aria-label="Delivery information">
    <nav aria-label="Delivery topics" className="mb-7 flex flex-wrap gap-2">{page.sections.map((section, index) => <a key={index} href={`#${anchor(index)}`} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-brand hover:bg-sand">{section.heading}</a>)}</nav>
    <div className="grid gap-5 md:grid-cols-2">{page.sections.map((section, index) => <article id={anchor(index)} key={index} className="scroll-mt-6 rounded-xl border border-line p-6 sm:p-8">
      <span className="text-xs font-bold uppercase tracking-widest text-accent">Delivery · {String(index + 1).padStart(2, '0')}</span>
      <h2 className="mt-3 text-2xl font-bold">{section.heading}</h2><SectionText section={section} />
    </article>)}</div>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-sand p-6"><p className="font-semibold">Questions about delivery?</p><Link to="/contact" className="inline-flex items-center gap-2 text-sm font-bold text-brand underline">Ask the shop <ArrowRight size={16} /></Link></div>
  </section>
}

function ReturnsContent({ page }: { page: ContentPage }) {
  return <section aria-label="Returns information" className="mx-auto max-w-3xl">
    <div className="relative space-y-8 border-l-2 border-line pl-6 sm:pl-10">{page.sections.map((section, index) => <article id={anchor(index)} key={index} className="relative scroll-mt-6 rounded-xl bg-sand/50 p-6 sm:p-8">
      <span aria-hidden="true" className="absolute -left-11 top-6 grid h-9 w-9 place-items-center rounded-full border-4 border-white bg-brand text-xs font-bold text-white sm:-left-[60px]">{index + 1}</span>
      <h2 className="text-2xl font-bold">{section.heading}</h2><SectionText section={section} numbered />
    </article>)}</div>
    <Link to="/contact" className="btn-primary mt-8">Ask about a return <ArrowRight size={16} /></Link>
  </section>
}

function FaqContent({ page }: { page: ContentPage }) {
  const [search, setSearch] = useState('')
  const faqs = (page.faqs ?? []).map((faq, index) => ({ ...faq, index })).filter(faq => `${faq.question} ${faq.answer}`.toLowerCase().includes(search.toLowerCase()))
  return <section aria-label="Frequently asked questions" className="mx-auto max-w-3xl">
    <label className="block font-semibold">Find an answer<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search questions and answers" className="mt-2 w-full rounded-lg border border-line bg-sand/40 px-4 py-3 font-normal" /></label>
    <p role="status" className="mb-5 mt-2 text-sm text-gray-500">{faqs.length} {faqs.length === 1 ? 'answer' : 'answers'}</p>
    <div className="divide-y divide-line border-y border-line">{faqs.map(faq => <details id={`faq-${faq.index + 1}`} key={faq.index} className="group scroll-mt-6 py-5">
      <summary className="flex cursor-pointer items-center justify-between gap-6 rounded text-lg font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"><span>{faq.question}</span><span aria-hidden="true" className="text-2xl text-brand group-open:hidden">+</span><span aria-hidden="true" className="hidden text-2xl text-brand group-open:block">−</span></summary>
      <p className="mt-4 whitespace-pre-wrap break-words leading-7 text-gray-700">{faq.answer}</p>
    </details>)}</div>
    {!faqs.length && (search ? <p className="py-8 text-gray-600">No answers match your search. Try another word or <Link to="/contact" className="text-brand underline">contact the shop</Link>.</p> : <div className="mt-6"><EmptyContent slug="faqs" /></div>)}
    {page.sections.map((section, index) => <article id={anchor(index)} key={index} className="mt-8 rounded-xl bg-sand p-6"><h2 className="text-xl font-bold">{section.heading}</h2><SectionText section={section} /></article>)}
  </section>
}

function StoryContent({ page }: { page: ContentPage }) {
  const [lead, ...chapters] = page.sections
  return <section aria-label="Our story">
    {lead && <article id={anchor(0)} className="grid scroll-mt-6 gap-8 border-b border-line pb-12 md:grid-cols-[1fr_1.4fr]">
      <div><p className="text-xs font-bold uppercase tracking-widest text-accent">In our own words</p><h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">{lead.heading}</h2></div>
      <div className="text-lg"><SectionText section={lead} /></div>
    </article>}
    <div className="mt-10 grid gap-6 md:grid-cols-2">{chapters.map((section, index) => <article id={anchor(index + 1)} key={index} className="scroll-mt-6 rounded-2xl bg-sand p-7 sm:p-9"><Heart aria-hidden="true" size={24} className="mb-5 text-accent" /><h2 className="font-serif text-2xl">{section.heading}</h2><SectionText section={section} /></article>)}</div>
  </section>
}

function GuidesContent({ page }: { page: ContentPage }) {
  const [search, setSearch] = useState('')
  const guides = page.sections.map((section, index) => ({ section, index })).filter(({ section }) => `${section.heading} ${section.body} ${section.bullets.join(' ')}`.toLowerCase().includes(search.toLowerCase()))
  return <section aria-label="Pet care guides">
    <label className="block max-w-xl font-semibold">Find a care guide<input type="search" placeholder="Search by pet or topic" value={search} onChange={event => setSearch(event.target.value)} className="mt-2 w-full rounded-lg border border-line px-4 py-3 font-normal" /></label>
    <p role="status" className="mt-2 text-sm text-gray-500">{guides.length} {guides.length === 1 ? 'guide' : 'guides'}</p>
    <nav aria-label="Care guide index" className="my-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{guides.map(({ section, index }) => <a href={`#${anchor(index)}`} key={index} className="group flex items-center gap-4 rounded-xl border border-line p-5 hover:border-brand"><BookOpen aria-hidden="true" className="shrink-0 text-accent" size={22} /><span className="font-bold">{section.heading}</span><ArrowRight aria-hidden="true" size={16} className="ml-auto shrink-0 text-brand" /></a>)}</nav>
    <div className="space-y-8">{guides.map(({ section, index }) => <article id={anchor(index)} key={index} className="scroll-mt-6 rounded-2xl bg-sand/60 p-6 sm:p-10"><div className="mx-auto max-w-3xl"><p className="text-xs font-bold uppercase tracking-widest text-accent">Care guide {String(index + 1).padStart(2, '0')}</p><h2 className="mt-3 text-2xl font-bold sm:text-3xl">{section.heading}</h2><SectionText section={section} /></div></article>)}</div>
    {!guides.length && <p className="py-8 text-gray-600">No guides match your search. Try another pet or topic.</p>}
  </section>
}

function LegalContent({ page }: { page: ContentPage }) {
  return <div className="grid items-start gap-10 lg:grid-cols-[250px_minmax(0,1fr)]">
    <nav aria-label="Policy contents" className="rounded-xl bg-sand p-6 lg:sticky lg:top-6"><h2 className="font-bold">Contents</h2><ol className="mt-4 space-y-3">{page.sections.map((section, index) => <li key={index}><a href={`#${anchor(index)}`} className="flex gap-3 text-sm leading-6 text-brand hover:underline"><span className="text-gray-500">{index + 1}.</span>{section.heading}</a></li>)}</ol></nav>
    <div className="max-w-3xl divide-y divide-line">{page.sections.map((section, index) => <article id={anchor(index)} key={index} className="scroll-mt-6 py-8 first:pt-0"><h2 className="text-xl font-bold"><span className="mr-3 text-gray-400">{index + 1}.</span>{section.heading}</h2><SectionText section={section} /></article>)}</div>
  </div>
}

function ContactDetails({ contact }: { contact: ContentContact }) {
  const address = [contact.address.line1, contact.address.line2, [contact.address.townCity, contact.address.county].filter(Boolean).join(', '), contact.address.postcode, contact.address.country].filter(Boolean)
  const hasDetails = Boolean(contact.email || contact.phones.length || address.length || contact.openingHours || contact.responseTime)
  return <section aria-label="Contact details" className="rounded-2xl bg-sand p-6 sm:p-8"><h2 className="text-2xl font-bold">Get in touch</h2>
    {!hasDetails && <p className="mt-4 text-sm leading-6 text-gray-600">Contact details have not been published yet. You can still use the enquiry form.</p>}
    <dl className="mt-6 space-y-6">
      {contact.email && <div><dt className="flex items-center gap-3 font-bold"><Mail size={18} aria-hidden="true" className="text-brand" />Email</dt><dd className="mt-2 break-all pl-8"><a className="text-brand underline" href={`mailto:${contact.email}`}>{contact.email}</a></dd></div>}
      {contact.phones.map((phone, index) => <div key={index}><dt className="flex items-center gap-3 font-bold"><Phone size={18} aria-hidden="true" className="text-brand" />{phone.label}</dt><dd className="mt-2 pl-8"><a className="text-brand underline" href={`tel:${phone.number.replace(/[^+\d]/g, '')}`}>{phone.number}</a></dd></div>)}
      {address.length > 0 && <div><dt className="flex items-center gap-3 font-bold"><MapPin size={18} aria-hidden="true" className="text-brand" />Postal address</dt><dd className="mt-2 pl-8"><address className="whitespace-pre-wrap not-italic leading-7 text-gray-700">{address.join('\n')}</address></dd></div>}
      {contact.openingHours && <div><dt className="flex items-center gap-3 font-bold"><Clock3 size={18} aria-hidden="true" className="text-brand" />Opening hours</dt><dd className="mt-2 whitespace-pre-wrap pl-8 leading-7 text-gray-700">{contact.openingHours}</dd></div>}
      {contact.responseTime && <div className="border-t border-line pt-5"><dt className="font-bold">When to expect a reply</dt><dd className="mt-2 whitespace-pre-wrap leading-7 text-gray-700">{contact.responseTime}</dd></div>}
    </dl>
  </section>
}

function ContactForm() {
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [retryAt, setRetryAt] = useState(0)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget, values = new FormData(form)
    setStatus(''); setError('')
    if (Date.now() < retryAt) { setError(`Please wait ${Math.ceil((retryAt - Date.now()) / 1000)} seconds before trying again.`); return }
    const input = { name: String(values.get('name') ?? '').trim(), email: String(values.get('email') ?? '').trim(), orderNumber: String(values.get('orderNumber') ?? '').trim() || null, subject: String(values.get('subject') ?? '').trim(), message: String(values.get('message') ?? '').trim(), consent: values.get('consent') === 'on', website: String(values.get('website') ?? '') }
    const invalid = plainTextError(Object.values(input).filter((value): value is string => typeof value === 'string'))
    if (invalid || !input.name || !input.subject || input.message.length < 20) { setError(invalid || 'Enter your name, a subject and a message of at least 20 characters.'); return }
    setSending(true)
    try {
      const acknowledgement = await submitContactMessage(input)
      form.reset(); setStatus(`Your enquiry has been received.${acknowledgement.requestId ? ` Reference: ${acknowledgement.requestId}` : ''}`)
    } catch (caught) {
      if (caught instanceof BackendApiError && caught.status === 429) {
        const seconds = caught.retryAfter ?? 900
        setRetryAt(Date.now() + seconds * 1000); setError(`Too many attempts. Please wait ${seconds} seconds before trying again.`)
      } else setError(caught instanceof Error ? caught.message : 'Your enquiry could not be submitted. Please try again.')
    } finally { setSending(false) }
  }
  const inputClass = 'mt-2 w-full rounded-lg border border-line px-3 py-3 font-normal focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand'
  return <form onSubmit={submit} className="rounded-2xl border border-line p-6 sm:p-8"><h2 className="text-2xl font-bold">Send an enquiry</h2><p className="mt-2 text-sm italic leading-6 text-gray-600">Tell us how we can help. Please do not include passwords or payment details.</p>
    <div className="mt-6 grid gap-5 sm:grid-cols-2">
      <label className="text-sm font-semibold">Your name<input name="name" autoComplete="name" required maxLength={120} className={inputClass} /></label>
      <label className="text-sm font-semibold">Email address<input name="email" autoComplete="email" type="email" required maxLength={254} className={inputClass} /></label>
      <label className="text-sm font-semibold">Order number (optional)<input name="orderNumber" maxLength={80} className={inputClass} /></label>
      <label className="text-sm font-semibold">Subject<input name="subject" required maxLength={160} className={inputClass} /></label>
    </div>
    <label className="mt-5 block text-sm font-semibold">Message<textarea name="message" required minLength={20} maxLength={5000} rows={6} className={inputClass} /><span className="mt-1 block text-xs font-normal italic text-gray-500">20–5,000 characters. Plain text only.</span></label>
    <div hidden aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" maxLength={200} aria-label="Leave this field empty" /></div>
    <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-gray-700"><input name="consent" type="checkbox" required className="mt-1" /><span>I agree that My Pet Food can use my details to respond to this enquiry. <Link to="/privacy" className="text-brand underline">Privacy policy</Link></span></label>
    <button className="btn-primary mt-6" disabled={sending}>{sending ? 'Submitting…' : 'Send enquiry'} <ArrowRight size={16} /></button>
    {status && <p role="status" className="mt-4 rounded-lg bg-sand p-4 text-sm text-brand">{status}</p>}
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</p>}
  </form>
}

export function ContentPageView({ slug }: { slug: PageSlug }) {
  const brief = pageBriefs[slug]
  const pageQuery = useQuery({ queryKey: ['content-page', slug], queryFn: () => getContentPage(slug), retry: false, staleTime: 0 })
  const siteQuery = useQuery({ queryKey: ['site-content'], queryFn: getSiteContent, enabled: slug === 'contact', retry: false })
  const page = pageQuery.data
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [slug])
  useEffect(() => {
    const previous = document.title
    document.title = `${page?.title ?? brief.title} | My Pet Food`
    return () => { document.title = previous }
  }, [brief.title, page?.title])
  const isLegal = slug === 'privacy' || slug === 'terms'
  const Icon = slug === 'delivery' ? Truck : slug === 'returns' ? RotateCcw : slug === 'guides' ? BookOpen : null
  const related = pageSlugs.filter(other => pageBriefs[other].group === brief.group)
  return <main className="container-page max-w-6xl py-8 sm:py-12">
    <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-500"><Link to="/" className="hover:text-brand">Home</Link><span className="mx-2">/</span>{brief.group}<span className="mx-2">/</span><span className="text-ink">{page?.title ?? brief.title}</span></nav>
    <header className={slug === 'our-story' ? 'mb-12 rounded-2xl bg-brand px-6 py-12 text-white sm:px-12 sm:py-16' : isLegal ? 'mb-10 max-w-3xl border-b border-line pb-8' : 'mb-10 rounded-2xl bg-sand px-6 py-9 sm:px-10 sm:py-12'}>
      <p className={`text-xs font-bold uppercase tracking-[.2em] ${slug === 'our-story' ? 'text-white/80' : 'text-brand'}`}>{brief.group} · My Pet Food</p>
      <div className="mt-4 flex items-center gap-4">{Icon && <Icon aria-hidden="true" size={32} className="shrink-0 text-accent" />}<h1 className={`${slug === 'our-story' ? 'font-serif font-normal' : 'font-bold'} text-3xl tracking-tight sm:text-5xl`}>{page?.title ?? brief.title}</h1></div>
      {page?.intro && <p className={`mt-5 max-w-3xl whitespace-pre-wrap break-words text-lg leading-8 ${slug === 'our-story' ? 'text-white/90' : 'text-gray-700'}`}>{page.intro}</p>}
      {isLegal && page?.updatedAt && <p className="mt-4 text-sm text-gray-500">Last updated {new Date(page.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
    </header>
    {pageQuery.isPending && <p role="status" className="py-12 text-gray-600">Loading {brief.title.toLowerCase()}…</p>}
    {pageQuery.isError && <section role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6"><h2 className="text-xl font-bold">{pageQuery.error instanceof BackendApiError && pageQuery.error.status === 404 ? 'This page is unavailable' : 'We could not load this page'}</h2><p className="mt-2 text-sm leading-6">{pageQuery.error instanceof BackendApiError && pageQuery.error.status === 404 ? 'The content service has no published page at this address.' : pageQuery.error.message}</p><button onClick={() => void pageQuery.refetch()} className="btn-secondary mt-4">Try again</button></section>}
    {page && !pageQuery.isError && <>
      {slug === 'contact' ? <>
        <div className="grid items-start gap-6 lg:grid-cols-[.85fr_1.15fr]">
          {siteQuery.data ? <ContactDetails contact={siteQuery.data.contact} /> : <section role={siteQuery.isError ? 'alert' : 'status'} className="rounded-2xl bg-sand p-8"><h2 className="text-xl font-bold">Contact details</h2><p className="mt-3 text-sm">{siteQuery.isError ? 'Contact details could not be loaded.' : 'Loading contact details…'}</p>{siteQuery.isError && <button onClick={() => void siteQuery.refetch()} className="mt-4 text-brand underline">Retry contact details</button>}</section>}
          <ContactForm />
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">{page.sections.map((section, index) => <article id={anchor(index)} key={index} className="scroll-mt-6 rounded-xl border border-line p-6"><h2 className="text-xl font-bold">{section.heading}</h2><SectionText section={section} /></article>)}</div>
      </> : !page.sections.length && !(page.faqs?.length) ? <EmptyContent slug={slug} /> : slug === 'delivery' ? <DeliveryContent page={page} /> : slug === 'returns' ? <ReturnsContent page={page} /> : slug === 'faqs' ? <FaqContent page={page} /> : slug === 'our-story' ? <StoryContent page={page} /> : slug === 'guides' ? <GuidesContent page={page} /> : <LegalContent page={page} />}
    </>}
    <nav aria-label={`${brief.group} pages`} className="mt-12 border-t border-line pt-6"><p className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-500">Explore {brief.group}</p><div className="flex flex-wrap gap-2">{related.map(other => <Link key={other} to={`/${other}`} aria-current={other === slug ? 'page' : undefined} className={`rounded-full border px-4 py-2 text-sm ${other === slug ? 'border-brand bg-brand text-white' : 'border-line text-brand hover:bg-sand'}`}>{pageBriefs[other].title}</Link>)}</div></nav>
  </main>
}
