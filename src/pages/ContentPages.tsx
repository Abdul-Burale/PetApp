import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Clock3, Mail, MapPin, Phone } from 'lucide-react'
import { getContentPage, getSiteContent, submitContactMessage, type ContentPage } from '../lib/api'

const slugs = ['contact', 'delivery', 'returns', 'faqs', 'our-story', 'guides', 'privacy', 'terms'] as const
type PageSlug = typeof slugs[number]

const fallbackPages: Record<PageSlug, ContentPage> = {
  contact: { slug: 'contact', title: 'Contact Us', intro: '', sections: [], version: 0, updatedAt: '' },
  delivery: { slug: 'delivery', title: 'Delivery', intro: '', sections: [], version: 0, updatedAt: '' },
  returns: { slug: 'returns', title: 'Returns', intro: '', sections: [], version: 0, updatedAt: '' },
  faqs: { slug: 'faqs', title: 'Frequently Asked Questions', intro: '', sections: [], version: 0, updatedAt: '' },
  'our-story': { slug: 'our-story', title: 'Our Story', intro: '', sections: [], version: 0, updatedAt: '' },
  guides: { slug: 'guides', title: 'Pet Care Guides', intro: '', sections: [], version: 0, updatedAt: '' },
  privacy: { slug: 'privacy', title: 'Privacy Policy', intro: '', sections: [], version: 0, updatedAt: '' },
  terms: { slug: 'terms', title: 'Terms and Conditions', intro: '', sections: [], version: 0, updatedAt: '' },
}

const pageGroups = {
  Help: [['contact', 'Contact Us'], ['delivery', 'Delivery'], ['returns', 'Returns'], ['faqs', 'FAQs']],
  About: [['our-story', 'Our Story'], ['guides', 'Pet Care Guides'], ['privacy', 'Privacy Policy'], ['terms', 'Terms']],
} as const

function ContentSections({ page, slug }: { page: ContentPage; slug: PageSlug }) {
  const isLegal = slug === 'privacy' || slug === 'terms'
  const isGuideList = slug === 'guides'
  return <div className={slug === 'delivery' || slug === 'returns' || slug === 'our-story' ? 'grid gap-4 sm:grid-cols-2' : 'space-y-4'}>
    {page.sections.map((section, index) => <article id={`section-${index + 1}`} key={`${section.heading}-${index}`} className={`scroll-mt-8 rounded-lg border border-line bg-white p-5 sm:p-6 ${isLegal ? 'border-l-4 border-l-brand' : ''}`}>
      <div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sand text-xs font-bold text-brand">{String(index + 1).padStart(2, '0')}</span><h2 className="pt-1 text-lg font-bold">{section.heading}</h2></div>
      {section.body && <p className="mt-4 whitespace-pre-line leading-7 text-gray-700">{section.body}</p>}
      {section.bullets?.length > 0 && <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-700">{section.bullets.map((bullet, itemIndex) => <li key={itemIndex} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"/><span>{bullet}</span></li>)}</ul>}
      {isGuideList && <p className="mt-4 text-xs font-bold uppercase tracking-wider text-brand">Pet care guide</p>}
    </article>)}
    {page.faqs?.map((faq, index) => <details id={`faq-${index + 1}`} key={`${faq.question}-${index}`} className="group scroll-mt-8 rounded-lg border border-line bg-white p-5 sm:p-6">
      <summary className="cursor-pointer list-none pr-8 font-bold marker:hidden after:float-right after:-mr-8 after:text-xl after:font-normal after:text-brand after:content-['+'] group-open:after:content-['−']">{faq.question}</summary><p className="mt-4 whitespace-pre-line border-t border-line pt-4 leading-7 text-gray-700">{faq.answer}</p>
    </details>)}
    {!page.sections.length && !page.faqs?.length && <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center"><h2 className="font-bold">This page is being prepared</h2><p className="mt-2 text-sm leading-6 text-gray-600">Store information will appear here once it has been published.</p></div>}
  </div>
}

