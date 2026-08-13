import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useBranch } from '@/context/BranchContext'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

const naira = (n) => `\u20a6${Number(n).toLocaleString('en-NG')}`

export default function Shifts() {
  const { staff } = useAuth()
  const { activeBranchId } = useBranch()
  const [myOpenShift, setMyOpenShift] = useState(null)
  const [pendingApprovals, setPendingApprovals] = useState([])
  const [recentShifts, setRecentShifts] = useState([])
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [openingCash, setOpeningCash] = useState('')
  const [saving, setSaving] = useState(false)

  const [movementType, setMovementType] = useState('cash_in')
  const [movementAmount, setMovementAmount] = useState('')
  const [movementReason, setMovementReason] = useState('')
  const [showMovementForm, setShowMovementForm] = useState(false)

  const [actualCash, setActualCash] = useState('')
  const [showCloseForm, setShowCloseForm] = useState(false)

  async function load() {
    setLoading(true)
    const [{ data: mine }, { data: pending }, { data: recent }] = await Promise.all([
      supabase.from('shifts').select('*, staff(name)').eq('staff_id', staff.id).eq('status', 'open').maybeSingle(),
      supabase.from('shifts').select('*, staff(name)').eq('tenant_id', staff.tenant_id).eq('status', 'pending_approval').order('closed_at', { ascending: false }),
      supabase.from('shifts').select('*, staff(name)').eq('tenant_id', staff.tenant_id).eq('status', 'closed').order('closed_at', { ascending: false }).limit(10),
    ])
    setMyOpenShift(mine || null)
    setPendingApprovals(pending || [])
    setRecentShifts(recent || [])

    if (mine) {
      const { data: mv } = await supabase.from('shift_cash_movements').select('*').eq('shift_id', mine.id).order('created_at', { ascending: false })
      setMovements(mv || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [staff.id, staff.tenant_id])

  async function openShift(e) {
    e.preventDefault()
    setError(null)
    if (!Number(openingCash) && openingCash !== '0') { setError('Enter an opening cash amount.'); return }
    setSaving(true)
    const { error } = await supabase.from('shifts').insert({
      tenant_id: staff.tenant_id,
      branch_id: activeBranchId,
      staff_id: staff.id,
      opening_cash: Number(openingCash) || 0,
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    setOpeningCash('')
    load()
  }

  async function addMovement(e) {
    e.preventDefault()
    setError(null)
    if (!Number(movementAmount)) { setError('Enter a valid amount.'); return }
    setSaving(true)
    const { error } = await supabase.from('shift_cash_movements').insert({
      shift_id: myOpenShift.id,
      movement_type: movementType,
      amount: Number(movementAmount),
      reason: movementReason,
      created_by: staff.id,
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    setMovementAmount(''); setMovementReason('')
    setShowMovementForm(false)
    load()
  }

  async function closeShift(e) {
    e.preventDefault()
    setError(null)
    if (!actualCash && actualCash !== '0') { setError('Enter the actual cash counted.'); return }
    setSaving(true)
    const { error } = await supabase.rpc('close_shift', { p_shift_id: myOpenShift.id, p_actual_cash: Number(actualCash) })
    setSaving(false)
    if (error) { setError(error.message); return }
    setActualCash('')
    setShowCloseForm(false)
    load()
  }

  async function approveShift(shiftId) {
    setError(null)
    const { error } = await supabase.from('shifts').update({
      status: 'closed', approved_by: staff.id, approved_at: new Date().toISOString(),
    }).eq('id', shiftId)
    if (error) setError(error.message)
    else load()
  }

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>

  return (
    <div>
      <h1 className="font-[var(--font-display)] text-[20px] font-medium mb-6">Shifts</h1>
      {error && <p className="text-[13px] text-[var(--danger)] mb-4">{error}</p>}

      {!myOpenShift ? (
        <form onSubmit={openShift} className="bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--radius)] p-5 mb-8 max-w-[380px]">
          <h2 className="text-[15px] font-medium mb-3">Start your shift</h2>
          <Label>Opening cash</Label>
          <Input type="number" min="0" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} placeholder="0" className="mb-4" />
          <Button type="submit" variant="primary" disabled={saving} className="w-full">
            {saving ? 'Starting\u2026' : 'Start shift'}
          </Button>
        </form>
      ) : (
        <div className="bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--radius)] p-5 mb-8 max-w-[480px]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-[15px] font-medium">Shift in progress</h2>
              <p className="text-[12px] text-[var(--ink-text-muted)]">
                Started {new Date(myOpenShift.opened_at).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
              </p>
            </div>
            <Badge tone="success">Open</Badge>
          </div>
          <p className="text-[13px] text-[var(--ink-text-muted)] mb-4">
            Opening cash: <span className="font-[var(--font-mono)] text-[var(--ink-text)]">{naira(myOpenShift.opening_cash)}</span>
          </p>

          {movements.length > 0 && (
            <div className="mb-4">
              {movements.map((m) => (
                <div key={m.id} className="flex justify-between text-[12.5px] py-1.5 border-b border-[var(--line)]">
                  <span className="text-[var(--ink-text-muted)]">{m.movement_type === 'cash_in' ? '+ Cash in' : '\u2212 Cash out'}: {m.reason || 'No reason'}</span>
                  <span className={`font-[var(--font-mono)] ${m.movement_type === 'cash_in' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                    {naira(m.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {showMovementForm ? (
            <form onSubmit={addMovement} className="mb-3">
              <div className="flex gap-2 mb-2">
                <Select value={movementType} onChange={(e) => setMovementType(e.target.value)} className="flex-1">
                  <option value="cash_in">Cash in</option>
                  <option value="cash_out">Cash out</option>
                </Select>
                <Input type="number" min="0" placeholder="Amount" value={movementAmount} onChange={(e) => setMovementAmount(e.target.value)} className="w-28" />
              </div>
              <Input value={movementReason} onChange={(e) => setMovementReason(e.target.value)} placeholder="Reason (optional)" className="mb-2" />
              <div className="flex gap-2">
                <Button type="submit" variant="secondary" size="sm" disabled={saving}>{saving ? '\u2026' : 'Record'}</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowMovementForm(false)}>Cancel</Button>
              </div>
            </form>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setShowMovementForm(true)} className="mb-3">
              + Cash in / out
            </Button>
          )}

          {showCloseForm ? (
            <form onSubmit={closeShift} className="pt-3 border-t border-[var(--line)]">
              <Label>Actual cash counted</Label>
              <Input type="number" min="0" value={actualCash} onChange={(e) => setActualCash(e.target.value)} className="mb-3" />
              <div className="flex gap-2">
                <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Closing\u2026' : 'Close shift'}</Button>
                <Button type="button" variant="ghost" onClick={() => setShowCloseForm(false)}>Cancel</Button>
              </div>
            </form>
          ) : (
            <Button variant="primary" onClick={() => setShowCloseForm(true)} className="w-full mt-2">
              Close shift
            </Button>
          )}
        </div>
      )}

      {pendingApprovals.length > 0 && (
        <>
          <h2 className="text-[12px] uppercase tracking-wide text-[var(--ink-text-muted)] mb-3">Pending approval</h2>
          <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden mb-8">
            {pendingApprovals.map((s, i) => (
              <div key={s.id} className={`p-4 ${i !== pendingApprovals.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[13px] font-medium">{s.staff?.name}</span>
                  <Badge tone={Math.abs(s.cash_difference) > 0 ? 'danger' : 'success'}>
                    {s.cash_difference > 0 ? '+' : ''}{naira(s.cash_difference)} diff
                  </Badge>
                </div>
                <div className="text-[12px] text-[var(--ink-text-muted)] mb-2">
                  Expected {naira(s.closing_cash_expected)} \u00b7 Counted {naira(s.closing_cash_actual)}
                </div>
                <Button size="sm" variant="primary" onClick={() => approveShift(s.id)}>Approve & close</Button>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="text-[12px] uppercase tracking-wide text-[var(--ink-text-muted)] mb-3">Recent shifts</h2>
      <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden">
        {recentShifts.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-text-faint)] p-5">No closed shifts yet.</p>
        ) : (
          recentShifts.map((s, i) => (
            <div key={s.id} className={`flex justify-between items-center p-4 ${i !== recentShifts.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
              <div>
                <div className="text-[13px] font-medium">{s.staff?.name}</div>
                <div className="text-[12px] text-[var(--ink-text-muted)]">
                  {new Date(s.closed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </div>
              </div>
              <Badge tone={Math.abs(s.cash_difference) > 0 ? 'warning' : 'success'}>
                {s.cash_difference > 0 ? '+' : ''}{naira(s.cash_difference)}
              </Badge>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
