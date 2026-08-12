import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function PaymentTypes() {
  const { staff } = useAuth()
  const [types, setTypes] = useState([])
  const [newType, setNewType] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('tenants').select('payment_types').eq('id', staff.tenant_id).maybeSingle()
      .then(({ data }) => { setTypes(data?.payment_types || []); setLoading(false) })
  }, [staff.tenant_id])

  async function save(updated) {
    setSaving(true)
    await supabase.from('tenants').update({ payment_types: updated }).eq('id', staff.tenant_id)
    setTypes(updated)
    setSaving(false)
  }

  function addType(e) {
    e.preventDefault()
    const v = newType.trim().toLowerCase()
    if (!v || types.includes(v)) return
    save([...types, v])
    setNewType('')
  }

  function removeType(t) {
    save(types.filter((x) => x !== t))
  }

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>

  return (
    <div className="max-w-[480px]">
      <form onSubmit={addType} className="flex gap-2 mb-5">
        <Input value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="e.g. bank transfer" className="flex-1" />
        <Button type="submit" variant="primary" disabled={saving}>+ Add payment type</Button>
      </form>
      <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden">
        {types.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-text-faint)] p-5">No payment types configured.</p>
        ) : (
          types.map((t, i) => (
            <div key={t} className={`flex justify-between items-center p-4 ${i !== types.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
              <span className="text-[13.5px] capitalize">{t}</span>
              <button onClick={() => removeType(t)} className="text-[12px] text-[var(--danger)] hover:opacity-80">Remove</button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
