import { cn } from '@/lib/utils'

/*
  Status pills — settled/pending orders, stock levels, plan tiers.
  Keep to functional colors (success/warning/danger/info), never brand
  violet/gold here — those are reserved for actions and key numbers.
*/
const tones = {
  success: 'bg-[var(--success-bg)] text-[var(--success)]',
  warning: 'bg-[var(--warning-bg)] text-[var(--warning)]',
  danger: 'bg-[var(--danger-bg)] text-[var(--danger)]',
  info: 'bg-[var(--info-bg)] text-[var(--info)]',
  neutral: 'bg-[var(--surface-3)] text-[var(--ink-text-muted)]',
}

export function Badge({ tone = 'neutral', children, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-[var(--font-mono)] text-[10.5px] px-2 py-1 rounded-full w-fit',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
