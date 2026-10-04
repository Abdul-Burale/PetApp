import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <main className="container-page py-20 text-center"><p className="text-gray-600">Checking your session…</p></main>
  }

  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}
