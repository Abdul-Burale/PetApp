import { Heart, Mail, Phone } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getSiteContent } from '../../lib/api'

const fallback = {
  contact: { email: '', phone: '', openingHours: '' },
  footer: { tagline: '', groups: [
    { title: 'Shop', links: [{ label: 'Cats', route: '/category/cats', active: true }, { label: 'Dogs', route: '/category/dogs', active: true }, { label: 'Birds', route: '/category/birds', active: true }, { label: 'Offers', route: '/shop?offer=true', active: true }] },
    { title: 'Help', links: [{ label: 'Contact Us', route: '/contact', active: true }, { label: 'Delivery', route: '/delivery', active: true }, { label: 'Returns', route: '/returns', active: true }, { label: 'FAQs', route: '/faqs', active: true }] },
    { title: 'About', links: [{ label: 'Our Story', route: '/our-story', active: true }, { label: 'Pet Care Guides', route: '/guides', active: true }, { label: 'Privacy Policy', route: '/privacy', active: true }, { label: 'Terms', route: '/terms', active: true }] },
  ] },
}

export function Footer(){
  const { data } = useQuery({ queryKey: ['site-content'], queryFn: getSiteContent, retry: false })
  const content = data ?? fallback
  const groups = content.footer.groups.map(group => ({ ...group, links: group.links.filter(link => link.active) })).filter(group => group.links.length > 0)
  const { email, phone, openingHours } = content.contact
  return <footer className="mt-16 bg-ink text-white"><div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">{groups.map(group=><div key={group.title}><h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">{group.title}</h2><ul className="space-y-2">{group.links.map(link=><li key={`${link.label}-${link.route}`}><Link to={link.route} className="text-sm text-white/70 hover:text-white">{link.label}</Link></li>)}</ul></div>)}<div><h2 className="mb-4 text-sm font-bold uppercase tracking-wider">Contact</h2><div className="space-y-3 text-sm text-white/70">{email && <a className="flex gap-2 hover:text-white" href={`mailto:${email}`}><Mail size={16}/>{email}</a>}{phone && <a className="flex gap-2 hover:text-white" href={`tel:${phone.replace(/[^+\d]/g, '')}`}><Phone size={16}/>{phone}</a>}{openingHours && <p>{openingHours}</p>}</div>{content.footer.tagline && <div className="mt-5 flex items-center gap-2 text-sm text-white/80"><Heart size={18} className="text-accent"/> {content.footer.tagline}</div>}</div></div><div className="border-t border-white/15"><div className="container-page flex flex-col gap-4 py-5 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between"><p>© 2026 My Pet Food. All rights reserved.</p><div className="flex gap-2"><span className="border border-white/30 px-2 py-1 font-bold text-white">VISA</span><span className="border border-white/30 px-2 py-1 font-bold text-white">Mastercard</span><span className="border border-white/30 px-2 py-1 font-bold text-white">PayPal</span></div></div></div></footer>
}
