import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { StaffRoute } from './components/auth/StaffRoute'
import { CartDrawer } from './components/shop/CartDrawer'
import { Footer } from './components/layout/Footer'
import { Header } from './components/layout/Header'
import { BasketPage, CheckoutPage, CheckoutReturnPage } from './pages/BasketPages'
import { HomePage } from './pages/HomePage'
import { LoginPage, SignupPage } from './pages/AuthPages'
import { AccountPage } from './pages/AccountHubPage'
import { CategoryPage, ProductPage, ShopPage } from './pages/ShopPages'
import { AdminProductFormPage, AdminProductsPage } from './pages/AdminProductPages'
import { ContentPageView } from './pages/ContentPages'
import { AdminContentPage } from './pages/AdminContentPage'
import { AdminSupportPage } from './pages/AdminSupportPage'
import { AdminOrdersPage } from './pages/AdminOrdersPage'
import { pageSlugs } from './lib/contentPages'
import { PortalApp } from '../fulfilments-portal/src/PortalApp'
import '../fulfilments-portal/src/portal.css'
import { useAuth } from './context/AuthContext'

function FulfilmentsRoute() {
  const { session, loading, backendAccount, backendLoading, backendError } = useAuth()
  const location = useLocation()
  if (loading || (session && (backendLoading || (!backendAccount && !backendError)))) return <main className="container-page py-20 text-center"><p className="text-gray-600">Checking staff access…</p></main>
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (backendError) return <main className="container-page py-20"><div role="alert" className="mx-auto max-w-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800"><h1 className="text-xl font-bold">Staff access could not be checked</h1><p className="mt-2">{backendError}</p></div></main>
  if (backendAccount?.role?.toLowerCase() !== 'staff' || !backendAccount.permissions?.includes('fulfilments:access')) return <main className="container-page py-20"><div className="mx-auto max-w-lg border border-red-200 bg-red-50 p-6 text-center"><h1 className="text-xl font-bold text-red-900">Access denied</h1><p className="mt-2 text-sm text-red-800">Your account does not have permission to use the fulfilments portal.</p></div></main>
  return <PortalApp />
}

export function App() {
  const location = useLocation()
  const inFulfilments = location.pathname === '/admin/fulfilments' || location.pathname.startsWith('/admin/fulfilments/')
  if (inFulfilments) return <Routes><Route path="/admin/fulfilments/*" element={<FulfilmentsRoute />} /></Routes>
  return <div className="flex min-h-screen flex-col">
    <Header />
    <div className="flex-1"><Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/shop" element={<ShopPage />} />
      <Route path="/category/:category" element={<CategoryPage />} />
      <Route path="/product/:slug" element={<ProductPage />} />
      <Route path="/basket" element={<BasketPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/checkout/success/:orderNumber" element={<CheckoutReturnPage />} />
      <Route path="/checkout/cancel" element={<CheckoutReturnPage cancelled />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
      <Route path="/admin/products" element={<StaffRoute><AdminProductsPage /></StaffRoute>} />
      <Route path="/admin/products/new" element={<StaffRoute><AdminProductFormPage /></StaffRoute>} />
      <Route path="/admin/products/:id" element={<StaffRoute><AdminProductFormPage /></StaffRoute>} />
      <Route path="/admin/content" element={<StaffRoute><AdminContentPage /></StaffRoute>} />
      <Route path="/admin/support" element={<StaffRoute><AdminSupportPage /></StaffRoute>} />
      <Route path="/admin/orders" element={<StaffRoute><AdminOrdersPage /></StaffRoute>} />
      <Route path="/admin/fulfilments/*" element={<FulfilmentsRoute />} />
      {pageSlugs.map(slug => <Route key={slug} path={`/${slug}`} element={<ContentPageView key={slug} slug={slug} />} />)}
      <Route path="*" element={<main className="container-page py-20"><h1 className="section-title">Page not found</h1><Link to="/" className="mt-4 inline-block text-brand underline">Return to home</Link></main>} />
    </Routes></div>
    <Footer />
    <CartDrawer />
  </div>
}
