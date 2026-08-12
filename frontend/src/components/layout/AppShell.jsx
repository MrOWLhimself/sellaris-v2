import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { Badge } from '@/components/ui/Badge'

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/pos', label: 'POS / Till' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/bar-flow', label: 'Bar flow' },
  { to: '/finance', label: 'Finance' },
  { to: '/customers', label: 'Customers' },
  { to: '/staff', label: 'Staff' },
  { to: '/settings', label: 'Settings' },
]

export function AppShell() {
  const { staff, signOut } = useAuth()
  const { isOnline, pending, failedCount } = useOfflineSync()

  return (
    <div className="min-h-screen p-6 md:p-10">
      {!isOnline && (
        <div className="max-w-[1280px] mx-auto mb-3 bg-[var(--warning-bg)] text-[var(--warning)] text-[13px] rounded-[var(--radius)] px-4 py-2.5 flex items-center justify-between">
          <span>You're offline \u2014 sales at the till will save locally and sync automatically once you're back online.</span>
          {pending > 0 && <Badge tone="warning">{pending} pending</Badge>}
        </div>
      )}
      {isOnline && pending > 0 && (
        <div className="max-w-[1280px] mx-auto mb-3 bg-[var(--info-bg)] text-[var(--info)] text-[13px] rounded-[var(--radius)] px-4 py-2.5">
          Syncing {pending} offline sale{pending > 1 ? 's' : ''}\u2026
        </div>
      )}
      {failedCount > 0 && (
        <div className="max-w-[1280px] mx-auto mb-3 bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] rounded-[var(--radius)] px-4 py-2.5">
          {failedCount} offline sale{failedCount > 1 ? 's' : ''} couldn't sync \u2014 check POS to review.
        </div>
      )}

      <div className="max-w-[1280px] mx-auto grid grid-cols-[220px_1fr] rounded-2xl overflow-hidden border border-[var(--line)] min-h-[720px]">
        <aside className="bg-[#0F0D1A] p-4 border-r border-[var(--line)] flex flex-col">
          <div className="font-[var(--font-display)] text-[20px] font-semibold px-2 mb-8 flex items-center justify-between">
            <span>Sell<span className="text-[var(--violet-bright)]">aris</span></span>
            <span
              className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`}
              title={isOnline ? 'Online' : 'Offline'}
            />
          </div>
          <nav className="flex flex-col gap-0.5 flex-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `px-3 py-2.5 rounded-[var(--radius-sm)] text-[13.5px] flex items-center gap-2.5 transition-colors ${
                    isActive
                      ? 'bg-[var(--violet-dim)]/30 text-[var(--ink-text)] font-medium border-l-2 border-[var(--violet-bright)] -ml-px pl-[10px]'
                      : 'text-[var(--ink-text-muted)] hover:text-[var(--ink-text)] hover:bg-[var(--surface-2)]'
                  }`
                }
              >
                {({ isActive }) =>
                  !isActive ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink-text-muted)]" />
                      {item.label}
                    </>
                  ) : (
                    item.label
                  )
                }
              </NavLink>
            ))}
          </nav>
          {staff && (
            <div className="pt-3 border-t border-[var(--line)]">
              <div className="px-2 mb-2">
                <div className="text-[13px] font-medium truncate">{staff.name}</div>
                <div className="text-[11px] text-[var(--ink-text-muted)] capitalize">{staff.role}</div>
              </div>
              <button
                onClick={signOut}
                className="w-full text-left px-2 py-1.5 rounded-[var(--radius-sm)] text-[12.5px] text-[var(--ink-text-muted)] hover:text-[var(--ink-text)] hover:bg-[var(--surface-2)]"
              >
                Sign out
              </button>
            </div>
          )}
        </aside>

        <main className="bg-[var(--surface)] p-7 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
