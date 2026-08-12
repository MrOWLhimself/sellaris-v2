import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { MetricCard } from '@/components/ui/Card'

const naira = (n) => `\u20a6${Number(n).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

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
      const { data, error } = await supabase
        .from('order_items')
        .select('qty, unit_price, unit_cost, created_at, orders!inner(tenant_id)')
        .eq('orders.tenant_id', staff.tenant_id)
        .gte('created_at', `${from}T00:00:00`)
        .lte('created_at', `${to}T23:59:59`)

      if (cancelled) return
      if (error) { setError(error.message); setLoading(false); return }

      const byDate = {}
      for (const r of data || []) {
        const date = r.created_at.slice(0, 10)
        if (!byDate[date]) byDate[date] = { grossSales: 0, costOfGoods: 0 }
        byDate[date].grossSales += r.qty * r.unit_price
        byDate[date].costOfGoods += r.qty * (r.unit_cost || 0)
      }

      const sortedDates = Object.keys(byDate).sort()
      setRows(
        sortedDates.map((date) => ({
          date,
          grossSales: byDate[date].grossSales,
          costOfGoods: byDate[date].costOfGoods,
          grossProfit: byDate[date].grossSales - byDate[date].costOfGoods,
        }))
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
      costOfGoods: acc.costOfGoods + r.costOfGoods,
      grossProfit: acc.grossProfit + r.grossProfit,
    }),
    { grossSales: 0, costOfGoods: 0, grossProfit: 0 }
  )

  const maxSales = Math.max(...rows.map((r) => r.grossSales), 1)

  return (
    <div>
      <div className="flex gap-3 items-end mb-6">
        <div>
          <label className="block text-[13px] text-[var(--ink-text-muted)] mb-1.5">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-10 rounded-[var(--radius)] bg-[var(--surface-3)] border border-[var(--line-strong)] px-3 text-[14px] text-[var(--ink-text)]"
          />
        </div>
        <div>
          <label className="block text-[13px] text-[var(--ink-text-muted)] mb-1.5">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-10 rounded-[var(--radius)] bg-[var(--surface-3)] border border-[var(--line-strong)] px-3 text-[14px] text-[var(--ink-text)]"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3.5 mb-6">
        <MetricCard label="Gross sales" value={naira(totals.grossSales)} accent />
        <MetricCard label="Cost of goods" value={naira(totals.costOfGoods)} accent />
        <MetricCard label="Gross profit" value={naira(totals.grossProfit)} trend="up" accent />
        <MetricCard
          label="Margin"
          value={`${totals.grossSales > 0 ? Math.round((totals.grossProfit / totals.grossSales) * 100) : 0}%`}
          accent
        />
      </div>

      {rows.length === 0 ? (
        <div className="bg-[var(--surface-2)] rounded-[var(--radius)] p-10 text-center">
          <p className="text-[13px] text-[var(--ink-text-faint)]">No sales in this period.</p>
        </div>
      ) : (
        <>
          <div className="bg-[var(--surface-2)] rounded-[var(--radius)] p-5 mb-6">
            <div className="flex items-end gap-1 h-32">
              {rows.map((r) => (
                <div key={r.date} className="flex-1 flex flex-col items-center justify-end gap-1 group relative">
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
            <div className="grid grid-cols-4 px-4.5 py-2.5 text-[11px] uppercase tracking-wide text-[var(--ink-text-muted)] border-b border-[var(--line)] min-w-[560px]">
              <span>Date</span>
              <span className="text-right">Gross sales</span>
              <span className="text-right">Cost of goods</span>
              <span className="text-right">Gross profit</span>
            </div>
            {rows.slice().reverse().map((r, i) => (
              <div
                key={r.date}
                className={`grid grid-cols-4 px-4.5 py-2.5 text-[13px] items-center min-w-[560px] ${
                  i !== rows.length - 1 ? 'border-b border-[var(--line)]' : ''
                }`}
              >
                <span className="font-[var(--font-mono)] text-[var(--ink-text-muted)]">
                  {new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </span>
                <span className="text-right font-[var(--font-mono)]">{naira(r.grossSales)}</span>
                <span className="text-right font-[var(--font-mono)] text-[var(--ink-text-muted)]">{naira(r.costOfGoods)}</span>
                <span className="text-right font-[var(--font-mono)] text-[var(--success)]">{naira(r.grossProfit)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="text-[12px] text-[var(--ink-text-faint)] mt-4">
        Refunds and discounts aren't tracked yet \u2014 gross sales currently equals net sales. Worth
        adding once the refund workflow exists.
      </p>
    </div>
  )
}
