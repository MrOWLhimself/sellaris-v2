import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { MetricCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { RunningTotalStrip } from '@/components/ui/RunningTotalStrip'
import { Table, TableHead, TableRow } from '@/components/ui/Table'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

const naira = (n) => `\u20a6${Number(n).toLocaleString('en-NG')}`

const orderColumns = [
  { key: 'item', label: 'Item', width: '2fr' },
  { key: 'qty', label: 'Qty', width: '80px', numeric: true },
  { key: 'total', label: 'Total', width: '110px', numeric: true },
  {
    key: 'status',
    label: 'Status',
    width: '110px',
    render: (row) => (
      <Badge tone={row.status === 'settled' ? 'success' : row.status === 'sent_to_bar' ? 'info' : 'warning'}>
        {row.status === 'settled' ? 'Settled' : row.status === 'sent_to_bar' ? 'At bar' : row.status}
      </Badge>
    ),
  },
]

export default function Dashboard() {
  const { staff } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [todaysTill, setTodaysTill] = useState(0)
  const [grossProfitToday, setGrossProfitToday] = useState(0)
  const [openTabs, setOpenTabs] = useState(0)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [recentOrders, setRecentOrders] = useState([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const [{ data: todaysItems }, { data: openOrders }, { data: lowStock }, { data: recent }] = await Promise.all([
        supabase
          .from('order_items')
          .select('qty, unit_price, unit_cost, orders!inner(tenant_id)')
          .eq('orders.tenant_id', staff.tenant_id)
          .gte('created_at', todayStart.toISOString()),
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', staff.tenant_id)
          .in('status', ['open', 'sent_to_bar']),
        supabase.rpc('get_low_stock_items', { p_tenant_id: staff.tenant_id }),
        supabase
          .from('orders')
          .select('id, table_label, status, order_items(qty, unit_price, items(name))')
          .eq('tenant_id', staff.tenant_id)
          .order('opened_at', { ascending: false })
          .limit(4),
      ])

      if (cancelled) return

      const till = (todaysItems || []).reduce((s, r) => s + r.qty * r.unit_price, 0)
      const profit = (todaysItems || []).reduce((s, r) => s + r.qty * (r.unit_price - (r.unit_cost || 0)), 0)
      setTodaysTill(till)
      setGrossProfitToday(profit)
      setOpenTabs(openOrders?.length ?? 0)
      setLowStockCount((lowStock || []).length)

      const flattened = (recent || []).flatMap((o) =>
        o.order_items.map((oi) => ({
          item: oi.items?.name || 'Item',
          qty: oi.qty,
          total: naira(oi.qty * oi.unit_price),
          status: o.status,
        }))
      )
      setRecentOrders(flattened.slice(0, 6))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [staff.tenant_id])

  return (
    <>
      <div className="flex items-start justify-between pb-5 mb-6 border-b border-[var(--line)]">
        <div>
          <h1 className="font-[var(--font-display)] text-[22px] font-medium">
            Good evening, {staff?.name || 'there'}
          </h1>
          <p className="text-[13px] text-[var(--ink-text-muted)] mt-1">
            {staff?.businessName || 'Your business'}
            {staff?.branchName ? ` \u2014 ${staff.branchName}` : ''}
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/pos')}>New sale</Button>
      </div>

      {loading ? (
        <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>
      ) : (
        <>
          <div className="mb-6">
            <RunningTotalStrip label="Today's till" value={naira(todaysTill)} />
          </div>

          <div className="grid grid-cols-3 gap-3.5 mb-7">
            <MetricCard label="Gross profit today" value={naira(grossProfitToday)} trend={grossProfitToday >= 0 ? 'up' : 'down'} accent />
            <MetricCard label="Open bar tabs" value={openTabs} accent />
            <MetricCard label="Low stock alerts" value={lowStockCount} accent />
          </div>

          <div className="text-[12px] uppercase tracking-wide text-[var(--ink-text-muted)] mb-3">
            Recent orders
          </div>
          {recentOrders.length === 0 ? (
            <div className="bg-[var(--surface-2)] rounded-[var(--radius)] p-8 text-center">
              <p className="text-[13px] text-[var(--ink-text-faint)]">No orders yet \u2014 make your first sale on POS.</p>
            </div>
          ) : (
            <Table>
              <TableHead columns={orderColumns} />
              {recentOrders.map((row, i) => (
                <TableRow key={i} columns={orderColumns} row={row} isLast={i === recentOrders.length - 1} />
              ))}
            </Table>
          )}

          <div className="flex gap-2 mt-6">
            <Button variant="secondary" onClick={() => navigate('/finance/reports')}>View reports</Button>
            <Button variant="ghost" onClick={() => navigate('/finance')}>View all orders</Button>
          </div>
        </>
      )}
    </>
  )
}
