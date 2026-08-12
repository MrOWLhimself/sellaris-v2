import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { MetricCard } from '@/components/ui/Card'
import { DateRangePicker, daysAgo } from '@/components/ui/DateRangePicker'

const naira = (n) => `\u20a6${Number(n).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

export default function ProfitAndLoss() {
  const { staff } = useAuth()
  const [from, setFrom] = useState(daysAgo(29))
  const [to, setTo] = useState(daysAgo(0))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [revenue, setRevenue] = useState(0)
  const [cogs, setCogs] = useState(0)
  const [refundsTotal, setRefundsTotal] = useState(0)
  const [expensesByCategory, setExpensesByCategory] = useState([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [{ data: orderItems, error: oiErr }, { data: refunds, error: refErr }, { data: expenses, error: expErr }] =
        await Promise.all([
          supabase
            .from('order_items')
            .select('qty, unit_price, unit_cost, created_at, orders!inner(tenant_id, status)')
            .eq('orders.tenant_id', staff.tenant_id)
            .eq('orders.status', 'settled')
            .gte('created_at', `${from}T00:00:00`)
            .lte('created_at', `${to}T23:59:59`),
          supabase
            .from('refunds')
            .select('amount, created_at')
            .eq('tenant_id', staff.tenant_id)
            .gte('created_at', `${from}T00:00:00`)
            .lte('created_at', `${to}T23:59:59`),
          supabase
            .from('expenses')
            .select('amount, expense_categories(name)')
            .eq('tenant_id', staff.tenant_id)
            .gte('expense_date', from)
            .lte('expense_date', to),
        ])

      if (cancelled) return
      if (oiErr || refErr || expErr) {
        setError((oiErr || refErr || expErr).message)
        setLoading(false)
        return
      }

      const rev = (orderItems || []).reduce((s, r) => s + r.qty * r.unit_price, 0)
      const cost = (orderItems || []).reduce((s, r) => s + r.qty * (r.unit_cost || 0), 0)
      const refundSum = (refunds || []).reduce((s, r) => s + Number(r.amount), 0)

      const byCategory = {}
      for (const e of expenses || []) {
        const cat = e.expense_categories?.name || 'Uncategorized'
        byCategory[cat] = (byCategory[cat] || 0) + Number(e.amount)
      }

      setRevenue(rev)
      setCogs(cost)
      setRefundsTotal(refundSum)
      setExpensesByCategory(Object.entries(byCategory).sort((a, b) => b[1] - a[1]))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [staff.tenant_id, from, to])

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>
  if (error) return <p className="text-[13px] text-[var(--danger)]">{error}</p>

  const totalExpenses = expensesByCategory.reduce((s, [, amt]) => s + amt, 0)
  const netRevenue = revenue - refundsTotal
  const grossProfit = netRevenue - cogs
  const netProfit = grossProfit - totalExpenses

  return (
    <div>
      <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />

      <div className="grid grid-cols-2 gap-3.5 mb-6">
        <MetricCard label="Gross profit" value={naira(grossProfit)} trend={grossProfit >= 0 ? 'up' : 'down'} accent />
        <MetricCard label="Net profit" value={naira(netProfit)} trend={netProfit >= 0 ? 'up' : 'down'} accent />
      </div>

      <div className="bg-[var(--surface-2)] rounded-[var(--radius)] p-5">
        <Row label="Revenue" value={revenue} />
        <Row label="Refunds" value={-refundsTotal} indent />
        <Row label="Net revenue" value={netRevenue} bold />
        <Row label="Cost of goods sold" value={-cogs} indent />
        <Row label="Gross profit" value={grossProfit} bold divider />

        {expensesByCategory.length > 0 && (
          <>
            {expensesByCategory.map(([cat, amt]) => (
              <Row key={cat} label={cat} value={-amt} indent />
            ))}
          </>
        )}
        <Row label="Total expenses" value={-totalExpenses} indent={expensesByCategory.length === 0} />
        <Row label="Net profit" value={netProfit} bold divider large />
      </div>

      <p className="text-[12px] text-[var(--ink-text-faint)] mt-4">
        Revenue counts only settled orders in this period. PAYE and other statutory deductions
        aren't calculated here yet \u2014 this is a business P&L, not a tax filing.
      </p>
    </div>
  )
}

function Row({ label, value, indent, bold, divider, large }) {
  const isNegative = value < 0
  return (
    <div className={`flex justify-between items-center py-2 ${divider ? 'border-t border-[var(--line)] mt-2 pt-3' : ''} ${indent ? 'pl-4' : ''}`}>
      <span className={`text-[13px] ${bold ? 'font-medium text-[var(--ink-text)]' : 'text-[var(--ink-text-muted)]'}`}>{label}</span>
      <span className={`font-[var(--font-mono)] ${large ? 'text-[18px]' : 'text-[13px]'} ${bold ? 'font-medium' : ''} ${isNegative ? 'text-[var(--danger)]' : 'text-[var(--ink-text)]'}`}>
        {isNegative ? '-' : ''}\u20a6{Math.abs(value).toLocaleString('en-NG', { maximumFractionDigits: 0 })}
      </span>
    </div>
  )
}
