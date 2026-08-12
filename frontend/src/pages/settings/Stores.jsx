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

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('branches')
      .select('id, name, address, is_warehouse')
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
    await supabase.from('branches').insert({ tenant_id: staff.tenant_id, name, address, is_main: false, is_warehouse: false })
    setSaving(false)
    setName(''); setAddress('')
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
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label>Store name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Optional" />
            </div>
          </div>
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
              <div className="text-[12px] text-[var(--ink-text-muted)]">{s.address || '\u2014'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
