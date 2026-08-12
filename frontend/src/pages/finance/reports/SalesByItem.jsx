import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { DateRangePicker, daysAgo } from '@/components/ui/DateRangePicker'

const naira = (n) => `\u20a6${Number(n).toLocaleString('en-NG')}`

export default function SalesByItem() {
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
        .select('qty, unit_price, unit_cost, items(name), orders!inner(tenant_id, status, closed_at)')
        .eq('orders.tenant_id', staff.tenant_id)
        .eq('orders.status', 'settled')
        .gte('orders.closed_at', `${from}T00:00:00`)
        .lte('orders.closed_at', `${to}T23:59:59`)

      if (cancelled) return
      const byItem = {}
      for (const r of data || []) {
        const name = r.items?.name || 'Unknown'
        if (!byItem[name]) byItem[name] = { qty: 0, sales: 0, cost: 0 }
        byItem[name].qty += r.qty
        byItem[name].sales += r.qty * r.unit_price
        byItem[name].cost += r.qty * (r.unit_cost || 0)
      }
      setRows(
        Object.entries(byItem)
          .map(([name, v]) => ({ name, ...v, profit: v.sales - v.cost }))
          .sort((a, b) => b.sales - a.sales)
      )
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [staff.tenant_id, from, to])

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>

  return (
    <div>
      <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden overflow-x-auto">
        <div className="grid grid-cols-4 px-4.5 py-2.5 text-[11px] uppercase tracking-wide text-[var(--ink-text-muted)] border-b border-[var(--line)] min-w-[560px]">
          <span>Item</span>
          <span className="text-right">Qty sold</span>
          <span className="text-right">Sales</span>
          <span className="text-right">Profit</span>
        </div>
        {rows.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-text-faint)] p-5">No sales in this period.</p>
        ) : (
          rows.map((r, i) => (
            <div key={r.name} className={`grid grid-cols-4 px-4.5 py-2.5 text-[13px] items-center min-w-[560px] ${i !== rows.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
              <span className="font-medium">{r.name}</span>
              <span className="text-right font-[var(--font-mono)]">{r.qty}</span>
              <span className="text-right font-[var(--font-mono)]">{naira(r.sales)}</span>
              <span className="text-right font-[var(--font-mono)] text-[var(--success)]">{naira(r.profit)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
