export type Pet = 'Cats' | 'Dogs' | 'Birds'
export type ProductCategory = 'Food' | 'Treats' | 'Toys' | 'Health' | 'Grooming' | 'Accessories' | 'Walking'

export interface Product {
  id: string; sku: string; slug: string; name: string; pet: Pet; category: ProductCategory
  price: number; image: string; description: string; rating: number | null; reviewCount: number
  available: boolean
  badge?: 'Popular' | 'New' | 'Offer'; featured?: boolean
}
