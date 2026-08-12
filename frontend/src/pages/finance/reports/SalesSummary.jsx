import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { MetricCard } from '@/components/ui/Card'
import { DateRangePicker, daysAgo } from '@/components/ui/DateRangePicker'

const naira = (n) => `\u20a6${Number(n).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

export default function SalesSummary() {
  const { staff } = useAuth()
  const [from, setFrom] = useState(daysAgo(29))
  const [to, setTo] = useState(daysAgo(0))
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data: orders, error: err } = await supabase
        .from('orders')
        .select('id, closed_at, discount_type, discount_value, order_items(qty, unit_price, unit_cost), refunds(amount)')
        .eq('tenant_id', staff.tenant_id)
        .eq('status', 'settled')
        .gte('closed_at', `${from}T00:00:00`)
        .lte('closed_at', `${to}T23:59:59`)

      if (cancelled) return
      if (err) { setError(err.message); setLoading(false); return }

      const byDate = {}
      for (const o of orders || []) {
        const date = o.closed_at.slice(0, 10)
        if (!byDate[date]) byDate[date] = { grossSales: 0, refunds: 0, discounts: 0, costOfGoods: 0 }

        const subtotal = o.order_items.reduce((s, l) => s + l.qty * l.unit_price, 0)
        const cost = o.order_items.reduce((s, l) => s + l.qty * (l.unit_cost || 0), 0)
        const refunded = o.refunds.reduce((s, r) => s + Number(r.amount), 0)
        const discount = o.discount_type === 'percent'
          ? subtotal * (Number(o.discount_value || 0) / 100)
          : o.discount_type === 'flat'
            ? Number(o.discount_value || 0)
            : 0

        byDate[date].grossSales += subtotal
        byDate[date].refunds += refunded
        byDate[date].discounts += discount
        byDate[date].costOfGoods += cost
      }

      const sortedDates = Object.keys(byDate).sort()
      setRows(
        sortedDates.map((date) => {
          const d = byDate[date]
          const netSales = d.grossSales - d.refunds - d.discounts
          return { date, ...d, netSales, grossProfit: netSales - d.costOfGoods }
        })
      )
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [staff.tenant_id, from, to])

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>
  if (error) return <p className="text-[13px] text-[var(--danger)]">{error}</p>

  const totals = rows.reduce(
    (acc, r) => ({
      grossSales: acc.grossSales + r.grossSales,
      refunds: acc.refunds + r.refunds,
      discounts: acc.discounts + r.discounts,
      netSales: acc.netSales + r.netSales,
      costOfGoods: acc.costOfGoods + r.costOfGoods,
      grossProfit: acc.grossProfit + r.grossProfit,
    }),
    { grossSales: 0, refunds: 0, discounts: 0, netSales: 0, costOfGoods: 0, grossProfit: 0 }
  )

  const maxSales = Math.max(...rows.map((r) => r.grossSales), 1)

  return (
    <div>
      <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />

      <div className="grid grid-cols-5 gap-3 mb-6">
        <MetricCard label="Gross sales" value={naira(totals.grossSales)} accent />
        <MetricCard label="Refunds" value={naira(totals.refunds)} accent />
        <MetricCard label="Discounts" value={naira(totals.discounts)} accent />
        <MetricCard label="Net sales" value={naira(totals.netSales)} accent />
        <MetricCard label="Gross profit" value={naira(totals.grossProfit)} trend="up" accent />
      </div>

      {rows.length === 0 ? (
        <div className="bg-[var(--surface-2)] rounded-[var(--radius)] p-10 text-center">
          <p className="text-[13px] text-[var(--ink-text-faint)]">No settled sales in this period.</p>
        </div>
      ) : (
        <>
          <div className="bg-[var(--surface-2)] rounded-[var(--radius)] p-5 mb-6">
            <div className="flex items-end gap-1 h-32">
              {rows.map((r) => (
                <div key={r.date} className="flex-1 flex flex-col items-center justify-end gap-1">
                  <div
                    className="w-full bg-[var(--violet)] rounded-t-[3px] hover:bg-[var(--violet-bright)] transition-colors"
                    style={{ height: `${Math.max((r.grossSales / maxSales) * 100, 2)}%` }}
                    title={`${r.date}: ${naira(r.grossSales)}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden overflow-x-auto">
            <div className="grid grid-cols-6 px-4.5 py-2.5 text-[11px] uppercase tracking-wide text-[var(--ink-text-muted)] border-b border-[var(--line)] min-w-[720px]">
              <span>Date</span>
              <span className="text-right">Gross sales</span>
              <span className="text-right">Refunds</span>
              <span className="text-right">Discounts</span>
              <span className="text-right">Net sales</span>
              <span className="text-right">Gross profit</span>
            </div>
            {rows.slice().reverse().map((r, i) => (
              <div
                key={r.date}
                className={`grid grid-cols-6 px-4.5 py-2.5 text-[13px] items-center min-w-[720px] ${
                  i !== rows.length - 1 ? 'border-b border-[var(--line)]' : ''
                }`}
              >
                <span className="font-[var(--font-mono)] text-[var(--ink-text-muted)]">
                  {new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </span>
                <span className="text-right font-[var(--font-mono)]">{naira(r.grossSales)}</span>
                <span className="text-right font-[var(--font-mono)] text-[var(--danger)]">{r.refunds > 0 ? `-${naira(r.refunds)}` : naira(0)}</span>
                <span className="text-right font-[var(--font-mono)] text-[var(--danger)]">{r.discounts > 0 ? `-${naira(r.discounts)}` : naira(0)}</span>
                <span className="text-right font-[var(--font-mono)]">{naira(r.netSales)}</span>
                <span className="text-right font-[var(--font-mono)] text-[var(--success)]">{naira(r.grossProfit)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
