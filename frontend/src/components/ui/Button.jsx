import { cn } from '@/lib/utils'

/*
  Variants:
    primary   — violet fill. One per view/section. The single action that matters.
    secondary — bordered, transparent bg. The default for everything else.
    ghost     — no border, no bg. Low-emphasis actions (cancel, dismiss).
    danger    — red fill. Destructive actions only (delete, void sale).

  Sizes: sm (32px), md (40px, default), lg (48px, used on POS till for thumb targets).
*/

const variants = {
  // Violet always needs light text on top, regardless of the overall
  // light/dark theme — hardcoded here on purpose, not the shared
  // --ink-text token (which now correctly means "dark" for the rest
  // of the light-themed app).
  primary:
    'bg-[var(--violet)] text-[#F5F3FA] hover:bg-[var(--violet-bright)] active:scale-[0.98]',
  secondary:
    'bg-transparent border border-[var(--line-strong)] text-[var(--ink-text)] hover:bg-[var(--surface-2)] active:scale-[0.98]',
  ghost:
    'bg-transparent text-[var(--ink-text-muted)] hover:text-[var(--ink-text)] hover:bg-[var(--surface-2)]',
  danger:
    'bg-[var(--danger)] text-white hover:opacity-90 active:scale-[0.98]',
  gold:
    'bg-[var(--gold)] text-[#1B1608] hover:opacity-90 active:scale-[0.98]',
}

const sizes = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-[14px]',
  lg: 'h-12 px-5 text-[15px]',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  disabled,
  ...props
}) {
  return (
    <button
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--violet-bright)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink)]',
        disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
