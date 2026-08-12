import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'

export default function TaxesSettings() {
  const { staff } = useAuth()
  const [vatPct, setVatPct] = useState('7.5')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('tenants').select('vat_rate').eq('id', staff.tenant_id).maybeSingle()
      .then(({ data }) => { setVatPct(String((Number(data?.vat_rate ?? 0.075) * 100).toFixed(2))); setLoading(false) })
  }, [staff.tenant_id])

  async function save() {
    setSaving(true)
    await supabase.from('tenants').update({ vat_rate: (Number(vatPct) || 0) / 100 }).eq('id', staff.tenant_id)
    setSaving(false)
    setSaved(true)
  }

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>

  return (
    <div className="max-w-[420px] bg-[var(--surface-2)] rounded-[var(--radius)] p-5">
      <h2 className="text-[15px] font-medium mb-4">VAT</h2>
      <Label>Rate (%)</Label>
      <Input
        type="number"
        step="0.1"
        min="0"
        value={vatPct}
        onChange={(e) => { setVatPct(e.target.value); setSaved(false) }}
        className="mb-2"
      />
      <p className="text-[12px] text-[var(--ink-text-faint)] mb-5">
        Applied automatically at the till and used across all Finance reports and settlement math.
        Standard Nigerian VAT is 7.5%.
      </p>
      <Button variant="primary" onClick={save} disabled={saving}>
        {saving ? 'Saving\u2026' : saved ? 'Saved' : 'Save'}
      </Button>
    </div>
  )
}
