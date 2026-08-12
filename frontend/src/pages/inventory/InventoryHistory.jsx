import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Badge } from '@/components/ui/Badge'

const TYPE_LABELS = {
  grn: 'Received',
  transfer_out: 'Transfer out',
  transfer_in: 'Transfer in',
  sale: 'Sale',
  adjustment: 'Adjustment',
}

const TYPE_TONE = {
  grn: 'success',
  transfer_in: 'success',
  transfer_out: 'info',
  sale: 'neutral',
  adjustment: 'warning',
}

export default function InventoryHistory() {
  const { staff } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('stock_movements')
        .select('id, movement_type, qty_change, stock_after, reason, created_at, items(name), branches(name), staff(name)')
        .eq('tenant_id', staff.tenant_id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (cancelled) return
      if (error) setError(error.message)
      else setRows(data || [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [staff.tenant_id])

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>
  if (error) return <p className="text-[13px] text-[var(--danger)]">{error}</p>

  if (rows.length === 0) {
    return (
      <div className="bg-[var(--surface-2)] rounded-[var(--radius)] p-10 text-center">
        <p className="text-[13px] text-[var(--ink-text-faint)]">No stock movements yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden overflow-x-auto">
      <div className="grid grid-cols-[140px_1.5fr_1fr_100px_100px_1fr] px-4.5 py-2.5 text-[11px] uppercase tracking-wide text-[var(--ink-text-muted)] border-b border-[var(--line)] min-w-[720px]">
        <span>Date</span>
        <span>Item</span>
        <span>Branch</span>
        <span className="text-right">Change</span>
        <span className="text-right">Stock after</span>
        <span>Type</span>
      </div>
      {rows.map((r, i) => (
        <div
          key={r.id}
          className={`grid grid-cols-[140px_1.5fr_1fr_100px_100px_1fr] px-4.5 py-2.5 text-[13px] items-center min-w-[720px] ${
            i !== rows.length - 1 ? 'border-b border-[var(--line)]' : ''
          }`}
        >
          <span className="text-[12px] text-[var(--ink-text-muted)] font-[var(--font-mono)]">
            {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}{' '}
            {new Date(r.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="font-medium">{r.items?.name}</span>
          <span className="text-[var(--ink-text-muted)]">{r.branches?.name}</span>
          <span className={`text-right font-[var(--font-mono)] ${r.qty_change > 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
            {r.qty_change > 0 ? '+' : ''}{r.qty_change}
          </span>
          <span className="text-right font-[var(--font-mono)]">{r.stock_after}</span>
          <Badge tone={TYPE_TONE[r.movement_type] || 'neutral'}>{TYPE_LABELS[r.movement_type] || r.movement_type}</Badge>
        </div>
      ))}
    </div>
  )
}
