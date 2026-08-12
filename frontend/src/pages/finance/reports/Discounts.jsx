import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { DateRangePicker, daysAgo } from '@/components/ui/DateRangePicker'
import { Badge } from '@/components/ui/Badge'

const naira = (n) => `\u20a6${Number(n).toLocaleString('en-NG')}`

export default function Discounts() {
  const { staff } = useAuth()
  const [from, setFrom] = useState(daysAgo(29))
  const [to, setTo] = useState(daysAgo(0))
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('orders')
        .select('id, table_label, closed_at, discount_type, discount_value, discount_reason, order_items(qty, unit_price)')
        .eq('tenant_id', staff.tenant_id)
        .eq('status', 'settled')
        .not('discount_type', 'is', null)
        .gte('closed_at', `${from}T00:00:00`)
        .lte('closed_at', `${to}T23:59:59`)
        .order('closed_at', { ascending: false })

      if (cancelled) return
      setRows(
        (data || []).map((o) => {
          const subtotal = o.order_items.reduce((s, l) => s + l.qty * l.unit_price, 0)
          const amount = o.discount_type === 'percent'
            ? subtotal * (Number(o.discount_value || 0) / 100)
            : Number(o.discount_value || 0)
          return { ...o, subtotal, amount }
        })
      )
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [staff.tenant_id, from, to])

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>

  const total = rows.reduce((s, r) => s + r.amount, 0)

  return (
    <div>
      <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      <p className="text-[13px] text-[var(--ink-text-muted)] mb-4">Total discounted: {naira(total)}</p>
      <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-text-faint)] p-5">No discounts applied in this period.</p>
        ) : (
          rows.map((r, i) => (
            <div key={r.id} className={`flex justify-between items-center p-4 ${i !== rows.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
              <div>
                <div className="text-[13px] font-medium">{r.table_label}</div>
                <div className="text-[12px] text-[var(--ink-text-muted)]">{r.discount_reason || 'No reason given'}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="warning">{r.discount_type === 'percent' ? `${r.discount_value}%` : naira(r.discount_value)}</Badge>
                <span className="font-[var(--font-mono)] text-[13px] text-[var(--danger)]">-{naira(r.amount)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
