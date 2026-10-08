import { useQuery } from '@tanstack/react-query'
import { getApiProduct } from '../lib/api'
import { apiProductToProduct, catalogueStaleTime, productQueryKey } from '../context/CatalogContext'
import type { ApiProductDetail } from '../lib/api'
import type { Product } from '../types/product'

export interface ProductDetail extends Product {
  images: ApiProductDetail['images']
  weightGrams: number
  lengthMm: number | null
  widthMm: number | null
  heightMm: number | null
  sizeLabel: string | null
  sizeOptions: NonNullable<ApiProductDetail['sizeOptions']>
}

export function useApiProduct(slug: string) {
  const query = useQuery({
    queryKey: productQueryKey(slug),
    queryFn: async (): Promise<ProductDetail> => {
      const detail = await getApiProduct(slug)
      const product = apiProductToProduct(detail.product)
      const detailImage = detail.images[0]?.url
      return { ...product, image: detailImage ?? product.image, images: detail.images, weightGrams: detail.weightGrams,
        lengthMm: detail.lengthMm, widthMm: detail.widthMm, heightMm: detail.heightMm,
        sizeLabel: detail.sizeLabel?.trim() || null, sizeOptions: detail.sizeOptions ?? [] }
    },
    staleTime: catalogueStaleTime,
    enabled: Boolean(slug),
  })

  return { product: query.data ?? null, loading: query.isPending, error: query.error instanceof Error ? query.error.message : null }
}
