import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Input'

export default function Receipt() {
  const { staff } = useAuth()
  const [header, setHeader] = useState('')
  const [footer, setFooter] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('tenants').select('receipt_header, receipt_footer').eq('id', staff.tenant_id).maybeSingle()
      .then(({ data }) => {
        setHeader(data?.receipt_header || '')
        setFooter(data?.receipt_footer || '')
        setLoading(false)
      })
  }, [staff.tenant_id])

  async function save() {
    setSaving(true)
    await supabase.from('tenants').update({ receipt_header: header, receipt_footer: footer }).eq('id', staff.tenant_id)
    setSaving(false)
    setSaved(true)
  }

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>

  return (
    <div className="max-w-[480px] bg-[var(--surface-2)] rounded-[var(--radius)] p-5">
      <h2 className="text-[15px] font-medium mb-4">Receipt settings</h2>

      <Label>Header</Label>
      <textarea
        value={header}
        onChange={(e) => { setHeader(e.target.value); setSaved(false) }}
        placeholder="e.g. phone numbers, address"
        maxLength={500}
        rows={2}
        className="w-full rounded-[var(--radius)] bg-[var(--surface-3)] border border-[var(--line-strong)] px-3 py-2 text-[13.5px] text-[var(--ink-text)] mb-1 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--violet-bright)]"
      />
      <p className="text-[11px] text-[var(--ink-text-faint)] text-right mb-4">{header.length} / 500</p>

      <Label>Footer</Label>
      <textarea
        value={footer}
        onChange={(e) => { setFooter(e.target.value); setSaved(false) }}
        placeholder="e.g. thank-you message, payment account details"
        maxLength={500}
        rows={4}
        className="w-full rounded-[var(--radius)] bg-[var(--surface-3)] border border-[var(--line-strong)] px-3 py-2 text-[13.5px] text-[var(--ink-text)] mb-1 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--violet-bright)]"
      />
      <p className="text-[11px] text-[var(--ink-text-faint)] text-right mb-5">{footer.length} / 500</p>

      <Button variant="primary" onClick={save} disabled={saving}>
        {saving ? 'Saving\u2026' : saved ? 'Saved' : 'Save'}
      </Button>
    </div>
  )
}
