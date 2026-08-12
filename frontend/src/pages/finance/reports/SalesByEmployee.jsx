import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { DateRangePicker, daysAgo } from '@/components/ui/DateRangePicker'

const naira = (n) => `\u20a6${Number(n).toLocaleString('en-NG')}`

export default function SalesByEmployee() {
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
        .select('id, staff(name), order_items(qty, unit_price)')
        .eq('tenant_id', staff.tenant_id)
        .eq('status', 'settled')
        .gte('closed_at', `${from}T00:00:00`)
        .lte('closed_at', `${to}T23:59:59`)

      if (cancelled) return
      const byEmployee = {}
      for (const o of data || []) {
        const name = o.staff?.name || 'Unknown'
        const sales = o.order_items.reduce((s, l) => s + l.qty * l.unit_price, 0)
        if (!byEmployee[name]) byEmployee[name] = { orders: 0, sales: 0 }
        byEmployee[name].orders += 1
        byEmployee[name].sales += sales
      }
      setRows(Object.entries(byEmployee).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.sales - a.sales))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [staff.tenant_id, from, to])

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>

  return (
    <div>
      <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden">
        <div className="grid grid-cols-3 px-4.5 py-2.5 text-[11px] uppercase tracking-wide text-[var(--ink-text-muted)] border-b border-[var(--line)]">
          <span>Employee</span>
          <span className="text-right">Orders</span>
          <span className="text-right">Sales</span>
        </div>
        {rows.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-text-faint)] p-5">No sales in this period.</p>
        ) : (
          rows.map((r, i) => (
            <div key={r.name} className={`grid grid-cols-3 px-4.5 py-2.5 text-[13px] items-center ${i !== rows.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
              <span className="font-medium">{r.name}</span>
              <span className="text-right font-[var(--font-mono)]">{r.orders}</span>
              <span className="text-right font-[var(--font-mono)]">{naira(r.sales)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
