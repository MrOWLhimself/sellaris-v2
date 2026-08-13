import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

// A staff member's `branch_id` on the staff table is their DEFAULT/home
// branch. Back-office roles (owner, administrator, manager) can switch
// which branch they're actively viewing/operating in for the current
// session — a cashier stays pinned to their assigned till. This is a
// session-level UI concern, not a DB write: switching branches doesn't
// change who you are, just what you're currently looking at.
const BranchContext = createContext(null)

export function BranchProvider({ children }) {
  const { staff } = useAuth()
  const [activeBranchId, setActiveBranchId] = useState(null)
  const [availableBranches, setAvailableBranches] = useState([])
  const [canSwitch, setCanSwitch] = useState(false)

  useEffect(() => {
    if (!staff) {
      setActiveBranchId(null)
      setAvailableBranches([])
      return
    }

    setActiveBranchId(staff.branch_id)

    async function loadBranches() {
      const [{ data: branches }, { data: roleRow }] = await Promise.all([
        supabase
          .from('branches')
          .select('id, name, is_warehouse')
          .eq('tenant_id', staff.tenant_id)
          .eq('is_warehouse', false)
          .order('name'),
        staff.role_id
          ? supabase.from('roles').select('back_office_access').eq('id', staff.role_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      setAvailableBranches(branches || [])
      // Owners bootstrap without a role_id in some legacy paths — treat
      // missing role data as back-office-capable rather than locking
      // them out of their own business.
      setCanSwitch((roleRow?.back_office_access ?? true) && (branches?.length || 0) > 1)
    }
    loadBranches()
  }, [staff])

  return (
    <BranchContext.Provider value={{ activeBranchId, setActiveBranchId, availableBranches, canSwitch }}>
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  const ctx = useContext(BranchContext)
  if (!ctx) throw new Error('useBranch must be used inside BranchProvider')
  return ctx
}
