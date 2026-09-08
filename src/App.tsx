import { Route, Routes } from 'react-router-dom'
import { CartDrawer } from './components/shop/CartDrawer'
import { Footer } from './components/layout/Footer'
import { Header } from './components/layout/Header'
import { BasketPage, CheckoutPage } from './pages/BasketPages'
import { HomePage } from './pages/HomePage'
import { CategoryPage, ProductPage, ShopPage } from './pages/ShopPages'
export function App(){return <div className="flex min-h-screen flex-col"><Header/><div className="flex-1"><Routes><Route path="/" element={<HomePage/>}/><Route path="/shop" element={<ShopPage/>}/><Route path="/category/:category" element={<CategoryPage/>}/><Route path="/product/:slug" element={<ProductPage/>}/><Route path="/basket" element={<BasketPage/>}/><Route path="/checkout" element={<CheckoutPage/>}/><Route path="*" element={<HomePage/>}/></Routes></div><Footer/><CartDrawer/></div>}
