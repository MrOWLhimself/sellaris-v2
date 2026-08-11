import { Button } from '@/components/ui/Button'
import { Card, MetricCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { RunningTotalStrip } from '@/components/ui/RunningTotalStrip'
import { Table, TableHead, TableRow } from '@/components/ui/Table'

const navItems = [
  { label: 'Dashboard', active: true },
  { label: 'POS / Till' },
  { label: 'Inventory' },
  { label: 'Bar flow' },
  { label: 'Finance' },
  { label: 'Customers' },
  { label: 'Staff' },
  { label: 'Settings' },
]

const orderColumns = [
  { key: 'item', label: 'Item', width: '2fr' },
  { key: 'qty', label: 'Qty', width: '80px', numeric: true },
  { key: 'total', label: 'Total', width: '110px', numeric: true },
  {
    key: 'status',
    label: 'Status',
    width: '110px',
    render: (row) => <Badge tone={row.status === 'Settled' ? 'success' : 'info'}>{row.status}</Badge>,
  },
]

const orders = [
  { item: 'Amber Star (large)', qty: 12, total: '\u20a618,000', status: 'Settled' },
  { item: 'Peppersoup \u2014 goat', qty: 4, total: '\u20a614,000', status: 'Settled' },
  { item: 'Suya platter', qty: 2, total: '\u20a67,000', status: 'Table 5' },
  { item: 'Hennessy VS (shot)', qty: 6, total: '\u20a621,000', status: 'Bar tab' },
]

export default function App() {
  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-[1180px] mx-auto grid grid-cols-[220px_1fr] rounded-2xl overflow-hidden border border-[var(--line)]">
        <aside className="bg-[#0F0D1A] p-4 border-r border-[var(--line)]">
          <div className="font-[var(--font-display)] text-[20px] font-semibold px-2 mb-8">
            Sell<span className="text-[var(--violet-bright)]">aris</span>
          </div>
          <nav className="flex flex-col gap-0.5">
            {navItems.map((item) => (
              <a
                key={item.label}
                href="#"
                className={`px-3 py-2.5 rounded-[var(--radius-sm)] text-[13.5px] flex items-center gap-2.5 ${
                  item.active
                    ? 'bg-[var(--violet-dim)]/30 text-[var(--ink-text)] font-medium border-l-2 border-[var(--violet-bright)] -ml-px pl-[10px]'
                    : 'text-[var(--ink-text-muted)] hover:text-[var(--ink-text)] hover:bg-[var(--surface-2)]'
                }`}
              >
                {!item.active && <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink-text-muted)]" />}
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <main className="bg-[var(--surface)] p-7">
          <div className="flex items-start justify-between pb-5 mb-6 border-b border-[var(--line)]">
            <div>
              <h1 className="font-[var(--font-display)] text-[22px] font-medium">
                Good evening, Roger's Lounge
              </h1>
              <p className="text-[13px] text-[var(--ink-text-muted)] mt-1">
                Tuesday, 11 August &mdash; Ijagun branch
              </p>
            </div>
            <Button variant="primary">New sale</Button>
          </div>

          <div className="mb-6">
            <RunningTotalStrip label="Today's till" value="\u20a6284,600" />
          </div>

          <div className="grid grid-cols-3 gap-3.5 mb-7">
            <MetricCard label="Gross profit today" value="\u20a696,200" trend="up" accent />
            <MetricCard label="Open bar tabs" value="7" accent />
            <MetricCard label="Low stock alerts" value="3" accent />
          </div>

          <div className="text-[12px] uppercase tracking-wide text-[var(--ink-text-muted)] mb-3">
            Recent orders
          </div>
          <Table>
            <TableHead columns={orderColumns} />
            {orders.map((row, i) => (
              <TableRow key={row.item} columns={orderColumns} row={row} isLast={i === orders.length - 1} />
            ))}
          </Table>

          <div className="flex gap-2 mt-6">
            <Button variant="secondary">Export report</Button>
            <Button variant="ghost">View all orders</Button>
          </div>
        </main>
      </div>
    </div>
  )
}
