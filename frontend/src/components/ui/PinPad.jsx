import { useState } from 'react'

export function PinPad({ length = 4, onComplete, error, busy }) {
  const [digits, setDigits] = useState([])

  function press(d) {
    if (busy || digits.length >= length) return
    const next = [...digits, d]
    setDigits(next)
    if (next.length === length) {
      onComplete(next.join(''))
      setTimeout(() => setDigits([]), 400)
    }
  }

  function backspace() {
    setDigits((d) => d.slice(0, -1))
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-3 mb-6">
        {Array.from({ length }).map((_, i) => (
          <span
            key={i}
            className={`w-3.5 h-3.5 rounded-full border-2 ${
              i < digits.length ? 'bg-[var(--violet)] border-[var(--violet)]' : 'border-[var(--line-strong)]'
            } ${error ? 'border-[var(--danger)]' : ''}`}
          />
        ))}
      </div>
      {error && <p className="text-[13px] text-[var(--danger)] mb-4">{error}</p>}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => press(String(n))}
            disabled={busy}
            className="w-16 h-16 rounded-full bg-[var(--surface-3)] text-[18px] font-medium hover:bg-[var(--surface-2)] active:scale-95 transition-all"
          >
            {n}
          </button>
        ))}
        <span />
        <button
          type="button"
          onClick={() => press('0')}
          disabled={busy}
          className="w-16 h-16 rounded-full bg-[var(--surface-3)] text-[18px] font-medium hover:bg-[var(--surface-2)] active:scale-95 transition-all"
        >
          0
        </button>
        <button
          type="button"
          onClick={backspace}
          disabled={busy}
          className="w-16 h-16 rounded-full text-[13px] text-[var(--ink-text-muted)] hover:text-[var(--ink-text)]"
        >
          Del
        </button>
      </div>
    </div>
  )
}
