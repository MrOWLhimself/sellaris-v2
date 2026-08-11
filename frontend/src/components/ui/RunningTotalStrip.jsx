/*
  Signature element. A live-updating total with a pulse dot —
  used on POS till (today's sales) and Super Admin (live MRR/GMV).
  This is the one bold, memorable UI moment — everything else in the
  design system stays quiet around it.
*/
export function RunningTotalStrip({ label, value, live = true }) {
  return (
    <div className="bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--radius)] px-5 py-3.5 flex items-baseline gap-3">
      {live && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75 animate-ping" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
        </span>
      )}
      <span className="font-[var(--font-mono)] text-[11px] uppercase tracking-wide text-[var(--ink-text-muted)]">
        {label}
      </span>
      <span className="font-[var(--font-display)] text-[28px] font-medium text-[var(--gold)]">
        {value}
      </span>
    </div>
  )
}
