import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useCart } from './CartContext'
import { listApiProducts } from '../lib/api'
import { apiProductToProduct } from '../lib/product'
import type { Product } from '../types/product'
export { apiProductToProduct } from '../lib/product'

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

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { reconcile } = useCart()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: productsQueryKey,
    queryFn: async () => (await listApiProducts()).map(apiProductToProduct),
    staleTime: catalogueStaleTime,
    retry: 1,
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
