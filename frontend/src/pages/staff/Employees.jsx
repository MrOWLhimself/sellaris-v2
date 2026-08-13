import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { logAudit } from '@/lib/audit'

export default function Employees() {
  const { staff } = useAuth()
  const [employees, setEmployees] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [roles, setRoles] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState('')
  const [branchId, setBranchId] = useState('')

  async function load() {
    setLoading(true)
    const [{ data: emp }, { data: invites }, { data: roleList }, { data: branchList }] = await Promise.all([
      supabase.from('staff').select('id, name, role, created_at, roles(name), branches(name)').eq('tenant_id', staff.tenant_id).order('created_at'),
      supabase.from('staff_invitations').select('id, email, created_at, roles(name)').eq('tenant_id', staff.tenant_id).eq('accepted', false).order('created_at', { ascending: false }),
      supabase.from('roles').select('id, name').eq('tenant_id', staff.tenant_id).order('name'),
      supabase.from('branches').select('id, name').eq('tenant_id', staff.tenant_id).eq('is_warehouse', false),
    ])
    setEmployees(emp || [])
    setPendingInvites(invites || [])
    setRoles(roleList || [])
    setBranches(branchList || [])
    if (roleList?.length && !roleId) setRoleId(roleList.find((r) => r.name === 'Cashier')?.id || roleList[0].id)
    if (branchList?.length && !branchId) setBranchId(branchList[0].id)
    setLoading(false)
  }

  useEffect(() => { load() }, [staff.tenant_id])

  async function sendInvite(e) {
    e.preventDefault()
    setError(null)
    if (!email.trim()) return
    setSaving(true)
    const { error } = await supabase.from('staff_invitations').insert({
      tenant_id: staff.tenant_id,
      email: email.trim().toLowerCase(),
      role_id: roleId || null,
      branch_id: branchId || null,
      invited_by: staff.id,
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    logAudit('staff_invited', { email: email.trim().toLowerCase(), role_id: roleId, branch_id: branchId }, staff.tenant_id)
    setEmail('')
    setShowForm(false)
    load()
  }

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-[13px] text-[var(--ink-text-muted)]">
          Invite by email \u2014 they'll be added automatically once they sign up with that address.
        </p>
        <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ Invite employee'}
        </Button>
      </div>

      {error && <p className="text-[13px] text-[var(--danger)] mb-4">{error}</p>}

      {showForm && (
        <form onSubmit={sendInvite} className="bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--radius)] p-5 mb-6">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </div>
            <div>
              <Label>Branch</Label>
              <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </div>
          </div>
          <Button type="submit" variant="primary" disabled={saving} className="w-full">
            {saving ? 'Sending\u2026' : 'Send invite'}
          </Button>
        </form>
      )}

      <h2 className="text-[12px] uppercase tracking-wide text-[var(--ink-text-muted)] mb-3">Employees</h2>
      <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden mb-6">
        {employees.map((e, i) => (
          <div key={e.id} className={`flex justify-between items-center p-4 ${i !== employees.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
            <div>
              <div className="text-[13px] font-medium">{e.name}</div>
              <div className="text-[12px] text-[var(--ink-text-muted)]">{e.branches?.name || 'No branch'}</div>
            </div>
            <Badge tone="info">{e.roles?.name || e.role}</Badge>
          </div>
        ))}
      </div>

      {pendingInvites.length > 0 && (
        <>
          <h2 className="text-[12px] uppercase tracking-wide text-[var(--ink-text-muted)] mb-3">Pending invites</h2>
          <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden">
            {pendingInvites.map((inv, i) => (
              <div key={inv.id} className={`flex justify-between items-center p-4 ${i !== pendingInvites.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
                <span className="text-[13px]">{inv.email}</span>
                <Badge tone="warning">{inv.roles?.name || 'Pending'}</Badge>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
