import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'

export default function Stores() {
  const { staff } = useAuth()
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('Nigeria')
  const [phone, setPhone] = useState('')
  const [description, setDescription] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('branches')
      .select('id, name, address, city, state, phone, is_warehouse')
      .eq('tenant_id', staff.tenant_id)
      .order('is_warehouse', { ascending: true })
    setStores(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [staff.tenant_id])

  async function addStore(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await supabase.from('branches').insert({
      tenant_id: staff.tenant_id,
      name, address, city, state,
      postal_code: postalCode,
      country, phone, description,
      is_main: false, is_warehouse: false,
    })
    setSaving(false)
    setName(''); setAddress(''); setCity(''); setState(''); setPostalCode(''); setPhone(''); setDescription('')
    setShowForm(false)
    load()
  }

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-[13px] text-[var(--ink-text-muted)]">
          Add another physical store. Stock reaches a new store only via transfer from the warehouse.
        </p>
        <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ Add store'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={addStore} className="bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--radius)] p-5 mb-6">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required className="mb-4" />

          <Label>Address</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} className="mb-4" />

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <Label>State</Label>
              <Input value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div>
              <Label>Postal code</Label>
              <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
            </div>
            <div>
              <Label>Country</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
          </div>

          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="080\u2026" className="mb-4" />

          <Label>Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" className="mb-4" />

          <Button type="submit" variant="primary" disabled={saving} className="w-full">
            {saving ? 'Saving\u2026' : 'Save store'}
          </Button>
        </form>
      )}

      <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden">
        {stores.map((s, i) => (
          <div key={s.id} className={`flex justify-between items-center p-4 ${i !== stores.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
            <div>
              <div className="text-[13px] font-medium">{s.name} {s.is_warehouse && <span className="text-[11px] text-[var(--ink-text-muted)]">(warehouse)</span>}</div>
              <div className="text-[12px] text-[var(--ink-text-muted)]">
                {[s.address, s.city, s.state].filter(Boolean).join(', ') || '\u2014'}
              </div>
            </div>
            <span className="text-[12px] text-[var(--ink-text-muted)] font-[var(--font-mono)]">{s.phone || ''}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
