import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Select, Input, Label } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

const naira = (n) => `\u20a6${Number(n).toLocaleString('en-NG')}`

export default function Payments() {
  const { staff } = useAuth()
  const [vatRate, setVatRate] = useState(0.075)
  const [openOrders, setOpenOrders] = useState([])
  const [pendingPayments, setPendingPayments] = useState([])
  const [staffDebt, setStaffDebt] = useState([])
  const [settledOrders, setSettledOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [recordingFor, setRecordingFor] = useState(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [saving, setSaving] = useState(false)
  const [refundingFor, setRefundingFor] = useState(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')

  async function loadAll() {
    setLoading(true)
    const [{ data: tenant }, { data: orders, error: ordErr }, { data: payments, error: payErr }, { data: debt, error: debtErr }, { data: settled, error: settledErr }] =
      await Promise.all([
        supabase.from('tenants').select('vat_rate').eq('id', staff.tenant_id).maybeSingle(),
        supabase
          .from('orders')
          .select('id, table_label, status, opened_at, order_items(qty, unit_price)')
          .eq('tenant_id', staff.tenant_id)
          .in('status', ['open', 'sent_to_bar'])
          .order('opened_at', { ascending: false }),
        supabase
          .from('payments')
          .select('id, amount, method, status, created_at, orders(table_label)')
          .in('order_id', await tenantOrderIds(staff.tenant_id))
          .eq('status', 'pending')
          .order('created_at'),
        supabase
          .from('staff_debt')
          .select('id, amount, reason, settled, created_at, staff(name)')
          .eq('tenant_id', staff.tenant_id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('orders')
          .select('id, table_label, closed_at, order_items(qty, unit_price), refunds(amount)')
          .eq('tenant_id', staff.tenant_id)
          .eq('status', 'settled')
          .order('closed_at', { ascending: false })
          .limit(10),
      ])

    if (tenant?.vat_rate) setVatRate(Number(tenant.vat_rate))
    if (ordErr || payErr || debtErr || settledErr) setError((ordErr || payErr || debtErr || settledErr).message)
    setSettledOrders(settled || [])
    setOpenOrders(orders || [])
    setPendingPayments(payments || [])
    setStaffDebt(debt || [])
    setLoading(false)
  }

  async function tenantOrderIds(tenantId) {
    const { data } = await supabase.from('orders').select('id').eq('tenant_id', tenantId)
    return (data || []).map((o) => o.id)
  }

  useEffect(() => { loadAll() }, [staff.tenant_id])

  function orderTotal(order) {
    const subtotal = order.order_items.reduce((s, l) => s + l.qty * l.unit_price, 0)
    return Math.round(subtotal * (1 + vatRate))
  }

  async function submitPayment(orderId) {
    if (!Number(amount) || Number(amount) <= 0) {
      setError('Enter a valid amount.')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('payments').insert({
      order_id: orderId,
      amount: Number(amount),
      method,
      status: 'pending',
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    setRecordingFor(null)
    setAmount('')
    loadAll()
  }

  async function confirmPayment(id) {
    const { error } = await supabase.from('payments').update({ status: 'confirmed', confirmed_by: staff.id }).eq('id', id)
    if (error) setError(error.message)
    else loadAll()
  }

  async function rejectPayment(id) {
    const { error } = await supabase.from('payments').update({ status: 'rejected', confirmed_by: staff.id }).eq('id', id)
    if (error) setError(error.message)
    else loadAll()
  }

  function settledOrderTotal(order) {
    const subtotal = order.order_items.reduce((s, l) => s + l.qty * l.unit_price, 0)
    const refunded = order.refunds.reduce((s, r) => s + Number(r.amount), 0)
    return Math.round(subtotal * (1 + vatRate)) - refunded
  }

  async function submitRefund(orderId) {
    if (!Number(refundAmount) || Number(refundAmount) <= 0) {
      setError('Enter a valid refund amount.')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('refunds').insert({
      tenant_id: staff.tenant_id,
      order_id: orderId,
      amount: Number(refundAmount),
      reason: refundReason,
      refunded_by: staff.id,
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    setRefundingFor(null)
    setRefundAmount('')
    setRefundReason('')
    loadAll()
  }

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>

  return (
    <div>
      {error && <p className="text-[13px] text-[var(--danger)] mb-4">{error}</p>}

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-[12px] uppercase tracking-wide text-[var(--ink-text-muted)] mb-3">
            Open tickets ({openOrders.length})
          </h2>
          <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden">
            {openOrders.length === 0 ? (
              <p className="text-[13px] text-[var(--ink-text-faint)] p-5">No open tickets.</p>
            ) : (
              openOrders.map((o, i) => (
                <div key={o.id} className={`p-4 ${i !== openOrders.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[13px] font-medium">{o.table_label}</span>
                    <span className="font-[var(--font-mono)] text-[13px] text-[var(--gold)]">{naira(orderTotal(o))}</span>
                  </div>
                  {recordingFor === o.id ? (
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label>Amount</Label>
                        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                      </div>
                      <div>
                        <Label>Method</Label>
                        <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                          <option value="cash">Cash</option>
                          <option value="transfer">Transfer</option>
                          <option value="card">Card</option>
                          <option value="pos">POS</option>
                        </Select>
                      </div>
                      <Button size="sm" variant="primary" disabled={saving} onClick={() => submitPayment(o.id)}>
                        {saving ? '\u2026' : 'Record'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRecordingFor(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => { setRecordingFor(o.id); setAmount(String(orderTotal(o))) }}>
                      Record payment
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="text-[12px] uppercase tracking-wide text-[var(--ink-text-muted)] mb-3">
            Awaiting confirmation ({pendingPayments.length})
          </h2>
          <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden mb-6">
            {pendingPayments.length === 0 ? (
              <p className="text-[13px] text-[var(--ink-text-faint)] p-5">Nothing pending.</p>
            ) : (
              pendingPayments.map((p, i) => (
                <div key={p.id} className={`flex justify-between items-center p-4 ${i !== pendingPayments.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
                  <div>
                    <div className="text-[13px] font-medium">{p.orders?.table_label}</div>
                    <div className="text-[12px] text-[var(--ink-text-muted)] capitalize">{p.method} \u2014 {naira(p.amount)}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="primary" onClick={() => confirmPayment(p.id)}>Confirm</Button>
                    <Button size="sm" variant="danger" onClick={() => rejectPayment(p.id)}>Reject</Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <h2 className="text-[12px] uppercase tracking-wide text-[var(--ink-text-muted)] mb-3">Staff debt</h2>
          <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden">
            {staffDebt.length === 0 ? (
              <p className="text-[13px] text-[var(--ink-text-faint)] p-5">No debt on record.</p>
            ) : (
              staffDebt.map((d, i) => (
                <div key={d.id} className={`flex justify-between items-center p-4 ${i !== staffDebt.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
                  <div>
                    <div className="text-[13px] font-medium">{d.staff?.name}</div>
                    <div className="text-[12px] text-[var(--ink-text-muted)]">{d.reason}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-[var(--font-mono)] text-[13px] text-[var(--danger)]">{naira(d.amount)}</span>
                    <Badge tone={d.settled ? 'success' : 'warning'}>{d.settled ? 'Settled' : 'Owing'}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <h2 className="text-[12px] uppercase tracking-wide text-[var(--ink-text-muted)] mb-3 mt-6">
        Recently settled \u2014 issue a refund
      </h2>
      <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden">
        {settledOrders.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-text-faint)] p-5">No settled orders yet.</p>
        ) : (
          settledOrders.map((o, i) => (
            <div key={o.id} className={`p-4 ${i !== settledOrders.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[13px] font-medium">{o.table_label}</span>
                <span className="font-[var(--font-mono)] text-[13px] text-[var(--gold)]">{naira(settledOrderTotal(o))}</span>
              </div>
              {refundingFor === o.id ? (
                <div className="flex gap-2 items-end mt-2">
                  <div className="flex-1">
                    <Label>Refund amount</Label>
                    <Input type="number" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <Label>Reason</Label>
                    <Input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="Optional" />
                  </div>
                  <Button size="sm" variant="danger" disabled={saving} onClick={() => submitRefund(o.id)}>
                    {saving ? '\u2026' : 'Issue refund'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRefundingFor(null)}>Cancel</Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => { setRefundingFor(o.id); setRefundAmount('') }}>
                  Issue refund
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
