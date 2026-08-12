import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { MetricCard } from '@/components/ui/Card'

const naira = (n) => `\u20a6${Number(n).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

export default function InventoryValuation() {
  const { staff } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [{ data: items, error: itmErr }, { data: stock, error: stErr }] = await Promise.all([
        supabase.from('items').select('id, name, price, cost').eq('tenant_id', staff.tenant_id),
        supabase.from('item_stock').select('item_id, stock').eq('tenant_id', staff.tenant_id),
      ])

      if (cancelled) return
      if (itmErr || stErr) {
        setError((itmErr || stErr).message)
        setLoading(false)
        return
      }

      const totalStockByItem = {}
      for (const s of stock || []) {
        totalStockByItem[s.item_id] = (totalStockByItem[s.item_id] || 0) + Number(s.stock)
      }

      setRows(
        (items || []).map((i) => {
          const totalStock = totalStockByItem[i.id] || 0
          const inventoryValue = totalStock * i.cost
          const retailValue = totalStock * i.price
          return {
            ...i,
            totalStock,
            inventoryValue,
            retailValue,
            potentialProfit: retailValue - inventoryValue,
            margin: retailValue > 0 ? Math.round(((retailValue - inventoryValue) / retailValue) * 100) : 0,
          }
        })
      )
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [staff.tenant_id])

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>
  if (error) return <p className="text-[13px] text-[var(--danger)]">{error}</p>

  const totals = rows.reduce(
    (acc, r) => ({
      inventoryValue: acc.inventoryValue + r.inventoryValue,
      retailValue: acc.retailValue + r.retailValue,
      potentialProfit: acc.potentialProfit + r.potentialProfit,
    }),
    { inventoryValue: 0, retailValue: 0, potentialProfit: 0 }
  )
  const overallMargin = totals.retailValue > 0 ? Math.round((totals.potentialProfit / totals.retailValue) * 100) : 0

  return (
    <div>
      <div className="grid grid-cols-4 gap-3.5 mb-6">
        <MetricCard label="Total inventory value" value={naira(totals.inventoryValue)} accent />
        <MetricCard label="Total retail value" value={naira(totals.retailValue)} accent />
        <MetricCard label="Potential profit" value={naira(totals.potentialProfit)} trend="up" accent />
        <MetricCard label="Margin" value={`${overallMargin}%`} accent />
      </div>

      <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden overflow-x-auto">
        <div className="grid grid-cols-[1.5fr_90px_100px_120px_120px_120px_80px] px-4.5 py-2.5 text-[11px] uppercase tracking-wide text-[var(--ink-text-muted)] border-b border-[var(--line)] min-w-[760px]">
          <span>Item</span>
          <span className="text-right">In stock</span>
          <span className="text-right">Cost</span>
          <span className="text-right">Inv. value</span>
          <span className="text-right">Retail value</span>
          <span className="text-right">Potential profit</span>
          <span className="text-right">Margin</span>
        </div>
        {rows.map((r, i) => (
          <div
            key={r.id}
            className={`grid grid-cols-[1.5fr_90px_100px_120px_120px_120px_80px] px-4.5 py-2.5 text-[13px] items-center min-w-[760px] ${
              i !== rows.length - 1 ? 'border-b border-[var(--line)]' : ''
            }`}
          >
            <span className="font-medium">{r.name}</span>
            <span className={`text-right font-[var(--font-mono)] ${r.totalStock < 0 ? 'text-[var(--danger)]' : ''}`}>{r.totalStock}</span>
            <span className="text-right font-[var(--font-mono)] text-[var(--ink-text-muted)]">{naira(r.cost)}</span>
            <span className="text-right font-[var(--font-mono)]">{naira(r.inventoryValue)}</span>
            <span className="text-right font-[var(--font-mono)]">{naira(r.retailValue)}</span>
            <span className="text-right font-[var(--font-mono)] text-[var(--success)]">{naira(r.potentialProfit)}</span>
            <span className="text-right font-[var(--font-mono)]">{r.margin}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
