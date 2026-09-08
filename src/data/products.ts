import type { Product } from '../types/product'

const image = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`

export const products: Product[] = [
  { id:'d1',slug:'premium-chicken-dog-food',name:'Premium Chicken Dog Food',pet:'Dogs',category:'Food',price:24.99,image:image('photo-1587300003388-59208cc962cb'),description:'A balanced, tasty complete food made with quality chicken for happy, active dogs.',rating:4.8,reviewCount:126,badge:'Popular',featured:true },
  { id:'c1',slug:'salmon-cat-treats',name:'Salmon Cat Treats',pet:'Cats',category:'Treats',price:4.99,image:image('photo-1573865526739-10659fec78a5'),description:'Crisp little salmon treats that make every good moment more rewarding.',rating:4.9,reviewCount:88,badge:'Popular',featured:true },
  { id:'b1',slug:'natural-wood-bird-perch',name:'Natural Wood Bird Perch',pet:'Birds',category:'Accessories',price:8.99,image:image('photo-1452570053594-1b985d6ea890'),description:'A natural-textured perch designed to keep small birds comfortable and active.',rating:4.7,reviewCount:39,featured:true },
  { id:'d2',slug:'squeaky-dog-ball',name:'Squeaky Dog Ball',pet:'Dogs',category:'Toys',price:6.49,image:image('photo-1558788353-f76d92427f16'),description:'A durable, bouncy ball for energetic games in the garden or park.',rating:4.6,reviewCount:51,badge:'New',featured:true },
  { id:'c2',slug:'cat-feather-wand',name:'Cat Feather Wand',pet:'Cats',category:'Toys',price:5.99,image:image('photo-1519052537078-e6302a4968d4'),description:'Bring out their playful side with a soft feather teaser wand.',rating:4.8,reviewCount:104,featured:true },
  { id:'b2',slug:'daily-bird-vitamin-drops',name:'Daily Bird Vitamin Drops',pet:'Birds',category:'Health',price:9.99,image:image('photo-1444464666168-49d633b86797'),description:'An easy daily nutritional top-up to support bright, healthy birds.',rating:4.8,reviewCount:31,badge:'Popular',featured:true },
  { id:'d3',slug:'sensitive-skin-dog-shampoo',name:'Sensitive Skin Dog Shampoo',pet:'Dogs',category:'Grooming',price:11.99,image:image('photo-1560743641-3914f2c45636'),description:'A mild, fresh shampoo for dogs with sensitive skin and coats.',rating:4.7,reviewCount:64,featured:true },
  { id:'c3',slug:'grain-free-cat-food',name:'Grain-Free Cat Food',pet:'Cats',category:'Food',price:18.99,image:image('photo-1589924691995-400dc9ecc119'),description:'Wholesome grain-free recipe with tasty turkey and garden vegetables.',rating:4.9,reviewCount:142,badge:'Offer',featured:true },
  { id:'d4',slug:'reflective-dog-lead',name:'Reflective Dog Lead',pet:'Dogs',category:'Walking',price:14.99,image:image('photo-1558788353-f76d92427f16'),description:'A comfortable everyday lead with reflective stitching for evening walks.',rating:4.6,reviewCount:48 },
  { id:'c4',slug:'calming-cat-beds',name:'Calming Cat Bed',pet:'Cats',category:'Accessories',price:29.99,image:image('photo-1543852786-1cf6624b9987'),description:'A deep, soft nest bed for the cosiest afternoon nap.',rating:4.8,reviewCount:79,badge:'New' },
  { id:'b3',slug:'seed-and-fruit-bird-mix',name:'Seed & Fruit Bird Mix',pet:'Birds',category:'Food',price:7.49,image:image('photo-1444464666168-49d633b86797'),description:'A colourful everyday mix with seeds, grains and fruit pieces.',rating:4.7,reviewCount:58 },
  { id:'d5',slug:'dental-dog-chews',name:'Dental Dog Chews',pet:'Dogs',category:'Treats',price:7.99,image:image('photo-1558788353-f76d92427f16'),description:'Everyday chews made to support clean teeth and fresh breath.',rating:4.5,reviewCount:91,badge:'Offer' },
  { id:'c5',slug:'gentle-cat-grooming-brush',name:'Gentle Cat Grooming Brush',pet:'Cats',category:'Grooming',price:9.49,image:image('photo-1519052537078-e6302a4968d4'),description:'A gentle brush for smooth coats and peaceful grooming sessions.',rating:4.6,reviewCount:34 },
  { id:'b4',slug:'bird-swing-and-bell',name:'Bird Swing & Bell',pet:'Birds',category:'Toys',price:6.99,image:image('photo-1452570053594-1b985d6ea890'),description:'A cheerful cage toy for climbing, swinging and play.',rating:4.7,reviewCount:27 }
]

export const pets = ['Cats', 'Dogs', 'Birds'] as const
