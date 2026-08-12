import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Label, Select, Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

const naira = (n) => `\u20a6${Number(n).toLocaleString('en-NG')}`

export default function PurchaseOrders() {
  const { staff } = useAuth()
  const [suppliers, setSuppliers] = useState([])
  const [items, setItems] = useState([])
  const [warehouseId, setWarehouseId] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const [supplierId, setSupplierId] = useState('')
  const [lines, setLines] = useState([{ itemId: '', qty: '', unitCost: '' }])
  const [saving, setSaving] = useState(false)
  const [receivingId, setReceivingId] = useState(null)

  async function loadAll() {
    setLoading(true)
    const [{ data: supplierList }, { data: itemList }, { data: branchList }, { data: poList, error: poErr }] =
      await Promise.all([
        supabase.from('suppliers').select('id, name').eq('tenant_id', staff.tenant_id).order('name'),
        supabase.from('items').select('id, name').eq('tenant_id', staff.tenant_id).order('name'),
        supabase.from('branches').select('id, is_warehouse').eq('tenant_id', staff.tenant_id),
        supabase
          .from('purchase_orders')
          .select('id, status, created_at, suppliers(name), purchase_order_items(id, item_id, qty_ordered, unit_cost, items(name))')
          .eq('tenant_id', staff.tenant_id)
          .order('created_at', { ascending: false }),
      ])

    setSuppliers(supplierList || [])
    setItems(itemList || [])
    setWarehouseId((branchList || []).find((b) => b.is_warehouse)?.id || null)
    if (poErr) setError(poErr.message)
    else setOrders(poList || [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [staff.tenant_id])

  function updateLine(i, field, value) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)))
  }
  function addLine() { setLines((prev) => [...prev, { itemId: '', qty: '', unitCost: '' }]) }
  function removeLine(i) { setLines((prev) => prev.filter((_, idx) => idx !== i)) }

  async function submitPO(e) {
    e.preventDefault()
    setError(null)
    const validLines = lines.filter((l) => l.itemId && Number(l.qty) > 0 && Number(l.unitCost) >= 0)
    if (validLines.length === 0) {
      setError('Add at least one item with a quantity and unit cost.')
      return
    }
    setSaving(true)

    const { data: po, error: poErr } = await supabase
      .from('purchase_orders')
      .insert({ tenant_id: staff.tenant_id, branch_id: warehouseId, supplier_id: supplierId || null, status: 'sent' })
      .select('id')
      .single()

    if (poErr) { setError(poErr.message); setSaving(false); return }

    const { error: linesErr } = await supabase.from('purchase_order_items').insert(
      validLines.map((l) => ({
        purchase_order_id: po.id,
        item_id: l.itemId,
        qty_ordered: Number(l.qty),
        unit_cost: Number(l.unitCost),
      }))
    )

    setSaving(false)
    if (linesErr) { setError(linesErr.message); return }

    setLines([{ itemId: '', qty: '', unitCost: '' }])
    setSupplierId('')
    setShowForm(false)
    loadAll()
  }

  async function receivePO(po) {
    setReceivingId(po.id)
    setError(null)

    const { data: grn, error: grnErr } = await supabase
      .from('grns')
      .insert({ tenant_id: staff.tenant_id, branch_id: warehouseId, purchase_order_id: po.id, received_by: staff.id })
      .select('id')
      .single()

    if (grnErr) { setError(grnErr.message); setReceivingId(null); return }

    const { error: grnItemsErr } = await supabase.from('grn_items').insert(
      po.purchase_order_items.map((li) => ({
        grn_id: grn.id,
        item_id: li.item_id,
        qty_received: li.qty_ordered,
        unit_cost: li.unit_cost,
      }))
    )

    if (grnItemsErr) { setError(grnItemsErr.message); setReceivingId(null); return }

    const { error: statusErr } = await supabase
      .from('purchase_orders')
      .update({ status: 'received' })
      .eq('id', po.id)

    setReceivingId(null)
    if (statusErr) { setError(statusErr.message); return }

    loadAll()
  }

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-[13px] text-[var(--ink-text-muted)]">
          Plan purchases and send to suppliers. Receiving creates a GRN into the warehouse automatically.
        </p>
        <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New purchase order'}
        </Button>
      </div>

      {error && <p className="text-[13px] text-[var(--danger)] mb-4">{error}</p>}

      {showForm && (
        <form onSubmit={submitPO} className="bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--radius)] p-5 mb-6">
          <Label>Supplier</Label>
          <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="mb-4">
            <option value="">No supplier selected</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>

          <Label>Items</Label>
          {lines.map((line, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <Select value={line.itemId} onChange={(e) => updateLine(i, 'itemId', e.target.value)} className="flex-1">
                <option value="">Select item\u2026</option>
                {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
              </Select>
              <Input type="number" min="0" placeholder="Qty" value={line.qty} onChange={(e) => updateLine(i, 'qty', e.target.value)} className="w-20" />
              <Input type="number" min="0" placeholder="Unit cost" value={line.unitCost} onChange={(e) => updateLine(i, 'unitCost', e.target.value)} className="w-28" />
              {lines.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(i)}>&times;</Button>}
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={addLine} className="mb-4">+ Add item</Button>

          <Button type="submit" variant="primary" disabled={saving} className="w-full">
            {saving ? 'Sending\u2026' : 'Send purchase order'}
          </Button>
        </form>
      )}

      <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden">
        {orders.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-text-faint)] p-5">No purchase orders yet.</p>
        ) : (
          orders.map((po, i) => {
            const total = po.purchase_order_items.reduce((s, li) => s + li.qty_ordered * li.unit_cost, 0)
            return (
              <div key={po.id} className={`p-4 ${i !== orders.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[13px] font-medium">{po.suppliers?.name || 'No supplier'}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-[var(--font-mono)] text-[13px] text-[var(--gold)]">{naira(total)}</span>
                    <Badge tone={po.status === 'received' ? 'success' : 'warning'}>{po.status}</Badge>
                  </div>
                </div>
                <div className="text-[12px] text-[var(--ink-text-muted)] mb-2">
                  {po.purchase_order_items.map((li) => `${li.items?.name} \u00d7${li.qty_ordered}`).join(', ')}
                </div>
                {po.status !== 'received' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={receivingId === po.id}
                    onClick={() => receivePO(po)}
                  >
                    {receivingId === po.id ? 'Receiving\u2026' : 'Mark received \u2192 warehouse'}
                  </Button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
