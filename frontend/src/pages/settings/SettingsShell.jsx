import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/settings', label: 'Features', end: true },
  { to: '/settings/payment-types', label: 'Payment types' },
  { to: '/settings/loyalty', label: 'Loyalty' },
  { to: '/settings/taxes', label: 'Taxes' },
  { to: '/settings/receipt', label: 'Receipt' },
  { to: '/settings/stores', label: 'Stores' },
]

export default function SettingsShell() {
  return (
    <div>
      <h1 className="font-[var(--font-display)] text-[20px] font-medium mb-4">Settings</h1>
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
