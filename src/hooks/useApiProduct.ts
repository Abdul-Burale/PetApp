import { useQuery } from '@tanstack/react-query'
import { getApiProduct } from '../lib/api'
import { apiProductToProduct, catalogueStaleTime, productQueryKey } from '../context/CatalogContext'
import type { ApiProductDetail } from '../lib/api'
import type { Product } from '../types/product'

export interface ProductDetail extends Product { images: ApiProductDetail['images']; weightGrams: number }

export function useApiProduct(slug: string) {
  const query = useQuery({
    queryKey: productQueryKey(slug),
    queryFn: async (): Promise<ProductDetail> => {
      const detail = await getApiProduct(slug)
      const product = apiProductToProduct(detail.product)
      const detailImage = detail.images[0]?.url
      return { ...product, image: detailImage ?? product.image, images: detail.images, weightGrams: detail.weightGrams }
    },
    staleTime: catalogueStaleTime,
    enabled: Boolean(slug),
  })

  return { product: query.data ?? null, loading: query.isPending, error: query.error instanceof Error ? query.error.message : null }
}
