import { cn } from '@/lib/utils'

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-[var(--radius)] bg-[var(--surface-3)] border border-[var(--line-strong)]',
        'px-3 text-[14px] text-[var(--ink-text)] placeholder:text-[var(--ink-text-faint)]',
        'focus:outline-none focus:ring-2 focus:ring-[var(--violet-bright)] focus:border-transparent',
        'transition-shadow duration-150',
        className
      )}
      {...props}
    />
  )
}

export function Label({ className, children, ...props }) {
  return (
    <label
      className={cn('block text-[13px] text-[var(--ink-text-muted)] mb-1.5', className)}
      {...props}
    >
      {children}
    </label>
  )
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        'h-10 w-full rounded-[var(--radius)] bg-[var(--surface-3)] border border-[var(--line-strong)]',
        'px-3 text-[14px] text-[var(--ink-text)]',
        'focus:outline-none focus:ring-2 focus:ring-[var(--violet-bright)] focus:border-transparent',
        'transition-shadow duration-150',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}
