import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { DateRangePicker, daysAgo } from '@/components/ui/DateRangePicker'

const naira = (n) => `\u20a6${Number(n).toLocaleString('en-NG')}`

export default function SalesByCategory() {
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
        .from('order_items')
        .select('qty, unit_price, items(categories(name)), orders!inner(tenant_id, status, closed_at)')
        .eq('orders.tenant_id', staff.tenant_id)
        .eq('orders.status', 'settled')
        .gte('orders.closed_at', `${from}T00:00:00`)
        .lte('orders.closed_at', `${to}T23:59:59`)

      if (cancelled) return
      const byCategory = {}
      for (const r of data || []) {
        const name = r.items?.categories?.name || 'Uncategorized'
        byCategory[name] = (byCategory[name] || 0) + r.qty * r.unit_price
      }
      const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
      setRows(entries)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [staff.tenant_id, from, to])

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>

  const total = rows.reduce((s, [, v]) => s + v, 0)

  return (
    <div>
      <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-text-faint)] p-5">No sales in this period.</p>
        ) : (
          rows.map(([name, value], i) => (
            <div key={name} className={`flex items-center gap-4 p-4 ${i !== rows.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
              <span className="text-[13px] font-medium flex-1">{name}</span>
              <div className="flex-1 bg-[var(--surface-3)] rounded-full h-2 overflow-hidden">
                <div className="h-full bg-[var(--violet)]" style={{ width: `${total > 0 ? (value / total) * 100 : 0}%` }} />
              </div>
              <span className="font-[var(--font-mono)] text-[13px] w-28 text-right">{naira(value)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
