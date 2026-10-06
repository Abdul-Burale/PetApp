import type { Pet, Product, ProductCategory } from '../types/product'

export const pets: Pet[] = ['Cats', 'Dogs', 'Birds']
export const categories: ProductCategory[] = ['Food', 'Treats', 'Toys', 'Health', 'Grooming', 'Accessories', 'Walking']
export type CatalogSort = 'relevance' | 'featured' | 'low' | 'high'
export const shopNavigation = [
  { label: 'Food & Treats', route: '/shop?category=Food&category=Treats' },
  { label: 'Health & Care', route: '/shop?category=Health&category=Grooming' },
  { label: 'Toys & Accessories', route: '/shop?category=Toys&category=Accessories&category=Walking' },
  { label: 'Offers', route: '/shop?offer=true' },
]
export const petNavigation: Record<Pet, Array<{ label: string; category: ProductCategory }>> = {
  Cats: ['Food', 'Treats', 'Toys', 'Grooming', 'Health'].map(category => ({ label: category, category: category as ProductCategory })),
  Dogs: ['Food', 'Treats', 'Toys', 'Walking', 'Grooming', 'Health'].map(category => ({ label: category, category: category as ProductCategory })),
  Birds: [{ label: 'Food', category: 'Food' }, { label: 'Treats', category: 'Treats' }, { label: 'Toys', category: 'Toys' }, { label: 'Cage Accessories', category: 'Accessories' }, { label: 'Health', category: 'Health' }],
}

const aliases: Record<string, string> = { cats: 'cat', dogs: 'dog', birds: 'bird', treats: 'treat', toys: 'toy', accessories: 'accessory', foods: 'food' }
function words(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter(Boolean).map(word => aliases[word] ?? word)
}
export function searchScore(product: Product, query: string): number | null {
  const queryWords = words(query)
  if (!queryWords.length) return 0
  const name = words(product.name), sku = words(product.sku)
  const metadata = words(`${product.description} ${product.category} ${product.pet}`)
  const all = [...name, ...sku, ...metadata]
  if (!queryWords.every(term => all.some(word => word.startsWith(term)))) return null
  const normalizedQuery = queryWords.join(' ')
  return (name.join(' ') === normalizedQuery || sku.join(' ') === normalizedQuery ? 100 : 0)
    + queryWords.reduce((score, term) => score + (name.some(word => word.startsWith(term)) ? 10 : sku.some(word => word.startsWith(term)) ? 5 : 1), 0)
}

export function catalogFilters(params: URLSearchParams, fixedPet?: Pet) {
  const query = (params.get('q') ?? '').trim()
  const selectedCategories = categories.filter(category => params.getAll('category').some(value => value.toLowerCase() === category.toLowerCase()))
  const requestedSort = params.get('sort')
  return {
    query, categories: selectedCategories,
    pet: fixedPet ?? pets.find(pet => pet.toLowerCase() === params.get('pet')?.toLowerCase()),
    offers: params.get('offer') === 'true', availableOnly: params.get('available') === 'true',
    sort: (['relevance', 'featured', 'low', 'high'].includes(requestedSort ?? '') ? requestedSort : query ? 'relevance' : 'featured') as CatalogSort,
  }
}
export function filterCatalog(products: Product[], filters: ReturnType<typeof catalogFilters>) {
  return products.map(product => ({ product, score: searchScore(product, filters.query) }))
    .filter(({ product, score }) => score !== null && (!filters.pet || product.pet === filters.pet)
      && (!filters.categories.length || filters.categories.includes(product.category))
      && (!filters.offers || product.badge === 'Offer') && (!filters.availableOnly || product.available))
    .sort((a, b) => filters.sort === 'low' ? a.product.price - b.product.price : filters.sort === 'high' ? b.product.price - a.product.price
      : filters.sort === 'relevance' ? (b.score ?? 0) - (a.score ?? 0) : Number(Boolean(b.product.featured)) - Number(Boolean(a.product.featured)))
    .map(({ product }) => product)
}

export function searchRoute(query: string) {
  const value = query.trim().replace(/\s+/g, ' ')
  return value ? `/shop?${new URLSearchParams({ q: value })}` : '/shop'
}
