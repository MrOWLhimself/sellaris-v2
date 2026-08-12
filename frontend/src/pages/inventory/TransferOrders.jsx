import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Label, Select, Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

export default function TransferOrders() {
  const { staff } = useAuth()
  const [branches, setBranches] = useState([])
  const [items, setItems] = useState([])
  const [transfers, setTransfers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const [fromBranch, setFromBranch] = useState('')
  const [toBranch, setToBranch] = useState('')
  const [lines, setLines] = useState([{ itemId: '', qty: '' }])
  const [saving, setSaving] = useState(false)

  async function loadAll() {
    setLoading(true)
    const [{ data: branchList }, { data: itemList }, { data: transferList, error: tErr }] = await Promise.all([
      supabase.from('branches').select('id, name, is_warehouse').eq('tenant_id', staff.tenant_id).order('is_warehouse', { ascending: false }),
      supabase.from('items').select('id, name').eq('tenant_id', staff.tenant_id).order('name'),
      supabase
        .from('transfer_orders')
        .select('id, status, created_at, completed_at, from:branches!transfer_orders_from_branch_id_fkey(name), to:branches!transfer_orders_to_branch_id_fkey(name), transfer_order_items(id, qty, items(name))')
        .eq('tenant_id', staff.tenant_id)
        .order('created_at', { ascending: false }),
    ])

    setBranches(branchList || [])
    setItems(itemList || [])
    if (tErr) setError(tErr.message)
    else setTransfers(transferList || [])

    const warehouse = (branchList || []).find((b) => b.is_warehouse)
    const store = (branchList || []).find((b) => !b.is_warehouse)
    if (warehouse) setFromBranch(warehouse.id)
    if (store) setToBranch(store.id)

    setLoading(false)
  }

  useEffect(() => { loadAll() }, [staff.tenant_id])

  function updateLine(i, field, value) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)))
  }
  function addLine() {
    setLines((prev) => [...prev, { itemId: '', qty: '' }])
  }
  function removeLine(i) {
    setLines((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function submitTransfer(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const validLines = lines.filter((l) => l.itemId && Number(l.qty) > 0)
    if (validLines.length === 0 || !fromBranch || !toBranch) {
      setError('Add at least one item with a quantity, and pick both branches.')
      setSaving(false)
      return
    }

    const { data: order, error: orderErr } = await supabase
      .from('transfer_orders')
      .insert({ tenant_id: staff.tenant_id, from_branch_id: fromBranch, to_branch_id: toBranch, status: 'pending' })
      .select('id')
      .single()

    if (orderErr) {
      setError(orderErr.message)
      setSaving(false)
      return
    }

    const { error: linesErr } = await supabase.from('transfer_order_items').insert(
      validLines.map((l) => ({ transfer_order_id: order.id, item_id: l.itemId, qty: Number(l.qty) }))
    )

    if (linesErr) {
      setError(linesErr.message)
      setSaving(false)
      return
    }

    // Complete it immediately — this is the "push to store" action itself
    const { error: completeErr } = await supabase
      .from('transfer_orders')
      .update({ status: 'completed' })
      .eq('id', order.id)

    setSaving(false)

    if (completeErr) {
      setError(completeErr.message)
      return
    }

    setLines([{ itemId: '', qty: '' }])
    setShowForm(false)
    loadAll()
  }

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-[13px] text-[var(--ink-text-muted)]">
          Move stock from the warehouse to a store. Nothing is sellable until it's transferred here.
        </p>
        <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New transfer'}
        </Button>
      </div>

      {error && <p className="text-[13px] text-[var(--danger)] mb-4">{error}</p>}

      {showForm && (
        <form onSubmit={submitTransfer} className="bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--radius)] p-5 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label>From</Label>
              <Select value={fromBranch} onChange={(e) => setFromBranch(e.target.value)}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}{b.is_warehouse ? ' (warehouse)' : ''}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>To</Label>
              <Select value={toBranch} onChange={(e) => setToBranch(e.target.value)}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}{b.is_warehouse ? ' (warehouse)' : ''}</option>
                ))}
              </Select>
            </div>
          </div>

          <Label>Items</Label>
          {lines.map((line, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <Select value={line.itemId} onChange={(e) => updateLine(i, 'itemId', e.target.value)} className="flex-1">
                <option value="">Select item\u2026</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>{it.name}</option>
                ))}
              </Select>
              <Input
                type="number"
                min="0"
                placeholder="Qty"
                value={line.qty}
                onChange={(e) => updateLine(i, 'qty', e.target.value)}
                className="w-24"
              />
              {lines.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(i)}>&times;</Button>
              )}
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={addLine} className="mb-4">
            + Add item
          </Button>

          <Button type="submit" variant="primary" disabled={saving} className="w-full">
            {saving ? 'Transferring\u2026' : 'Complete transfer'}
          </Button>
        </form>
      )}

      <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden">
        {transfers.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-text-faint)] p-5">No transfers yet.</p>
        ) : (
          transfers.map((t, i) => (
            <div key={t.id} className={`p-4 ${i !== transfers.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[13px] font-medium">
                  {t.from?.name} &rarr; {t.to?.name}
                </span>
                <Badge tone={t.status === 'completed' ? 'success' : 'warning'}>{t.status}</Badge>
              </div>
              <div className="text-[12px] text-[var(--ink-text-muted)]">
                {t.transfer_order_items.map((li) => `${li.items?.name} \u00d7${li.qty}`).join(', ')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
