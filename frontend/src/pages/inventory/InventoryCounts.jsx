import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Label, Select, Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

export default function InventoryCounts() {
  const { staff } = useAuth()
  const [branches, setBranches] = useState([])
  const [items, setItems] = useState([])
  const [counts, setCounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [openCount, setOpenCount] = useState(null) // count being actively counted

  const [branchId, setBranchId] = useState('')
  const [type, setType] = useState('partial')
  const [selectedItemIds, setSelectedItemIds] = useState([])
  const [saving, setSaving] = useState(false)

  async function loadAll() {
    setLoading(true)
    const [{ data: branchList }, { data: itemList }, { data: countList, error: countErr }] = await Promise.all([
      supabase.from('branches').select('id, name').eq('tenant_id', staff.tenant_id),
      supabase.from('items').select('id, name').eq('tenant_id', staff.tenant_id).order('name'),
      supabase
        .from('inventory_counts')
        .select('id, type, status, created_at, branches(name), inventory_count_items(id, item_id, expected_stock, counted_stock, items(name))')
        .eq('tenant_id', staff.tenant_id)
        .order('created_at', { ascending: false }),
    ])
    setBranches(branchList || [])
    setItems(itemList || [])
    if (countErr) setError(countErr.message)
    else setCounts(countList || [])
    if (branchList?.length) setBranchId(staff.branch_id || branchList[0].id)
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [staff.tenant_id])

  async function createCount(e) {
    e.preventDefault()
    setError(null)
    const itemIds = type === 'full' ? items.map((i) => i.id) : selectedItemIds
    if (itemIds.length === 0 || !branchId) {
      setError('Pick a branch and at least one item (or choose Full to include everything).')
      return
    }
    setSaving(true)

    const { data: stockRows } = await supabase
      .from('item_stock')
      .select('item_id, stock')
      .eq('branch_id', branchId)
      .in('item_id', itemIds)
    const stockMap = Object.fromEntries((stockRows || []).map((s) => [s.item_id, s.stock]))

    const { data: count, error: countErr } = await supabase
      .from('inventory_counts')
      .insert({ tenant_id: staff.tenant_id, branch_id: branchId, type, status: 'counting', created_by: staff.id })
      .select('id')
      .single()

    if (countErr) { setError(countErr.message); setSaving(false); return }

    const { error: itemsErr } = await supabase.from('inventory_count_items').insert(
      itemIds.map((id) => ({ inventory_count_id: count.id, item_id: id, expected_stock: stockMap[id] ?? 0 }))
    )

    setSaving(false)
    if (itemsErr) { setError(itemsErr.message); return }

    setSelectedItemIds([])
    setShowForm(false)
    loadAll()
  }

  async function saveCountedValue(countItemId, value) {
    await supabase.from('inventory_count_items').update({ counted_stock: value === '' ? null : Number(value) }).eq('id', countItemId)
  }

  async function completeCount(countId) {
    setError(null)
    const { error } = await supabase.from('inventory_counts').update({ status: 'completed' }).eq('id', countId)
    if (error) { setError(error.message); return }
    setOpenCount(null)
    loadAll()
  }

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>

  // Actively counting view
  if (openCount) {
    return (
      <div>
        <button onClick={() => setOpenCount(null)} className="text-[13px] text-[var(--ink-text-muted)] hover:text-[var(--ink-text)] mb-4">
          &larr; Back to counts
        </button>
        <h2 className="font-[var(--font-display)] text-[16px] font-medium mb-1">{openCount.branches?.name} \u2014 {openCount.type} count</h2>
        <p className="text-[13px] text-[var(--ink-text-muted)] mb-4">Enter what you physically counted for each item.</p>

        {error && <p className="text-[13px] text-[var(--danger)] mb-4">{error}</p>}

        <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden mb-4">
          <div className="grid grid-cols-[2fr_1fr_1fr] px-4.5 py-2.5 text-[11px] uppercase tracking-wide text-[var(--ink-text-muted)] border-b border-[var(--line)]">
            <span>Item</span>
            <span className="text-right">Expected</span>
            <span className="text-right">Counted</span>
          </div>
          {openCount.inventory_count_items.map((ci, i) => (
            <div key={ci.id} className={`grid grid-cols-[2fr_1fr_1fr] px-4.5 py-2.5 text-[13px] items-center ${i !== openCount.inventory_count_items.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
              <span>{ci.items?.name}</span>
              <span className="text-right font-[var(--font-mono)] text-[var(--ink-text-muted)]">{ci.expected_stock}</span>
              <Input
                type="number"
                min="0"
                defaultValue={ci.counted_stock ?? ''}
                onBlur={(e) => saveCountedValue(ci.id, e.target.value)}
                className="text-right w-24 ml-auto"
              />
            </div>
          ))}
        </div>

        <Button variant="primary" onClick={() => completeCount(openCount.id)} className="w-full">
          Complete count &amp; reconcile stock
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-[13px] text-[var(--ink-text-muted)]">
          Compare physical stock against what the system expects, and reconcile any difference.
        </p>
        <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New count'}
        </Button>
      </div>

      {error && !openCount && <p className="text-[13px] text-[var(--danger)] mb-4">{error}</p>}

      {showForm && (
        <form onSubmit={createCount} className="bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--radius)] p-5 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label>Branch</Label>
              <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <div className="flex gap-4 h-10 items-center">
                <label className="flex items-center gap-1.5 text-[13px]">
                  <input type="radio" checked={type === 'partial'} onChange={() => setType('partial')} /> Partial
                </label>
                <label className="flex items-center gap-1.5 text-[13px]">
                  <input type="radio" checked={type === 'full'} onChange={() => setType('full')} /> Full
                </label>
              </div>
            </div>
          </div>

          {type === 'partial' && (
            <>
              <Label>Items to count</Label>
              <div className="max-h-40 overflow-auto bg-[var(--surface-3)] rounded-[var(--radius)] p-3 mb-4">
                {items.map((it) => (
                  <label key={it.id} className="flex items-center gap-2 text-[13px] py-1">
                    <input
                      type="checkbox"
                      checked={selectedItemIds.includes(it.id)}
                      onChange={(e) =>
                        setSelectedItemIds((prev) =>
                          e.target.checked ? [...prev, it.id] : prev.filter((id) => id !== it.id)
                        )
                      }
                    />
                    {it.name}
                  </label>
                ))}
              </div>
            </>
          )}

          <Button type="submit" variant="primary" disabled={saving} className="w-full">
            {saving ? 'Creating\u2026' : 'Start count'}
          </Button>
        </form>
      )}

      <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden">
        {counts.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-text-faint)] p-5">No counts yet.</p>
        ) : (
          counts.map((c, i) => (
            <div key={c.id} className={`flex justify-between items-center p-4 ${i !== counts.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
              <div>
                <div className="text-[13px] font-medium">{c.branches?.name} \u2014 {c.type} count</div>
                <div className="text-[12px] text-[var(--ink-text-muted)]">{c.inventory_count_items.length} items</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={c.status === 'completed' ? 'success' : 'warning'}>{c.status}</Badge>
                {c.status !== 'completed' && (
                  <Button size="sm" variant="secondary" onClick={() => setOpenCount(c)}>Continue</Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
