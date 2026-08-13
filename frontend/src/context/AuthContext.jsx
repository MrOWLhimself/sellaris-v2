import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { updateCachedToken } from '@/lib/pinAuth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [staff, setStaff] = useState(null) // { id, tenant_id, branch_id, name, role }
  const [loading, setLoading] = useState(true)
  const staffIdRef = useRef(null)

  async function loadStaff(userId) {
    if (!userId) {
      setStaff(null)
      staffIdRef.current = null
      return
    }
    const { data } = await supabase
      .from('staff')
      .select('id, tenant_id, branch_id, name, role, tenants(name, enabled_modules), branches(name)')
      .eq('user_id', userId)
      .maybeSingle()

    if (!data) {
      setStaff(null)
      staffIdRef.current = null
      return
    }

    staffIdRef.current = data.id
    setStaff({
      ...data,
      businessName: data.tenants?.name || null,
      branchName: data.branches?.name || null,
      enabledModules: data.tenants?.enabled_modules || [],
    })
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      loadStaff(session?.user?.id).finally(() => setLoading(false))
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      loadStaff(session?.user?.id)

      // Refresh tokens rotate on use — the cached one for PIN login
      // must be updated every time, or the next unlock attempt fails.
      if (event === 'TOKEN_REFRESHED' && session?.refresh_token && staffIdRef.current) {
        updateCachedToken(staffIdRef.current, session.refresh_token)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signUp(email, password) {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function refreshStaff() {
    await loadStaff(session?.user?.id)
  }

  // Used by the PIN-unlock screen: swaps the active Supabase session
  // to a different staff member's cached one, then updates the cache
  // with whatever NEW refresh token comes back (rotation).
  async function switchToStaffSession(staffId, refreshToken) {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })
    if (error) return { error }
    if (data.session?.refresh_token) {
      await updateCachedToken(staffId, data.session.refresh_token)
    }
    return { error: null }
  }

  return (
    <AuthContext.Provider
      value={{ session, staff, loading, signIn, signUp, signOut, refreshStaff, switchToStaffSession }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
