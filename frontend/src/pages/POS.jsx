import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

const VAT_RATE = 0.075
const naira = (n) => `\u20a6${Number(n).toLocaleString('en-NG')}`

export default function POS() {
  const { staff } = useAuth()
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [activeCategory, setActiveCategory] = useState('All')
  const [cart, setCart] = useState([]) // [{ id, qty }]
  const [sentToBar, setSentToBar] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const [{ data: cats, error: catErr }, { data: itms, error: itmErr }] = await Promise.all([
        supabase
          .from('categories')
          .select('id, name, sort_order')
          .eq('tenant_id', staff.tenant_id)
          .order('sort_order'),
        supabase
          .from('items')
          .select('id, name, price, stock, low_stock_threshold, category_id')
          .eq('tenant_id', staff.tenant_id)
          .order('name'),
      ])

      if (cancelled) return

      if (catErr || itmErr) {
        setError((catErr || itmErr).message)
      } else {
        setCategories(cats || [])
        setItems(itms || [])
      }
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [staff.tenant_id])

  const categoryNames = useMemo(() => ['All', ...categories.map((c) => c.name)], [categories])

  const visibleItems = useMemo(() => {
    if (activeCategory === 'All') return items
    const cat = categories.find((c) => c.name === activeCategory)
    return items.filter((i) => i.category_id === cat?.id)
  }, [activeCategory, items, categories])

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
      prev.map((c) => (c.id === id ? { ...c, qty: c.qty + delta } : c)).filter((c) => c.qty > 0)
    )
  }

  const cartLines = cart.map((c) => {
    const item = items.find((m) => m.id === c.id)
    return { ...item, qty: c.qty, lineTotal: item.price * c.qty }
  })

  const subtotal = cartLines.reduce((sum, l) => sum + l.lineTotal, 0)
  const vat = Math.round(subtotal * VAT_RATE)
  const total = subtotal + vat

  async function sendToBar() {
    if (cart.length === 0) return
    setSaving(true)
    setError(null)

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        tenant_id: staff.tenant_id,
        branch_id: staff.branch_id,
        table_label: 'Table 5',
        status: 'sent_to_bar',
      })
      .select('id')
      .single()

    if (orderErr) {
      setError(orderErr.message)
      setSaving(false)
      return
    }

    const orderItems = cartLines.map((l) => ({
      order_id: order.id,
      item_id: l.id,
      qty: l.qty,
      unit_price: l.price,
      status: 'sent_to_bar',
    }))

    const { error: itemsErr } = await supabase.from('order_items').insert(orderItems)

    setSaving(false)

    if (itemsErr) {
      setError(itemsErr.message)
      return
    }

    setSentToBar(true)
    // Refresh stock levels locally to reflect the DB trigger's deduction
    const { data: refreshed } = await supabase
      .from('items')
      .select('id, name, price, stock, low_stock_threshold, category_id')
      .eq('tenant_id', staff.tenant_id)
      .order('name')
    if (refreshed) setItems(refreshed)
  }

  function clearOrder() {
    setCart([])
    setSentToBar(false)
  }

  if (loading) {
    return (
      <div className="h-full min-h-[500px] flex items-center justify-center text-[13px] text-[var(--ink-text-muted)]">
        Loading menu\u2026
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center gap-2">
        <p className="text-[13px] text-[var(--danger)] max-w-[360px]">{error}</p>
        <p className="text-[12px] text-[var(--ink-text-muted)] max-w-[360px]">
          If this says permission denied, it's because row-level security is scoped to logged-in
          staff and there's no auth session yet \u2014 that's next on the build.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[1.4fr_1fr] gap-0 -m-7 min-h-[720px]">
      <div className="p-7 border-r border-[var(--line)]">
        <h1 className="font-[var(--font-display)] text-[18px] font-medium">Table 5</h1>
        <p className="text-[13px] text-[var(--ink-text-muted)] mt-1 mb-5">Ijagun branch</p>

        <div className="flex gap-2 mb-5 flex-wrap">
          {categoryNames.map((cat) => (
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

        {visibleItems.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-text-faint)]">No items in this category yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {visibleItems.map((item) => {
              const outOfStock = item.stock <= 0
              return (
                <button
                  key={item.id}
                  onClick={() => !outOfStock && addItem(item)}
                  disabled={outOfStock}
                  className={`text-left bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--radius)] p-3.5 transition-colors ${
                    outOfStock
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:border-[var(--violet-bright)]'
                  }`}
                >
                  <div className="text-[13px] font-medium mb-1.5">{item.name}</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-[var(--font-mono)] text-[13px] text-[var(--gold)]">
                      {naira(item.price)}
                    </span>
                    {outOfStock ? (
                      <Badge tone="danger">Out of stock</Badge>
                    ) : item.stock <= item.low_stock_threshold ? (
                      <Badge tone="warning">{item.stock} left</Badge>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

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
              Sent to bar \u2014 saved to database
            </div>
          ) : (
            <Button
              variant="primary"
              size="lg"
              className="w-full mt-4"
              disabled={cart.length === 0 || saving}
              onClick={sendToBar}
            >
              {saving ? 'Sending\u2026' : 'Send to bar \u2192'}
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
