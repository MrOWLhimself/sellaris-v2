import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Label, Select, Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

export default function Production() {
  const { staff } = useAuth()
  const [branches, setBranches] = useState([])
  const [items, setItems] = useState([])
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const [branchId, setBranchId] = useState('')
  const [outputItemId, setOutputItemId] = useState('')
  const [qtyProduced, setQtyProduced] = useState('')
  const [ingredients, setIngredients] = useState([{ itemId: '', qty: '' }])
  const [saving, setSaving] = useState(false)

  async function loadAll() {
    setLoading(true)
    const [{ data: branchList }, { data: itemList }, { data: runList, error: runErr }] = await Promise.all([
      supabase.from('branches').select('id, name').eq('tenant_id', staff.tenant_id),
      supabase.from('items').select('id, name, cost').eq('tenant_id', staff.tenant_id).order('name'),
      supabase
        .from('production_orders')
        .select('id, status, qty_produced, created_at, branches(name), output:items!production_orders_output_item_id_fkey(name), production_ingredients(id, qty_used, items(name))')
        .eq('tenant_id', staff.tenant_id)
        .order('created_at', { ascending: false }),
    ])
    setBranches(branchList || [])
    setItems(itemList || [])
    if (runErr) setError(runErr.message)
    else setRuns(runList || [])
    if (branchList?.length) setBranchId(staff.branch_id || branchList[0].id)
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [staff.tenant_id])

  function updateIngredient(i, field, value) {
    setIngredients((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)))
  }
  function addIngredient() { setIngredients((prev) => [...prev, { itemId: '', qty: '' }]) }
  function removeIngredient(i) { setIngredients((prev) => prev.filter((_, idx) => idx !== i)) }

  async function submitProduction(e) {
    e.preventDefault()
    setError(null)
    const validIngredients = ingredients.filter((l) => l.itemId && Number(l.qty) > 0)
    if (!outputItemId || !Number(qtyProduced) || validIngredients.length === 0 || !branchId) {
      setError('Pick an output item, a quantity produced, a branch, and at least one ingredient.')
      return
    }
    setSaving(true)

    const { data: run, error: runErr } = await supabase
      .from('production_orders')
      .insert({
        tenant_id: staff.tenant_id,
        branch_id: branchId,
        output_item_id: outputItemId,
        qty_produced: Number(qtyProduced),
        status: 'pending',
        created_by: staff.id,
      })
      .select('id')
      .single()

    if (runErr) { setError(runErr.message); setSaving(false); return }

    const { error: ingErr } = await supabase.from('production_ingredients').insert(
      validIngredients.map((l) => ({ production_order_id: run.id, item_id: l.itemId, qty_used: Number(l.qty) }))
    )
    if (ingErr) { setError(ingErr.message); setSaving(false); return }

    const { error: completeErr } = await supabase
      .from('production_orders')
      .update({ status: 'completed' })
      .eq('id', run.id)

    setSaving(false)
    if (completeErr) { setError(completeErr.message); return }

    setOutputItemId(''); setQtyProduced(''); setIngredients([{ itemId: '', qty: '' }])
    setShowForm(false)
    loadAll()
  }

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-[13px] text-[var(--ink-text-muted)]">
          Turn ingredients into a made item \u2014 the output's cost is calculated automatically from what went into it.
        </p>
        <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New production run'}
        </Button>
      </div>

      {error && <p className="text-[13px] text-[var(--danger)] mb-4">{error}</p>}

      {showForm && (
        <form onSubmit={submitProduction} className="bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--radius)] p-5 mb-6">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <Label>Branch</Label>
              <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </div>
            <div>
              <Label>Output item</Label>
              <Select value={outputItemId} onChange={(e) => setOutputItemId(e.target.value)}>
                <option value="">Select\u2026</option>
                {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
              </Select>
            </div>
            <div>
              <Label>Qty produced</Label>
              <Input type="number" min="1" value={qtyProduced} onChange={(e) => setQtyProduced(e.target.value)} />
            </div>
          </div>

          <Label>Ingredients used</Label>
          {ingredients.map((line, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <Select value={line.itemId} onChange={(e) => updateIngredient(i, 'itemId', e.target.value)} className="flex-1">
                <option value="">Select item\u2026</option>
                {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
              </Select>
              <Input type="number" min="0" placeholder="Qty" value={line.qty} onChange={(e) => updateIngredient(i, 'qty', e.target.value)} className="w-24" />
              {ingredients.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => removeIngredient(i)}>&times;</Button>}
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={addIngredient} className="mb-4">+ Add ingredient</Button>

          <Button type="submit" variant="primary" disabled={saving} className="w-full">
            {saving ? 'Producing\u2026' : 'Complete production'}
          </Button>
        </form>
      )}

      <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden">
        {runs.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-text-faint)] p-5">No production runs yet.</p>
        ) : (
          runs.map((r, i) => (
            <div key={r.id} className={`p-4 ${i !== runs.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[13px] font-medium">{r.output?.name} \u00d7{r.qty_produced}</span>
                <Badge tone="success">{r.branches?.name}</Badge>
              </div>
              <div className="text-[12px] text-[var(--ink-text-muted)]">
                From: {r.production_ingredients.map((li) => `${li.items?.name} \u00d7${li.qty_used}`).join(', ')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
