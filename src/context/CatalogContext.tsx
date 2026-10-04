import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useCart } from './CartContext'
import { listApiProducts, type ApiProduct } from '../lib/api'
import type { Product, ProductCategory, Pet } from '../types/product'

interface CatalogContextValue {
  products: Product[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const CatalogContext = createContext<CatalogContextValue | undefined>(undefined)
export const productsQueryKey = ['products'] as const
export const productQueryKey = (slug: string) => ['product', slug] as const
export const catalogueStaleTime = 10 * 60 * 1000
const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
const pets: Pet[] = ['Cats', 'Dogs', 'Birds']
const categories: ProductCategory[] = ['Food', 'Treats', 'Toys', 'Health', 'Grooming', 'Accessories', 'Walking']

export function apiProductToProduct(product: ApiProduct): Product {
  const pet = titleCase(product.pet) as Pet
  const category = titleCase(product.category) as ProductCategory
  return {
    id: product.id,
    sku: product.sku,
    slug: product.slug,
    name: product.name,
    pet: pets.includes(pet) ? pet : 'Dogs',
    category: categories.includes(category) ? category : 'Accessories',
    price: product.price.amount / 100,
    image: product.image?.url ?? '',
    description: product.description,
    rating: product.ratingAverage,
    reviewCount: product.reviewCount,
    badge: product.badge ? titleCase(product.badge) as Product['badge'] : undefined,
    featured: product.featured,
    available: product.available,
  }
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { reconcile } = useCart()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: productsQueryKey,
    queryFn: async () => (await listApiProducts()).map(apiProductToProduct),
    staleTime: catalogueStaleTime,
  })
  const products = query.data ?? []
  const loading = query.isPending
  const error = query.error instanceof Error ? query.error.message : query.error ? 'The catalogue could not be loaded.' : null

  useEffect(() => {
    if (query.data) reconcile(query.data)
  }, [query.data, reconcile])

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: productsQueryKey })
  }, [queryClient])

  const value = useMemo(() => ({ products, loading, error, refresh }), [error, loading, products, refresh])
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  const context = useContext(CatalogContext)
  if (!context) throw new Error('useCatalog must be used inside CatalogProvider')
  return context
}
