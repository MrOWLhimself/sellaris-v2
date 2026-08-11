import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export function ProtectedRoute({ children }) {
  const { session, staff, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[13px] text-[var(--ink-text-muted)]">
        Loading\u2026
      </div>
    )
  }

  if (!session || !staff) {
    return <Navigate to="/login" replace />
  }

  return children
}
