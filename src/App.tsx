import { Link, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { StaffRoute } from './components/auth/StaffRoute'
import { CartDrawer } from './components/shop/CartDrawer'
import { Footer } from './components/layout/Footer'
import { Header } from './components/layout/Header'
import { BasketPage, CheckoutPage, CheckoutReturnPage } from './pages/BasketPages'
import { HomePage } from './pages/HomePage'
import { AccountPage, LoginPage, SignupPage } from './pages/AuthPages'
import { CategoryPage, ProductPage, ShopPage } from './pages/ShopPages'
import { AdminProductFormPage, AdminProductsPage } from './pages/AdminProductPages'
import { ContentPageView } from './pages/ContentPages'
import { AdminContentPage } from './pages/AdminContentPage'
import { pageSlugs } from './lib/contentPages'

export function App() {
  return <div className="flex min-h-screen flex-col">
    <Header />
    <div className="flex-1"><Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/shop" element={<ShopPage />} />
      <Route path="/category/:category" element={<CategoryPage />} />
      <Route path="/product/:slug" element={<ProductPage />} />
      <Route path="/basket" element={<BasketPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/checkout/success" element={<CheckoutReturnPage />} />
      <Route path="/checkout/cancel" element={<CheckoutReturnPage cancelled />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
      <Route path="/admin/products" element={<StaffRoute><AdminProductsPage /></StaffRoute>} />
      <Route path="/admin/products/new" element={<StaffRoute><AdminProductFormPage /></StaffRoute>} />
      <Route path="/admin/products/:id" element={<StaffRoute><AdminProductFormPage /></StaffRoute>} />
      <Route path="/admin/content" element={<StaffRoute><AdminContentPage /></StaffRoute>} />
      {pageSlugs.map(slug => <Route key={slug} path={`/${slug}`} element={<ContentPageView key={slug} slug={slug} />} />)}
      <Route path="*" element={<main className="container-page py-20"><h1 className="section-title">Page not found</h1><Link to="/" className="mt-4 inline-block text-brand underline">Return to home</Link></main>} />
    </Routes></div>
    <Footer />
    <CartDrawer />
  </div>
}
