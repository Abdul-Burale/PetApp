import { useEffect, useId, useState, type FormEvent } from 'react'
import { Search } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { searchRoute } from '../../lib/catalog'

export function SearchForm({ initialQuery = '', onSearch, onSubmitted, className = '', label = 'Search products' }: { initialQuery?: string; onSearch?: (query: string) => void; onSubmitted?: () => void; className?: string; label?: string }) {
  const id = useId(), location = useLocation(), navigate = useNavigate()
  const committed = onSearch ? initialQuery : new URLSearchParams(location.search).get('q') ?? ''
  const [query, setQuery] = useState(committed)
  useEffect(() => { setQuery(committed) }, [committed, location.pathname])
  function submit(event: FormEvent) {
    event.preventDefault()
    const value = query.trim().replace(/\s+/g, ' ')
    if (onSearch) onSearch(value)
    else navigate(searchRoute(value))
    onSubmitted?.()
  }
  return <form role="search" aria-label={label} onSubmit={submit} className={`flex min-w-0 items-center rounded-lg border border-line bg-sand/40 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand ${className}`}>
    <label htmlFor={id} className="sr-only">{label}</label>
    <Search aria-hidden="true" size={18} className="ml-3 shrink-0 text-gray-500" />
    <input id={id} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search products or pets" className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none" />
    <button type="submit" className="m-1 rounded bg-brand px-3 py-2 text-sm font-bold text-white hover:bg-brand/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Search</button>
  </form>
}
