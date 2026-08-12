import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Label, Select, Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

const REASONS = [
  { value: 'receive_items', label: 'Receive items' },
  { value: 'damage', label: 'Damage' },
  { value: 'loss', label: 'Loss' },
  { value: 'theft', label: 'Theft' },
  { value: 'expired', label: 'Expired' },
  { value: 'correction', label: 'Correction' },
]

export default function StockAdjustments() {
  const { staff } = useAuth()
  const [branches, setBranches] = useState([])
  const [items, setItems] = useState([])
  const [adjustments, setAdjustments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const [branchId, setBranchId] = useState('')
  const [reason, setReason] = useState('receive_items')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([{ itemId: '', qty: '' }])
  const [saving, setSaving] = useState(false)

  async function loadAll() {
    setLoading(true)
    const [{ data: branchList }, { data: itemList }, { data: adjList, error: adjErr }] = await Promise.all([
      supabase.from('branches').select('id, name').eq('tenant_id', staff.tenant_id),
      supabase.from('items').select('id, name').eq('tenant_id', staff.tenant_id).order('name'),
      supabase
        .from('stock_adjustments')
        .select('id, reason, notes, created_at, branches(name), stock_adjustment_items(id, qty_change, items(name))')
        .eq('tenant_id', staff.tenant_id)
        .order('created_at', { ascending: false }),
    ])
    setBranches(branchList || [])
    setItems(itemList || [])
    if (adjErr) setError(adjErr.message)
    else setAdjustments(adjList || [])
    if (branchList?.[0]) setBranchId(staff.branch_id || branchList[0].id)
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [staff.tenant_id])

  function updateLine(i, field, value) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)))
  }
  function addLine() { setLines((prev) => [...prev, { itemId: '', qty: '' }]) }
  function removeLine(i) { setLines((prev) => prev.filter((_, idx) => idx !== i)) }

  // "Receive items" and "correction" (positive) add stock; damage/loss/theft/expired remove it
  const isPositiveReason = reason === 'receive_items' || reason === 'correction'

  async function submitAdjustment(e) {
    e.preventDefault()
    setError(null)
    const validLines = lines.filter((l) => l.itemId && Number(l.qty) > 0)
    if (validLines.length === 0 || !branchId) {
      setError('Add at least one item with a quantity, and pick a branch.')
      return
    }
    setSaving(true)

    const { data: adj, error: adjErr } = await supabase
      .from('stock_adjustments')
      .insert({ tenant_id: staff.tenant_id, branch_id: branchId, reason, notes, created_by: staff.id })
      .select('id')
      .single()

    if (adjErr) { setError(adjErr.message); setSaving(false); return }

    const { error: linesErr } = await supabase.from('stock_adjustment_items').insert(
      validLines.map((l) => ({
        stock_adjustment_id: adj.id,
        item_id: l.itemId,
        qty_change: isPositiveReason ? Number(l.qty) : -Number(l.qty),
      }))
    )

    setSaving(false)
    if (linesErr) { setError(linesErr.message); return }

    setLines([{ itemId: '', qty: '' }])
    setNotes('')
    setShowForm(false)
    loadAll()
  }

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-[13px] text-[var(--ink-text-muted)]">
          Correct stock for damage, loss, theft, or manual counts \u2014 outside the normal purchase/transfer flow.
        </p>
        <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New adjustment'}
        </Button>
      </div>

      {error && <p className="text-[13px] text-[var(--danger)] mb-4">{error}</p>}

      {showForm && (
        <form onSubmit={submitAdjustment} className="bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--radius)] p-5 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label>Branch</Label>
              <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </div>
            <div>
              <Label>Reason</Label>
              <Select value={reason} onChange={(e) => setReason(e.target.value)}>
                {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </Select>
            </div>
          </div>

          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="mb-4" />

          <Label>Items {isPositiveReason ? '(quantity to add)' : '(quantity to remove)'}</Label>
          {lines.map((line, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <Select value={line.itemId} onChange={(e) => updateLine(i, 'itemId', e.target.value)} className="flex-1">
                <option value="">Select item\u2026</option>
                {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
              </Select>
              <Input type="number" min="0" placeholder="Qty" value={line.qty} onChange={(e) => updateLine(i, 'qty', e.target.value)} className="w-24" />
              {lines.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(i)}>&times;</Button>}
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={addLine} className="mb-4">+ Add item</Button>

          <Button type="submit" variant={isPositiveReason ? 'primary' : 'danger'} disabled={saving} className="w-full">
            {saving ? 'Applying\u2026' : isPositiveReason ? 'Add stock' : 'Remove stock'}
          </Button>
        </form>
      )}

      <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden">
        {adjustments.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-text-faint)] p-5">No adjustments yet.</p>
        ) : (
          adjustments.map((a, i) => (
            <div key={a.id} className={`p-4 ${i !== adjustments.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[13px] font-medium">{a.branches?.name}</span>
                <Badge tone={a.reason === 'receive_items' || a.reason === 'correction' ? 'success' : 'danger'}>
                  {REASONS.find((r) => r.value === a.reason)?.label || a.reason}
                </Badge>
              </div>
              <div className="text-[12px] text-[var(--ink-text-muted)]">
                {a.stock_adjustment_items.map((li) => `${li.items?.name} ${li.qty_change > 0 ? '+' : ''}${li.qty_change}`).join(', ')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
