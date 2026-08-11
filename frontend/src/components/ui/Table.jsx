import { cn } from '@/lib/utils'

/*
  Ledger-style table — used for orders, inventory, reports.
  Bordered rows, not cards (dense data reads better this way).
  Numeric columns should use font-[var(--font-mono)] for alignment.
*/

export function Table({ children, className }) {
  return (
    <div className={cn('bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden', className)}>
      {children}
    </div>
  )
}

export function TableHead({ columns }) {
  return (
    <div className="grid px-4.5 py-2.5 text-[11px] uppercase tracking-wide text-[var(--ink-text-muted)] border-b border-[var(--line)]"
      style={{ gridTemplateColumns: columns.map((c) => c.width || '1fr').join(' ') }}
    >
      {columns.map((c) => (
        <span key={c.key} className={c.align === 'right' ? 'text-right' : ''}>
          {c.label}
        </span>
      ))}
    </div>
  )
}

export function TableRow({ columns, row, isLast }) {
  return (
    <div
      className={cn(
        'grid px-4.5 py-3 text-[13px] items-center',
        !isLast && 'border-b border-[var(--line)]'
      )}
      style={{ gridTemplateColumns: columns.map((c) => c.width || '1fr').join(' ') }}
    >
      {columns.map((c) => (
        <span
          key={c.key}
          className={cn(
            c.numeric && 'font-[var(--font-mono)] text-[var(--ink-text-muted)]',
            c.align === 'right' && 'text-right'
          )}
        >
          {c.render ? c.render(row) : row[c.key]}
        </span>
      ))}
    </div>
  )
}
