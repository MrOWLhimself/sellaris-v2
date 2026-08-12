export function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export function DateRangePicker({ from, to, onFromChange, onToChange }) {
  return (
    <div className="flex gap-3 items-end mb-6">
      <div>
        <label className="block text-[13px] text-[var(--ink-text-muted)] mb-1.5">From</label>
        <input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="h-10 rounded-[var(--radius)] bg-[var(--surface-3)] border border-[var(--line-strong)] px-3 text-[14px] text-[var(--ink-text)]"
        />
      </div>
      <div>
        <label className="block text-[13px] text-[var(--ink-text-muted)] mb-1.5">To</label>
        <input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="h-10 rounded-[var(--radius)] bg-[var(--surface-3)] border border-[var(--line-strong)] px-3 text-[14px] text-[var(--ink-text)]"
        />
      </div>
    </div>
  )
}
