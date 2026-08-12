import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'

export default function Loyalty() {
  const { staff } = useAuth()
  const [pct, setPct] = useState('1.00')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('tenants').select('loyalty_points_percentage').eq('id', staff.tenant_id).maybeSingle()
      .then(({ data }) => { setPct(String(data?.loyalty_points_percentage ?? 1)); setLoading(false) })
  }, [staff.tenant_id])

  async function save() {
    setSaving(true)
    await supabase.from('tenants').update({ loyalty_points_percentage: Number(pct) || 0 }).eq('id', staff.tenant_id)
    setSaving(false)
    setSaved(true)
  }

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>

  return (
    <div className="max-w-[420px] bg-[var(--surface-2)] rounded-[var(--radius)] p-5">
      <h2 className="text-[15px] font-medium mb-4">Loyalty settings</h2>
      <Label>Points earning percentage</Label>
      <Input
        type="number"
        step="0.1"
        min="0"
        value={pct}
        onChange={(e) => { setPct(e.target.value); setSaved(false) }}
        className="mb-2"
      />
      <p className="text-[12px] text-[var(--ink-text-faint)] mb-5">
        Percentage of the purchase amount credited to the customer's points account. e.g. 1 means
        \u20a6100 spent = 1 point.
      </p>
      <Button variant="primary" onClick={save} disabled={saving}>
        {saving ? 'Saving\u2026' : saved ? 'Saved' : 'Save'}
      </Button>
    </div>
  )
}
