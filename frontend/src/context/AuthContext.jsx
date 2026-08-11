import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [staff, setStaff] = useState(null) // { id, tenant_id, branch_id, name, role }
  const [loading, setLoading] = useState(true)

  async function loadStaff(userId) {
    if (!userId) {
      setStaff(null)
      return
    }
    const { data } = await supabase
      .from('staff')
      .select('id, tenant_id, branch_id, name, role')
      .eq('user_id', userId)
      .maybeSingle()
    setStaff(data || null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      loadStaff(session?.user?.id).finally(() => setLoading(false))
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      loadStaff(session?.user?.id)
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

  return (
    <AuthContext.Provider
      value={{ session, staff, loading, signIn, signUp, signOut, refreshStaff }}
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
