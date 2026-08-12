import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/finance', label: 'Payments', end: true },
  { to: '/finance/reports', label: 'Reports' },
  { to: '/finance/expenses', label: 'Expenses' },
  { to: '/finance/profit-loss', label: 'Profit & Loss' },
]

export default function FinanceShell() {
  return (
    <div>
      <h1 className="font-[var(--font-display)] text-[20px] font-medium mb-4">Finance</h1>
      <div className="flex gap-1 mb-6 border-b border-[var(--line)]">
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
