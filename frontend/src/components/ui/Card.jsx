import { cn } from '@/lib/utils'

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--radius-lg)] p-5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/*
  MetricCard — the small stat tiles used across dashboards
  (today's till, gross profit, open tabs, low stock count).
  `trend` is optional: 'up' | 'down' | undefined.
*/
export function MetricCard({ label, value, trend, accent = false, className }) {
  const trendColor =
    trend === 'up'
      ? 'text-[var(--success)]'
      : trend === 'down'
        ? 'text-[var(--danger)]'
        : 'text-[var(--ink-text)]'

  return (
    <div
      className={cn(
        'bg-[var(--surface-2)] rounded-[var(--radius)] p-4',
        accent && 'border-l-2 border-[var(--violet-dim)]',
        className
      )}
    >
      <div className="text-[12px] text-[var(--ink-text-muted)] mb-1.5">{label}</div>
      <div className={cn('font-[var(--font-display)] text-[22px] font-medium', trendColor)}>
        {trend === 'up' && <span className="text-[13px] mr-0.5">↑</span>}
        {trend === 'down' && <span className="text-[13px] mr-0.5">↓</span>}
        {value}
      </div>
    </div>
  )
}
