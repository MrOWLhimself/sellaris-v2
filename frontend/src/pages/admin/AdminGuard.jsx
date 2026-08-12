import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export function AdminGuard({ children }) {
  const { session, loading: authLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(null)

  useEffect(() => {
    if (!session) return
    supabase.rpc('is_platform_admin').then(({ data }) => setIsAdmin(!!data))
  }, [session])

  if (authLoading || (session && isAdmin === null)) {
    return <div className="min-h-screen flex items-center justify-center text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</div>
  }

  if (!session) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />

  return children
}
