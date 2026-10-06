import type { ApiProduct } from './api'
import type { Product, ProductCategory, Pet } from '../types/product'

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
const pets: Pet[] = ['Cats', 'Dogs', 'Birds']
const categories: ProductCategory[] = ['Food', 'Treats', 'Toys', 'Health', 'Grooming', 'Accessories', 'Walking']

export function apiProductToProduct(product: ApiProduct): Product {
  const pet = titleCase(product.pet) as Pet
  const category = titleCase(product.category) as ProductCategory
  return {
    id: product.id, sku: product.sku, slug: product.slug, name: product.name,
    pet: pets.includes(pet) ? pet : 'Dogs', category: categories.includes(category) ? category : 'Accessories',
    price: product.price.amount / 100, image: product.image?.url ?? '', description: product.description,
    rating: product.ratingAverage, reviewCount: product.reviewCount,
    badge: product.badge ? titleCase(product.badge) as Product['badge'] : undefined,
    featured: product.featured, available: product.available,
  }
}
