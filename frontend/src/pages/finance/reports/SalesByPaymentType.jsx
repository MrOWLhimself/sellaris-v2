import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { DateRangePicker, daysAgo } from '@/components/ui/DateRangePicker'

const naira = (n) => `\u20a6${Number(n).toLocaleString('en-NG')}`
const METHOD_LABELS = { cash: 'Cash', transfer: 'Transfer', card: 'Card', pos: 'POS' }

export default function SalesByPaymentType() {
  const { staff } = useAuth()
  const [from, setFrom] = useState(daysAgo(29))
  const [to, setTo] = useState(daysAgo(0))
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data: orderIds } = await supabase
        .from('orders')
        .select('id')
        .eq('tenant_id', staff.tenant_id)
      const ids = (orderIds || []).map((o) => o.id)

      const { data } = await supabase
        .from('payments')
        .select('amount, method, created_at')
        .in('order_id', ids)
        .eq('status', 'confirmed')
        .gte('created_at', `${from}T00:00:00`)
        .lte('created_at', `${to}T23:59:59`)

      if (cancelled) return
      const byMethod = {}
      for (const p of data || []) {
        byMethod[p.method] = (byMethod[p.method] || 0) + Number(p.amount)
      }
      setRows(Object.entries(byMethod).sort((a, b) => b[1] - a[1]))
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
          <p className="text-[13px] text-[var(--ink-text-faint)] p-5">No confirmed payments in this period.</p>
        ) : (
          rows.map(([method, value], i) => (
            <div key={method} className={`flex items-center gap-4 p-4 ${i !== rows.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
              <span className="text-[13px] font-medium flex-1">{METHOD_LABELS[method] || method}</span>
              <div className="flex-1 bg-[var(--surface-3)] rounded-full h-2 overflow-hidden">
                <div className="h-full bg-[var(--gold)]" style={{ width: `${total > 0 ? (value / total) * 100 : 0}%` }} />
              </div>
              <span className="font-[var(--font-mono)] text-[13px] w-28 text-right">{naira(value)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
