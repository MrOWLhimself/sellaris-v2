import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Badge } from '@/components/ui/Badge'

const naira = (n) => `\u20a6${Number(n).toLocaleString('en-NG')}`

export default function ItemsList() {
  const { staff } = useAuth()
  const [rows, setRows] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [{ data: items, error: itmErr }, { data: branchList, error: brErr }, { data: stock, error: stErr }] =
        await Promise.all([
          supabase
            .from('items')
            .select('id, name, price, cost, category_id, categories(name)')
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
        ])

      if (cancelled) return
      if (itmErr || brErr || stErr) {
        setError((itmErr || brErr || stErr).message)
        setLoading(false)
        return
      }

      const stockMap = {}
      for (const s of stock || []) {
        stockMap[`${s.item_id}:${s.branch_id}`] = s.stock
      }

      setBranches(branchList || [])
      setRows(
        (items || []).map((i) => ({
          ...i,
          categoryName: i.categories?.name || '\u2014',
          margin: i.price > 0 ? Math.round(((i.price - i.cost) / i.price) * 100) : 0,
          stockByBranch: (branchList || []).map((b) => ({
            branchId: b.id,
            stock: stockMap[`${i.id}:${b.id}`] ?? 0,
          })),
        }))
      )
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [staff.tenant_id])

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading items\u2026</p>
  if (error) return <p className="text-[13px] text-[var(--danger)]">{error}</p>

  return (
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
          <span key={b.id} className="text-right truncate" title={b.name}>
            {b.name}
          </span>
        ))}
      </div>
      {rows.map((row, i) => (
        <div
          key={row.id}
          className={`grid px-4.5 py-3 text-[13px] items-center min-w-[720px] ${
            i !== rows.length - 1 ? 'border-b border-[var(--line)]' : ''
          }`}
          style={{ gridTemplateColumns: `2fr 1fr 100px 100px 90px ${branches.map(() => '90px').join(' ')}` }}
        >
          <span className="font-medium">{row.name}</span>
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
  )
}
