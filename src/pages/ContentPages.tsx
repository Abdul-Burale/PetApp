import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
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

function ContentSection({ page }: { page: ContentPage }) {
  return <>
    {page.sections.map((section, index) => <section key={`${section.heading}-${index}`} className="border-b border-line py-7 last:border-0">
      <h2 className="text-xl font-bold">{section.heading}</h2>
      <p className="mt-3 whitespace-pre-line leading-7 text-gray-700">{section.body}</p>
      {section.bullets?.length > 0 && <ul className="mt-3 list-disc space-y-2 pl-6 leading-7 text-gray-700">{section.bullets.map((bullet, itemIndex) => <li key={itemIndex}>{bullet}</li>)}</ul>}
    </section>)}
    {page.faqs?.map((faq, index) => <details key={`${faq.question}-${index}`} className="border-b border-line py-4">
      <summary className="cursor-pointer font-bold">{faq.question}</summary><p className="mt-3 whitespace-pre-line leading-7 text-gray-700">{faq.answer}</p>
    </details>)}
  </>
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
  return <main className="container-page max-w-4xl py-12 sm:py-16">
    <div className="mb-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-accent">My Pet Food</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{page.title}</h1><p className="mt-4 max-w-3xl whitespace-pre-line text-lg leading-8 text-gray-700">{page.intro}</p></div>
    {pageQuery.isError && <p className="mb-5 text-sm text-gray-500">Showing the available page information; the latest content could not be loaded.</p>}
    {slug === 'contact' && siteQuery.isError && <p role="alert" className="mb-5 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Contact details could not be loaded right now. Please refresh this page later.</p>}
    {slug === 'contact' && <>{hasContactDetails && <div className="grid gap-4 rounded border border-line p-5 sm:grid-cols-2 sm:p-7">
      {contact.email && <div><h2 className="font-bold">Email</h2><a className="mt-1 inline-block text-brand underline" href={`mailto:${contact.email}`}>{contact.email}</a></div>}
      {contact.phones.map((phone, index) => <div key={`${phone.label}-${index}`}><h2 className="font-bold">{phone.label || 'Phone'}</h2><a className="mt-1 inline-block text-brand underline" href={`tel:${phone.number.replace(/[^+\d]/g, '')}`}>{phone.number}</a></div>)}
      {addressLines.length > 0 && <div><h2 className="font-bold">Address</h2><address className="mt-1 whitespace-pre-line not-italic leading-6 text-gray-700">{addressLines.join('\n')}</address></div>}
      {contact.openingHours && <div><h2 className="font-bold">Opening hours</h2><p className="mt-1 text-gray-700">{contact.openingHours}</p></div>}
      {contact.responseTime && <div><h2 className="font-bold">Response time</h2><p className="mt-1 text-gray-700">{contact.responseTime}</p></div>}
    </div>}<ContactForm /></>}
    <ContentSection page={page} />
  </main>
}
