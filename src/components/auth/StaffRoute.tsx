import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function StaffRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, backendAccount, backendLoading, backendError } = useAuth()
  const location = useLocation()

  if (loading || (session && backendLoading)) return <main className="container-page py-20 text-center"><p className="text-gray-600">Checking staff access…</p></main>
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (backendError) return <main className="container-page py-20"><div className="mx-auto max-w-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800"><h1 className="text-xl font-bold">Staff access could not be checked</h1><p className="mt-2">{backendError}</p></div></main>
  if (backendAccount?.role?.toLowerCase() !== 'staff') return <Navigate to="/account" replace />
  return children
}
