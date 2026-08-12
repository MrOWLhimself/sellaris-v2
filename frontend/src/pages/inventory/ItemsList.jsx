import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

const naira = (n) => `\u20a6${Number(n).toLocaleString('en-NG')}`

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${checked ? 'bg-[var(--violet)]' : 'bg-[var(--surface-3)]'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-[var(--ink-text)] transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

export default function ItemsList() {
  const { staff } = useAuth()
  const [rows, setRows] = useState([])
  const [branches, setBranches] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [price, setPrice] = useState('')
  const [sku, setSku] = useState('')
  const [barcode, setBarcode] = useState('')
  const [trackStock, setTrackStock] = useState(true)
  const [isActive, setIsActive] = useState(true)
  const [lowStockThreshold, setLowStockThreshold] = useState('10')

  async function load() {
    setLoading(true)
    const [{ data: items, error: itmErr }, { data: branchList, error: brErr }, { data: stock, error: stErr }, { data: cats }] =
      await Promise.all([
        supabase
          .from('items')
          .select('id, name, price, cost, category_id, is_active, categories(name)')
          .eq('tenant_id', staff.tenant_id)
          .order('name'),
        supabase
          .from('branches')
          .select('id, name, is_warehouse')
          .eq('tenant_id', staff.tenant_id)
          .order('is_warehouse', { ascending: false }),
        supabase
          .from('item_stock')
          .select('item_id, branch_id, stock')
          .eq('tenant_id', staff.tenant_id),
        supabase.from('categories').select('id, name').eq('tenant_id', staff.tenant_id).order('name'),
      ])

    if (itmErr || brErr || stErr) {
      setError((itmErr || brErr || stErr).message)
      setLoading(false)
      return
    }

    const stockMap = {}
    for (const s of stock || []) stockMap[`${s.item_id}:${s.branch_id}`] = s.stock

    setBranches(branchList || [])
    setCategories(cats || [])
    setRows(
      (items || []).map((i) => ({
        ...i,
        categoryName: i.categories?.name || '\u2014',
        margin: i.price > 0 ? Math.round(((i.price - i.cost) / i.price) * 100) : 0,
        stockByBranch: (branchList || []).map((b) => ({ branchId: b.id, stock: stockMap[`${i.id}:${b.id}`] ?? 0 })),
      }))
    )
    if (cats?.length && !categoryId) setCategoryId(cats[0].id)
    setLoading(false)
  }

  useEffect(() => { load() }, [staff.tenant_id])

  async function createItem(e) {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !Number(price)) {
      setError('Enter a name and a price.')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('items').insert({
      tenant_id: staff.tenant_id,
      category_id: categoryId || null,
      name,
      description,
      price: Number(price),
      sku: sku || null,
      barcode: barcode || null,
      track_stock: trackStock,
      is_active: isActive,
      low_stock_threshold: Number(lowStockThreshold) || 10,
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    setName(''); setDescription(''); setPrice(''); setSku(''); setBarcode('')
    setShowForm(false)
    load()
  }

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading items\u2026</p>
  if (error && !showForm) return <p className="text-[13px] text-[var(--danger)]">{error}</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-[13px] text-[var(--ink-text-muted)]">
          Cost isn't set here \u2014 it's calculated automatically from what you actually pay via
          Purchase Orders, so it's never a guess.
        </p>
        <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ Add item'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={createItem} className="bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--radius)] p-5 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">No category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
          </div>

          <Label>Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" className="mb-4" />

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label>Price</Label>
              <Input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required />
            </div>
            <div>
              <Label>Low stock threshold</Label>
              <Input type="number" min="0" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} />
            </div>
            <div>
              <Label>SKU</Label>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <Label>Barcode</Label>
              <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-[var(--surface-3)] rounded-[var(--radius)] mb-2">
            <div>
              <div className="text-[13.5px] font-medium">Available for sale</div>
              <div className="text-[12px] text-[var(--ink-text-muted)]">Shows on POS and the public menu.</div>
            </div>
            <Toggle checked={isActive} onChange={() => setIsActive((v) => !v)} />
          </div>
          <div className="flex items-center justify-between p-3.5 bg-[var(--surface-3)] rounded-[var(--radius)] mb-4">
            <div>
              <div className="text-[13.5px] font-medium">Track stock</div>
              <div className="text-[12px] text-[var(--ink-text-muted)]">Off for made-to-order items with no fixed inventory.</div>
            </div>
            <Toggle checked={trackStock} onChange={() => setTrackStock((v) => !v)} />
          </div>

          {error && <p className="text-[13px] text-[var(--danger)] mb-4">{error}</p>}

          <Button type="submit" variant="primary" disabled={saving} className="w-full">
            {saving ? 'Saving\u2026' : 'Save item'}
          </Button>
        </form>
      )}

      <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden overflow-x-auto">
        <div
          className="grid px-4.5 py-2.5 text-[11px] uppercase tracking-wide text-[var(--ink-text-muted)] border-b border-[var(--line)] min-w-[720px]"
          style={{ gridTemplateColumns: `2fr 1fr 100px 100px 90px ${branches.map(() => '90px').join(' ')}` }}
        >
          <span>Item</span>
          <span>Category</span>
          <span className="text-right">Price</span>
          <span className="text-right">Cost</span>
          <span className="text-right">Margin</span>
          {branches.map((b) => (
            <span key={b.id} className="text-right truncate" title={b.name}>{b.name}</span>
          ))}
        </div>
        {rows.map((row, i) => (
          <div
            key={row.id}
            className={`grid px-4.5 py-3 text-[13px] items-center min-w-[720px] ${i !== rows.length - 1 ? 'border-b border-[var(--line)]' : ''}`}
            style={{ gridTemplateColumns: `2fr 1fr 100px 100px 90px ${branches.map(() => '90px').join(' ')}` }}
          >
            <span className="font-medium flex items-center gap-2">
              {row.name}
              {!row.is_active && <Badge tone="neutral">Hidden</Badge>}
            </span>
            <span className="text-[var(--ink-text-muted)]">{row.categoryName}</span>
            <span className="text-right font-[var(--font-mono)] text-[var(--gold)]">{naira(row.price)}</span>
            <span className="text-right font-[var(--font-mono)] text-[var(--ink-text-muted)]">{naira(row.cost)}</span>
            <span className="text-right font-[var(--font-mono)]">{row.margin}%</span>
            {row.stockByBranch.map((sb) => (
              <span key={sb.branchId} className="text-right font-[var(--font-mono)]">
                {sb.stock <= 0 ? <Badge tone="danger">0</Badge> : sb.stock}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
