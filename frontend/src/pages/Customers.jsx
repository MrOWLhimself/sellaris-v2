import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

export default function Customers() {
  const { staff } = useAuth()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, email, loyalty_points, created_at')
      .eq('tenant_id', staff.tenant_id)
      .order('created_at', { ascending: false })
    setCustomers(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [staff.tenant_id])

  async function addCustomer(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await supabase.from('customers').insert({ tenant_id: staff.tenant_id, name, phone, email })
    setSaving(false)
    setName(''); setPhone(''); setEmail('')
    setShowForm(false)
    load()
  }

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="font-[var(--font-display)] text-[20px] font-medium mb-1">Customers</h1>
          <p className="text-[13px] text-[var(--ink-text-muted)]">
            Loyalty points earn automatically \u2014 1 point per \u20a6100 spent, once an order settles.
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ Add customer'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={addCustomer} className="bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--radius)] p-5 mb-6">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bola Adeyemi" required />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="080\u2026" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <Button type="submit" variant="primary" disabled={saving} className="w-full">
            {saving ? 'Saving\u2026' : 'Save customer'}
          </Button>
        </form>
      )}

      <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden">
        {customers.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-text-faint)] p-5">No customers yet.</p>
        ) : (
          customers.map((c, i) => (
            <div key={c.id} className={`flex justify-between items-center p-4 ${i !== customers.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
              <div>
                <div className="text-[13px] font-medium">{c.name}</div>
                <div className="text-[12px] text-[var(--ink-text-muted)]">{c.phone || c.email || '\u2014'}</div>
              </div>
              <Badge tone={c.loyalty_points > 0 ? 'success' : 'neutral'}>
                {c.loyalty_points} pts
              </Badge>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
