import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { MetricCard } from '@/components/ui/Card'
import { DateRangePicker, daysAgo } from '@/components/ui/DateRangePicker'

const naira = (n) => `\u20a6${Number(n).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

export default function Taxes() {
  const { staff } = useAuth()
  const [from, setFrom] = useState(daysAgo(29))
  const [to, setTo] = useState(daysAgo(0))
  const [vatRate, setVatRate] = useState(0.075)
  const [taxableSales, setTaxableSales] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [{ data: tenant }, { data: orders }] = await Promise.all([
        supabase.from('tenants').select('vat_rate').eq('id', staff.tenant_id).maybeSingle(),
        supabase
          .from('orders')
          .select('discount_type, discount_value, order_items(qty, unit_price)')
          .eq('tenant_id', staff.tenant_id)
          .eq('status', 'settled')
          .gte('closed_at', `${from}T00:00:00`)
          .lte('closed_at', `${to}T23:59:59`),
      ])

      if (cancelled) return
      if (tenant?.vat_rate) setVatRate(Number(tenant.vat_rate))

      const taxable = (orders || []).reduce((sum, o) => {
        const subtotal = o.order_items.reduce((s, l) => s + l.qty * l.unit_price, 0)
        const discount = o.discount_type === 'percent'
          ? subtotal * (Number(o.discount_value || 0) / 100)
          : Number(o.discount_value || 0)
        return sum + (subtotal - discount)
      }, 0)

      setTaxableSales(taxable)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [staff.tenant_id, from, to])

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>

  const vatCollected = taxableSales * vatRate

  return (
    <div>
      <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      <div className="grid grid-cols-3 gap-3.5 mb-6">
        <MetricCard label="Taxable sales" value={naira(taxableSales)} accent />
        <MetricCard label={`VAT rate`} value={`${(vatRate * 100).toFixed(1)}%`} accent />
        <MetricCard label="VAT collected" value={naira(vatCollected)} trend="up" accent />
      </div>
      <p className="text-[12px] text-[var(--ink-text-faint)]">
        This is VAT collected on sales, not a filing \u2014 for the actual FIRS remittance, consult
        your accountant. PAYE and other statutory deductions aren't calculated here.
      </p>
    </div>
  )
}