function ContactForm() {
  const [status, setStatus] = useState('')
  const [sending, setSending] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    setSending(true); setStatus('')
    try {
      await submitContactMessage({ name: String(values.get('name') ?? '').trim(), email: String(values.get('email') ?? '').trim(), orderNumber: String(values.get('orderNumber') ?? '').trim() || null, subject: String(values.get('subject') ?? '').trim(), message: String(values.get('message') ?? ''), consent: values.get('consent') === 'on' })
      form.reset(); setStatus('Thanks for getting in touch. Your message has been sent.')
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Your message could not be sent. Please try again.') }
    finally { setSending(false) }
  }
  return <form onSubmit={submit} className="mt-8 space-y-5 rounded border border-line bg-sand/40 p-5 sm:p-7">
    <h2 className="text-xl font-bold">Send us a message</h2>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-semibold">Your name<input name="name" required maxLength={120} className="mt-1 w-full border border-line bg-white px-3 py-2.5 font-normal" /></label>
      <label className="block text-sm font-semibold">Email address<input name="email" type="email" required maxLength={254} className="mt-1 w-full border border-line bg-white px-3 py-2.5 font-normal" /></label>
      <label className="block text-sm font-semibold">Order number (optional)<input name="orderNumber" maxLength={80} className="mt-1 w-full border border-line bg-white px-3 py-2.5 font-normal" /></label>
      <label className="block text-sm font-semibold">Subject<input name="subject" required maxLength={160} className="mt-1 w-full border border-line bg-white px-3 py-2.5 font-normal" /></label>
    </div>
    <label className="block text-sm font-semibold">Message<textarea name="message" required minLength={20} maxLength={5000} rows={5} className="mt-1 w-full border border-line bg-white px-3 py-2.5 font-normal" /></label>
    <label className="flex items-start gap-2 text-sm text-gray-700"><input name="consent" type="checkbox" required className="mt-1" /><span>I agree that My Pet Food can use my details to respond to this enquiry.</span></label>
    <button className="btn-primary" disabled={sending}>{sending ? 'Sending…' : 'Send message'}</button>
    {status && <p role="status" className="text-sm text-gray-700">{status}</p>}
  </form>
}

