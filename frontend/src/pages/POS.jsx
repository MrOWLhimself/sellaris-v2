import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { buildReceiptBytes, printViaBluetooth, printViaSerial } from '@/lib/printer'
import { queueSale, getAllQueuedSales, retrySale, removeSale } from '@/lib/offlineQueue'
import { syncPendingSales } from '@/lib/offlineSync'

const naira = (n) => `\u20a6${Number(n).toLocaleString('en-NG')}`

export default function POS() {
  const { staff } = useAuth()
  const [vatRate, setVatRate] = useState(0.075)
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [activeCategory, setActiveCategory] = useState('All')
  const [cart, setCart] = useState([]) // [{ id, qty }]
  const [sentToBar, setSentToBar] = useState(false)
  const [saving, setSaving] = useState(false)
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerId, setCustomerId] = useState(null)
  const [customerLookupBusy, setCustomerLookupBusy] = useState(false)
  const [printing, setPrinting] = useState(null)
  const [printError, setPrintError] = useState(null)
  const [offlineQueued, setOfflineQueued] = useState(false)
  const [queuedSales, setQueuedSales] = useState([])
  const [retrying, setRetrying] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      if (!staff.branch_id) {
        setError('No branch assigned to your account yet. Ask an owner to assign you to a store.')
        setLoading(false)
        return
      }

      const [{ data: tenant }, { data: cats, error: catErr }, { data: itms, error: itmErr }, { data: stockRows, error: stockErr }] = await Promise.all([
        supabase.from('tenants').select('vat_rate').eq('id', staff.tenant_id).maybeSingle(),
        supabase
          .from('categories')
          .select('id, name, sort_order')
          .eq('tenant_id', staff.tenant_id)
          .order('sort_order'),
        supabase
          .from('items')
          .select('id, name, price, low_stock_threshold, category_id, representation_type, color, image_url')
          .eq('tenant_id', staff.tenant_id)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('item_stock')
          .select('item_id, stock')
          .eq('branch_id', staff.branch_id),
      ])

      if (cancelled) return

      if (tenant?.vat_rate != null) setVatRate(Number(tenant.vat_rate))

      if (catErr || itmErr || stockErr) {
        setError((catErr || itmErr || stockErr).message)
      } else {
        const stockByItem = Object.fromEntries((stockRows || []).map((s) => [s.item_id, s.stock]))
        setCategories(cats || [])
        setItems((itms || []).map((i) => ({ ...i, stock: stockByItem[i.id] ?? 0 })))
      }
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [staff.tenant_id])

  async function refreshQueuedSales() {
    const all = await getAllQueuedSales()
    setQueuedSales(all.filter((s) => s.branchId === staff.branch_id))
  }

  useEffect(() => {
    refreshQueuedSales()
    const interval = setInterval(refreshQueuedSales, 5000)
    return () => clearInterval(interval)
  }, [staff.branch_id])

  async function handleRetrySale(localId) {
    setRetrying(localId)
    await retrySale(localId)
    await syncPendingSales()
    await refreshQueuedSales()
    setRetrying(null)
  }

  async function handleDismissSale(localId) {
    await removeSale(localId)
    await refreshQueuedSales()
  }

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
  const vat = Math.round(subtotal * vatRate)
  const total = subtotal + vat

  async function findOrCreateCustomer() {
    if (!customerPhone.trim()) return null
    setCustomerLookupBusy(true)

    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('tenant_id', staff.tenant_id)
      .eq('phone', customerPhone.trim())
      .maybeSingle()

    if (existing) {
      setCustomerLookupBusy(false)
      setCustomerId(existing.id)
      return existing.id
    }

    const { data: created, error: createErr } = await supabase
      .from('customers')
      .insert({ tenant_id: staff.tenant_id, name: customerPhone.trim(), phone: customerPhone.trim() })
      .select('id')
      .single()

    setCustomerLookupBusy(false)
    if (createErr) return null
    setCustomerId(created.id)
    return created.id
  }

  async function sendToBar() {
    if (cart.length === 0) return
    setSaving(true)
    setError(null)

    // Offline: skip the network entirely, queue locally. Customer
    // lookup/creation also needs the network, so it's deferred to sync time.
    if (!navigator.onLine) {
      await queueSale({
        tenantId: staff.tenant_id,
        branchId: staff.branch_id,
        tableLabel: 'Table 5',
        customerPhone: customerPhone.trim() || null,
        cartLines,
        subtotal,
        vat,
        total,
      })
      setSaving(false)
      setSentToBar(true)
      setOfflineQueued(true)
      return
    }

    try {
      const linkedCustomerId = customerId || (await findOrCreateCustomer())

      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          tenant_id: staff.tenant_id,
          branch_id: staff.branch_id,
          table_label: 'Table 5',
          status: 'sent_to_bar',
          customer_id: linkedCustomerId,
        })
        .select('id')
        .single()

      if (orderErr) throw orderErr

      const orderItems = cartLines.map((l) => ({
        order_id: order.id,
        item_id: l.id,
        qty: l.qty,
        unit_price: l.price,
        status: 'sent_to_bar',
      }))

      const { error: itemsErr } = await supabase.from('order_items').insert(orderItems)
      if (itemsErr) throw itemsErr

      setSaving(false)
      setSentToBar(true)
      setOfflineQueued(false)

      // Refresh stock levels locally to reflect the DB trigger's deduction
      const { data: refreshedStock } = await supabase
        .from('item_stock')
        .select('item_id, stock')
        .eq('branch_id', staff.branch_id)
      if (refreshedStock) {
        const stockByItem = Object.fromEntries(refreshedStock.map((s) => [s.item_id, s.stock]))
        setItems((prev) => prev.map((i) => ({ ...i, stock: stockByItem[i.id] ?? i.stock })))
      }
    } catch (e) {
      // A genuine business-rule error (e.g. insufficient stock) should
      // surface normally. A network-level failure (fetch couldn't even
      // reach the server) should fall back to the offline queue instead
      // of just failing — the connection may have dropped mid-request.
      const looksLikeNetworkFailure = e.message?.toLowerCase().includes('fetch') || !navigator.onLine
      if (looksLikeNetworkFailure) {
        await queueSale({
          tenantId: staff.tenant_id,
          branchId: staff.branch_id,
          tableLabel: 'Table 5',
          customerPhone: customerPhone.trim() || null,
          cartLines,
          subtotal,
          vat,
          total,
        })
        setSaving(false)
        setSentToBar(true)
        setOfflineQueued(true)
      } else {
        setError(e.message)
        setSaving(false)
      }
    }
  }

  function clearOrder() {
    setCart([])
    setSentToBar(false)
    setCustomerPhone('')
    setCustomerId(null)
  }

  async function handlePrint(method) {
    setPrintError(null)
    setPrinting(method)
    try {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('receipt_header, receipt_footer')
        .eq('id', staff.tenant_id)
        .maybeSingle()

      const bytes = buildReceiptBytes({
        businessName: staff.businessName || 'Sellaris',
        branchName: staff.branchName || '',
        tableLabel: 'Table 5',
        lines: cartLines,
        subtotal,
        vat,
        total,
        naira,
        header: tenant?.receipt_header,
        footer: tenant?.receipt_footer,
      })
      if (method === 'bluetooth') await printViaBluetooth(bytes)
      else await printViaSerial(bytes)
    } catch (e) {
      setPrintError(e.message)
    } finally {
      setPrinting(null)
    }
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
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[1.4fr_1fr] gap-0 -m-7 min-h-[720px]">
      <div className="p-7 border-r border-[var(--line)]">
        <h1 className="font-[var(--font-display)] text-[18px] font-medium">Table 5</h1>
        <p className="text-[13px] text-[var(--ink-text-muted)] mt-1 mb-5">
          {staff.branchName || 'Main branch'}
        </p>

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
              const hasImage = item.representation_type === 'image' && item.image_url
              const swatchColor = item.color || '#5B3FA6'
              return (
                <button
                  key={item.id}
                  onClick={() => !outOfStock && addItem(item)}
                  disabled={outOfStock}
                  className={`text-left bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--radius)] overflow-hidden transition-colors ${
                    outOfStock
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:border-[var(--violet-bright)]'
                  }`}
                >
                  {hasImage ? (
                    <img src={item.image_url} alt="" className="w-full h-16 object-cover" />
                  ) : (
                    <div
                      className="w-full h-16 flex items-center justify-center text-[20px] font-[var(--font-display)] font-medium text-white/90"
                      style={{ backgroundColor: swatchColor }}
                    >
                      {item.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="p-3">
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

        <input
          type="tel"
          value={customerPhone}
          onChange={(e) => { setCustomerPhone(e.target.value); setCustomerId(null) }}
          placeholder="Customer phone (optional \u2014 for loyalty points)"
          className="h-9 w-full rounded-[var(--radius)] bg-[var(--surface-3)] border border-[var(--line-strong)] px-3 text-[12.5px] text-[var(--ink-text)] placeholder:text-[var(--ink-text-faint)] mb-4 focus:outline-none focus:ring-2 focus:ring-[var(--violet-bright)]"
        />

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
            <span>VAT ({(vatRate * 100).toFixed(1)}%)</span>
            <span className="font-[var(--font-mono)]">{naira(vat)}</span>
          </div>
          <div className="flex justify-between font-[var(--font-display)] text-[24px] font-medium mt-2 pt-2.5 border-t border-[var(--line)]">
            <span>Total</span>
            <span>{naira(total)}</span>
          </div>

          {sentToBar ? (
            <div className="mt-4">
              <div className={`text-[13px] rounded-[var(--radius)] px-4 py-3 text-center mb-2 ${offlineQueued ? 'bg-[var(--warning-bg)] text-[var(--warning)]' : 'bg-[var(--success-bg)] text-[var(--success)]'}`}>
                {offlineQueued ? 'Saved offline \u2014 will sync when back online' : 'Sent to bar \u2014 saved to database'}
              </div>
              {printError && <p className="text-[12px] text-[var(--danger)] mb-2">{printError}</p>}
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" disabled={printing} onClick={() => handlePrint('bluetooth')}>
                  {printing === 'bluetooth' ? 'Printing\u2026' : 'Print (Bluetooth)'}
                </Button>
                <Button variant="secondary" className="flex-1" disabled={printing} onClick={() => handlePrint('serial')}>
                  {printing === 'serial' ? 'Printing\u2026' : 'Print (Cable)'}
                </Button>
              </div>
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

          {queuedSales.length > 0 && (
            <div className="mt-5 pt-4 border-t border-[var(--line)]">
              <div className="text-[11px] uppercase tracking-wide text-[var(--ink-text-muted)] mb-2">
                Offline queue ({queuedSales.length})
              </div>
              {queuedSales.map((s) => (
                <div key={s.localId} className="bg-[var(--surface-3)] rounded-[var(--radius-sm)] p-3 mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[12px] font-[var(--font-mono)]">{naira(s.total)}</span>
                    <Badge tone={s.status === 'failed' ? 'danger' : 'warning'}>
                      {s.status === 'failed' ? 'Failed' : 'Pending sync'}
                    </Badge>
                  </div>
                  {s.errorMessage && (
                    <p className="text-[11px] text-[var(--danger)] mb-2">{s.errorMessage}</p>
                  )}
                  {s.status === 'failed' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" disabled={retrying === s.localId} onClick={() => handleRetrySale(s.localId)}>
                        {retrying === s.localId ? 'Retrying\u2026' : 'Retry'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDismissSale(s.localId)}>Discard</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
