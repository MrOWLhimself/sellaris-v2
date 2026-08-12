import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Badge } from '@/components/ui/Badge'

const COLUMNS = [
  { status: 'sent_to_bar', label: 'New orders', next: 'preparing', nextLabel: 'Start preparing' },
  { status: 'preparing', label: 'Preparing', next: 'ready', nextLabel: 'Mark ready' },
  { status: 'ready', label: 'Ready to serve', next: 'served', nextLabel: 'Mark served' },
]

export default function BarFlow() {
  const { staff } = useAuth()
  const [orderItems, setOrderItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('order_items')
      .select('id, qty, status, created_at, items(name), orders!inner(id, table_label, tenant_id)')
      .eq('orders.tenant_id', staff.tenant_id)
      .in('status', ['sent_to_bar', 'preparing', 'ready'])
      .order('created_at')

    if (error) setError(error.message)
    else setOrderItems(data || [])
    setLoading(false)
  }, [staff.tenant_id])

  useEffect(() => {
    load()
    // Poll every 5s so waiters/barmen see updates without a manual refresh
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [load])

  async function advance(id, nextStatus) {
    setOrderItems((prev) => prev.map((oi) => (oi.id === id ? { ...oi, status: nextStatus } : oi)))
    const { error } = await supabase.from('order_items').update({ status: nextStatus }).eq('id', id)
    if (error) {
      setError(error.message)
      load()
    }
  }

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="font-[var(--font-display)] text-[20px] font-medium mb-1">Bar flow</h1>
          <p className="text-[13px] text-[var(--ink-text-muted)]">
            Orders move left to right as they're prepared. Updates every 5 seconds.
          </p>
        </div>
      </div>

      {error && <p className="text-[13px] text-[var(--danger)] mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const items = orderItems.filter((oi) => oi.status === col.status)
          return (
            <div key={col.status}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] uppercase tracking-wide text-[var(--ink-text-muted)]">{col.label}</span>
                <Badge tone="neutral">{items.length}</Badge>
              </div>
              <div className="flex flex-col gap-2">
                {items.length === 0 && (
                  <div className="text-[12px] text-[var(--ink-text-faint)] bg-[var(--surface-2)] rounded-[var(--radius)] p-4 text-center">
                    Nothing here
                  </div>
                )}
                {items.map((oi) => (
                  <div key={oi.id} className="bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--radius)] p-3.5">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[13px] font-medium">{oi.items?.name}</span>
                      <span className="font-[var(--font-mono)] text-[12px] text-[var(--ink-text-muted)]">\u00d7{oi.qty}</span>
                    </div>
                    <div className="text-[11px] text-[var(--ink-text-muted)] mb-3">{oi.orders?.table_label}</div>
                    <button
                      onClick={() => advance(oi.id, col.next)}
                      className="w-full text-[12px] py-1.5 rounded-[var(--radius-sm)] bg-[var(--violet)] text-[var(--ink-text)] hover:bg-[var(--violet-bright)] transition-colors"
                    >
                      {col.nextLabel} &rarr;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
