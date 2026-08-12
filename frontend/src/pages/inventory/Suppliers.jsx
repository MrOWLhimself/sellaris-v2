import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'

export default function Suppliers() {
  const { staff } = useAuth()
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('suppliers')
      .select('id, name, contact_phone, contact_email')
      .eq('tenant_id', staff.tenant_id)
      .order('name')
    setSuppliers(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [staff.tenant_id])

  async function addSupplier(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await supabase.from('suppliers').insert({
      tenant_id: staff.tenant_id,
      name,
      contact_phone: phone,
      contact_email: email,
    })
    setSaving(false)
    setName(''); setContact(''); setEmail(''); setPhone(''); setAddress('')
    setShowForm(false)
    load()
  }

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-[13px] text-[var(--ink-text-muted)]">Vendors you buy stock from.</p>
        <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ Add supplier'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={addSupplier} className="bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--radius)] p-5 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label>Supplier name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ace Drinks Distributors" required />
            </div>
            <div>
              <Label>Contact person</Label>
              <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="080\u2026" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" />
            </div>
            <div className="col-span-2">
              <Label>Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <Button type="submit" variant="primary" disabled={saving} className="w-full">
            {saving ? 'Saving\u2026' : 'Save supplier'}
          </Button>
        </form>
      )}

      <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden">
        {suppliers.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-text-faint)] p-5">No suppliers yet.</p>
        ) : (
          suppliers.map((s, i) => (
            <div key={s.id} className={`flex justify-between p-4 text-[13px] ${i !== suppliers.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
              <span className="font-medium">{s.name}</span>
              <span className="text-[var(--ink-text-muted)] font-[var(--font-mono)]">
                {s.contact_phone || s.contact_email || '\u2014'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
