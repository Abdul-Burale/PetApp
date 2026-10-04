import { useQuery } from '@tanstack/react-query'
import { getApiProduct } from '../lib/api'
import { apiProductToProduct, catalogueStaleTime, productQueryKey } from '../context/CatalogContext'
import type { Product } from '../types/product'

export function useApiProduct(slug: string) {
  const query = useQuery({
    queryKey: productQueryKey(slug),
    queryFn: async (): Promise<Product> => {
      const detail = await getApiProduct(slug)
      const product = apiProductToProduct(detail.product)
      return product.image || !detail.images[0]?.url ? product : { ...product, image: detail.images[0].url }
    },
    staleTime: catalogueStaleTime,
    enabled: Boolean(slug),
  })

  return { product: query.data ?? null, loading: query.isPending, error: query.error instanceof Error ? query.error.message : null }
}
