import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${checked ? 'bg-[var(--violet)]' : 'bg-[var(--surface-3)]'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-[var(--ink-text)] transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

export default function AccessRights() {
  const { staff } = useAuth()
  const [roles, setRoles] = useState([])
  const [employeeCounts, setEmployeeCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [posAccess, setPosAccess] = useState(true)
  const [backOfficeAccess, setBackOfficeAccess] = useState(false)

  async function load() {
    setLoading(true)
    const [{ data: roleList }, { data: staffList }] = await Promise.all([
      supabase.from('roles').select('id, name, pos_access, back_office_access').eq('tenant_id', staff.tenant_id).order('name'),
      supabase.from('staff').select('role_id').eq('tenant_id', staff.tenant_id),
    ])
    setRoles(roleList || [])
    const counts = {}
    for (const s of staffList || []) {
      if (s.role_id) counts[s.role_id] = (counts[s.role_id] || 0) + 1
    }
    setEmployeeCounts(counts)
    setLoading(false)
  }

  useEffect(() => { load() }, [staff.tenant_id])

  async function createRole(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await supabase.from('roles').insert({
      tenant_id: staff.tenant_id,
      name,
      pos_access: posAccess,
      back_office_access: backOfficeAccess,
    })
    setSaving(false)
    setName(''); setPosAccess(true); setBackOfficeAccess(false)
    setShowForm(false)
    load()
  }

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ Add role'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={createRole} className="bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--radius)] p-5 mb-6">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Shift Supervisor" required className="mb-4" />

          <div className="flex items-center justify-between p-3.5 bg-[var(--surface-3)] rounded-[var(--radius)] mb-2">
            <div>
              <div className="text-[13.5px] font-medium">POS</div>
              <div className="text-[12px] text-[var(--ink-text-muted)]">Can log into the till and take sales.</div>
            </div>
            <Toggle checked={posAccess} onChange={() => setPosAccess((v) => !v)} />
          </div>
          <div className="flex items-center justify-between p-3.5 bg-[var(--surface-3)] rounded-[var(--radius)] mb-4">
            <div>
              <div className="text-[13.5px] font-medium">Back office</div>
              <div className="text-[12px] text-[var(--ink-text-muted)]">Can log into Inventory, Finance, Reports, Settings.</div>
            </div>
            <Toggle checked={backOfficeAccess} onChange={() => setBackOfficeAccess((v) => !v)} />
          </div>

          <Button type="submit" variant="primary" disabled={saving} className="w-full">
            {saving ? 'Saving\u2026' : 'Save role'}
          </Button>
        </form>
      )}

      <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden">
        <div className="grid grid-cols-3 px-4.5 py-2.5 text-[11px] uppercase tracking-wide text-[var(--ink-text-muted)] border-b border-[var(--line)]">
          <span>Role</span>
          <span>Access</span>
          <span className="text-right">Employees</span>
        </div>
        {roles.map((r, i) => (
          <div key={r.id} className={`grid grid-cols-3 px-4.5 py-3 text-[13px] items-center ${i !== roles.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
            <span className="font-medium">{r.name}</span>
            <span className="text-[var(--ink-text-muted)] text-[12px]">
              {r.pos_access && r.back_office_access ? 'Back office and POS' : r.back_office_access ? 'Back office' : r.pos_access ? 'POS' : 'None'}
            </span>
            <span className="text-right font-[var(--font-mono)]">{employeeCounts[r.id] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