export function ContentPageView() {
  const { slug: rawSlug } = useParams()
  const slug = slugs.includes(rawSlug as PageSlug) ? rawSlug as PageSlug : null
  const pageQuery = useQuery({ queryKey: ['content-page', slug], queryFn: () => getContentPage(slug!), enabled: Boolean(slug), retry: false })
  const siteQuery = useQuery({ queryKey: ['site-content'], queryFn: getSiteContent, retry: false })
  if (!slug) return <main className="container-page py-16"><h1 className="section-title">Page not found</h1><Link className="mt-4 inline-block text-brand underline" to="/">Return to home</Link></main>
  const page = pageQuery.data ?? fallbackPages[slug]
  const contact = siteQuery.data?.contact ?? { email: '', phones: [], address: { line1: '', line2: '', townCity: '', county: '', postcode: '', country: '' }, openingHours: '', responseTime: '' }
  const addressLines = [contact.address.line1, contact.address.line2, [contact.address.townCity, contact.address.county].filter(Boolean).join(', '), contact.address.postcode, contact.address.country].filter(Boolean)
  const hasContactDetails = Boolean(contact.email || contact.phones.length || addressLines.length || contact.openingHours || contact.responseTime)
  const groupName = pageGroups.Help.some(([pageSlug]) => pageSlug === slug) ? 'Help' : 'About'
  const relatedPages = pageGroups[groupName]
  const anchors = [...page.sections.map((section, index) => ({ label: section.heading, id: `section-${index + 1}` })), ...(page.faqs ?? []).map((faq, index) => ({ label: faq.question, id: `faq-${index + 1}` }))]
  return <main className="container-page max-w-6xl py-8 sm:py-12">
    <nav aria-label="Breadcrumb" className="mb-5 text-sm text-gray-500"><Link to="/" className="hover:text-brand">Home</Link><span className="mx-2">/</span><span>{groupName}</span><span className="mx-2">/</span><span className="text-ink">{page.title}</span></nav>
    <header className="overflow-hidden rounded-xl bg-sand px-6 py-8 sm:px-10 sm:py-12"><p className="text-xs font-bold uppercase tracking-[.18em] text-brand">{groupName} · My Pet Food</p><h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-ink sm:text-4xl">{page.title}</h1>{page.intro && <p className="mt-4 max-w-3xl whitespace-pre-line text-base leading-7 text-gray-700 sm:text-lg">{page.intro}</p>}</header>
    {pageQuery.isError && <p role="alert" className="mt-5 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">The latest page content could not be loaded. Showing any available saved content.</p>}
    {slug === 'contact' && siteQuery.isError && <p role="alert" className="mt-5 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Contact details could not be loaded right now. Please refresh this page later.</p>}
    <div className="mt-7 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-8">
        {slug === 'contact' && <section aria-label="Contact details"><div className="mb-4"><p className="text-xs font-bold uppercase tracking-wider text-accent">Get in touch</p><h2 className="mt-1 text-2xl font-bold">How can we help?</h2></div>{hasContactDetails ? <div className="grid gap-3 sm:grid-cols-2">{contact.email && <article className="rounded-lg border border-line bg-white p-5"><Mail className="text-brand" size={20}/><h3 className="mt-3 font-bold">Email</h3><a className="mt-1 break-all text-sm text-brand underline" href={`mailto:${contact.email}`}>{contact.email}</a></article>}{contact.phones.map((phone, index) => <article key={`${phone.label}-${index}`} className="rounded-lg border border-line bg-white p-5"><Phone className="text-brand" size={20}/><h3 className="mt-3 font-bold">{phone.label || 'Phone'}</h3><a className="mt-1 inline-block text-sm text-brand underline" href={`tel:${phone.number.replace(/[^+\d]/g, '')}`}>{phone.number}</a></article>)}{addressLines.length > 0 && <article className="rounded-lg border border-line bg-white p-5"><MapPin className="text-brand" size={20}/><h3 className="mt-3 font-bold">Address</h3><address className="mt-1 whitespace-pre-line text-sm not-italic leading-6 text-gray-700">{addressLines.join('\n')}</address></article>}{contact.openingHours && <article className="rounded-lg border border-line bg-white p-5"><Clock3 className="text-brand" size={20}/><h3 className="mt-3 font-bold">Opening hours</h3><p className="mt-1 whitespace-pre-line text-sm leading-6 text-gray-700">{contact.openingHours}</p></article>}{contact.responseTime && <article className="rounded-lg border border-line bg-white p-5"><Clock3 className="text-brand" size={20}/><h3 className="mt-3 font-bold">Response time</h3><p className="mt-1 whitespace-pre-line text-sm leading-6 text-gray-700">{contact.responseTime}</p></article>}</div> : <p className="rounded-lg border border-dashed border-line bg-white p-6 text-sm text-gray-600">Contact details are being added.</p>}</section>}
        {(page.sections.length > 0 || (page.faqs?.length ?? 0) > 0) && <section><div className="mb-4"><p className="text-xs font-bold uppercase tracking-wider text-accent">{slug === 'faqs' ? 'Answers' : slug === 'guides' ? 'Learn and care' : 'More information'}</p><h2 className="mt-1 text-2xl font-bold">{slug === 'faqs' ? 'Frequently asked questions' : slug === 'guides' ? 'Pet care guides' : page.title}</h2></div><ContentSections page={page} slug={slug}/></section>}
        {slug === 'contact' && <ContactForm />}
        {page.sections.length === 0 && !(page.faqs?.length) && slug !== 'contact' && <ContentSections page={page} slug={slug}/>}
      </div>
      <aside className="space-y-4 lg:sticky lg:top-6">{anchors.length > 0 && <nav aria-label="On this page" className="rounded-lg border border-line bg-white p-5"><h2 className="font-bold">On this page</h2><ul className="mt-3 space-y-2">{anchors.map(anchor => <li key={anchor.id}><a href={`#${anchor.id}`} className="text-sm leading-5 text-gray-600 hover:text-brand">{anchor.label}</a></li>)}</ul></nav>}
        <nav aria-label={`${groupName} pages`} className="rounded-lg border border-line bg-white p-5"><h2 className="font-bold">Explore {groupName}</h2><ul className="mt-3 space-y-1">{relatedPages.map(([pageSlug, label]) => <li key={pageSlug}><Link to={`/${pageSlug}`} aria-current={slug === pageSlug ? 'page' : undefined} className={`block rounded px-3 py-2 text-sm ${slug === pageSlug ? 'bg-sand font-bold text-brand' : 'text-gray-600 hover:bg-sand hover:text-brand'}`}>{label}</Link></li>)}</ul></nav>
        {slug !== 'contact' && <div className="rounded-lg bg-brand p-5 text-white"><h2 className="font-bold">Need a hand?</h2><p className="mt-2 text-sm leading-6 text-white/80">Our team can help with questions about your order or your pet.</p><Link to="/contact" className="mt-4 inline-flex rounded bg-white px-4 py-2 text-sm font-bold text-brand hover:bg-sand">Contact us</Link></div>}
      </aside>
    </div>
  </main>
}
