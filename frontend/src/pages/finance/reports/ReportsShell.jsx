import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/finance/reports', label: 'Sales summary', end: true },
  { to: '/finance/reports/by-item', label: 'Sales by item' },
  { to: '/finance/reports/by-category', label: 'Sales by category' },
  { to: '/finance/reports/by-employee', label: 'Sales by employee' },
  { to: '/finance/reports/by-payment-type', label: 'Sales by payment type' },
  { to: '/finance/reports/discounts', label: 'Discounts' },
  { to: '/finance/reports/taxes', label: 'Taxes' },
]

export default function ReportsShell() {
  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-[var(--line)] overflow-x-auto">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `px-3 py-2.5 text-[12.5px] border-b-2 -mb-px transition-colors whitespace-nowrap ${
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
