import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { categories, menuItems, VAT_RATE } from '@/data/menu'

const naira = (n) => `\u20a6${n.toLocaleString('en-NG')}`

export default function POS() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [cart, setCart] = useState([]) // [{ id, qty }]
  const [sentToBar, setSentToBar] = useState(false)

  const visibleItems = useMemo(
    () =>
      activeCategory === 'All'
        ? menuItems
        : menuItems.filter((i) => i.category === activeCategory),
    [activeCategory]
  )

  function addItem(item) {
    setSentToBar(false)
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id)
      if (existing) {
        return prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c))
      }
      return [...prev, { id: item.id, qty: 1 }]
    })
  }

  function changeQty(id, delta) {
    setSentToBar(false)
    setCart((prev) =>
      prev
        .map((c) => (c.id === id ? { ...c, qty: c.qty + delta } : c))
        .filter((c) => c.qty > 0)
    )
  }

  const cartLines = cart.map((c) => {
    const item = menuItems.find((m) => m.id === c.id)
    return { ...item, qty: c.qty, lineTotal: item.price * c.qty }
  })

  const subtotal = cartLines.reduce((sum, l) => sum + l.lineTotal, 0)
  const vat = Math.round(subtotal * VAT_RATE)
  const total = subtotal + vat

  function sendToBar() {
    if (cart.length === 0) return
    setSentToBar(true)
  }

  function clearOrder() {
    setCart([])
    setSentToBar(false)
  }

  return (
    <div className="grid grid-cols-[1.4fr_1fr] gap-0 -m-7 min-h-[720px]">
      {/* Product side */}
      <div className="p-7 border-r border-[var(--line)]">
        <h1 className="font-[var(--font-display)] text-[18px] font-medium">Table 5</h1>
        <p className="text-[13px] text-[var(--ink-text-muted)] mt-1 mb-5">4 seats &mdash; opened 8:42pm</p>

        <div className="flex gap-2 mb-5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] transition-colors ${
                activeCategory === cat
                  ? 'bg-[var(--violet)] text-[var(--ink-text)]'
                  : 'bg-[var(--surface-2)] text-[var(--ink-text-muted)] hover:text-[var(--ink-text)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {visibleItems.map((item) => (
            <button
              key={item.id}
              onClick={() => addItem(item)}
              className="text-left bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--radius)] p-3.5 hover:border-[var(--violet-bright)] transition-colors"
            >
              <div className="text-[13px] font-medium mb-1.5">{item.name}</div>
              <div className="flex items-center justify-between">
                <span className="font-[var(--font-mono)] text-[13px] text-[var(--gold)]">
                  {naira(item.price)}
                </span>
                {item.stock <= 10 && (
                  <Badge tone="warning">{item.stock} left</Badge>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Order side */}
      <div className="p-7 bg-[var(--surface-2)] flex flex-col">
        <div className="text-[12px] uppercase tracking-wide text-[var(--ink-text-muted)] mb-3.5">
          Order
        </div>

        {cartLines.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[13px] text-[var(--ink-text-faint)] text-center max-w-[180px]">
              Tap an item to add it to this order.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            {cartLines.map((line) => (
              <div
                key={line.id}
                className="flex items-center justify-between py-2.5 border-b border-[var(--line)] text-[13.5px]"
              >
                <div className="flex-1">
                  <div>{line.name}</div>
                  <div className="font-[var(--font-mono)] text-[12px] text-[var(--ink-text-muted)]">
                    {naira(line.price)} each
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => changeQty(line.id, -1)}
                    className="w-6 h-6 rounded-full bg-[var(--surface-3)] text-[var(--ink-text-muted)] hover:text-[var(--ink-text)] flex items-center justify-center"
                    aria-label={`Remove one ${line.name}`}
                  >
                    &minus;
                  </button>
                  <span className="font-[var(--font-mono)] text-[13px] w-4 text-center">{line.qty}</span>
                  <button
                    onClick={() => changeQty(line.id, 1)}
                    className="w-6 h-6 rounded-full bg-[var(--surface-3)] text-[var(--ink-text-muted)] hover:text-[var(--ink-text)] flex items-center justify-center"
                    aria-label={`Add one ${line.name}`}
                  >
                    +
                  </button>
                  <span className="font-[var(--font-mono)] text-[13px] w-16 text-right">
                    {naira(line.lineTotal)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 mt-4 border-t border-[var(--line)]">
          <div className="flex justify-between text-[13px] text-[var(--ink-text-muted)] mb-2">
            <span>Subtotal</span>
            <span className="font-[var(--font-mono)]">{naira(subtotal)}</span>
          </div>
          <div className="flex justify-between text-[13px] text-[var(--ink-text-muted)] mb-2">
            <span>VAT (7.5%)</span>
            <span className="font-[var(--font-mono)]">{naira(vat)}</span>
          </div>
          <div className="flex justify-between font-[var(--font-display)] text-[24px] font-medium mt-2 pt-2.5 border-t border-[var(--line)]">
            <span>Total</span>
            <span>{naira(total)}</span>
          </div>

          {sentToBar ? (
            <div className="mt-4 bg-[var(--success-bg)] text-[var(--success)] text-[13px] rounded-[var(--radius)] px-4 py-3 text-center">
              Sent to bar &mdash; waiting for barman
            </div>
          ) : (
            <Button
              variant="primary"
              size="lg"
              className="w-full mt-4"
              disabled={cart.length === 0}
              onClick={sendToBar}
            >
              Send to bar &rarr;
            </Button>
          )}

          {cart.length > 0 && (
            <Button variant="ghost" size="sm" className="w-full mt-2" onClick={clearOrder}>
              Clear order
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
