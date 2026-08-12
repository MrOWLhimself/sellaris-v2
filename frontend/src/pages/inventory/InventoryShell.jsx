import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/inventory', label: 'Items', end: true },
  { to: '/inventory/purchase-orders', label: 'Purchase orders' },
  { to: '/inventory/transfer-orders', label: 'Transfer orders' },
  { to: '/inventory/adjustments', label: 'Adjustments' },
  { to: '/inventory/counts', label: 'Counts' },
  { to: '/inventory/production', label: 'Production' },
  { to: '/inventory/suppliers', label: 'Suppliers' },
  { to: '/inventory/history', label: 'History' },
  { to: '/inventory/valuation', label: 'Valuation' },
]

export default function InventoryShell() {
  return (
    <div>
      <h1 className="font-[var(--font-display)] text-[20px] font-medium mb-4">Inventory</h1>
      <div className="flex gap-1 mb-6 border-b border-[var(--line)] overflow-x-auto">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `px-3.5 py-2.5 text-[13px] border-b-2 -mb-px transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-[var(--violet-bright)] text-[var(--ink-text)] font-medium'
                  : 'border-transparent text-[var(--ink-text-muted)] hover:text-[var(--ink-text)]'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  )
}
