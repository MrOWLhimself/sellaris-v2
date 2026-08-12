import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'

const FEATURES = [
  { key: 'shifts', label: 'Shifts', desc: 'Track cash that goes in and out of your drawer.' },
  { key: 'time_clock', label: 'Time clock', desc: "Track employees' clock in/out and total hours worked." },
  { key: 'open_tickets', label: 'Open tickets', desc: 'Allow saving and editing orders before payment (bar tabs).' },
  { key: 'kitchen_printers', label: 'Kitchen printers', desc: 'Send orders to a kitchen printer or display.' },
  { key: 'customer_display', label: 'Customer display', desc: 'Show order information to customers at time of purchase.' },
  { key: 'dining_options', label: 'Dining options', desc: 'Mark orders as dine in, takeout, or delivery.' },
  { key: 'low_stock_notifications', label: 'Low stock notifications', desc: 'Get notified when items are low or out of stock.' },
  { key: 'weight_embedded_barcodes', label: 'Weight-embedded barcodes', desc: 'Allow scanning barcodes with embedded weight.' },
]

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${checked ? 'bg-[var(--violet)]' : 'bg-[var(--surface-3)]'}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-[var(--ink-text)] transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  )
}

export default function Settings() {
  const { staff } = useAuth()
  const [settings, setSettings] = useState(null)
  const [telegramChatId, setTelegramChatId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('tenants')
        .select('settings, telegram_chat_id')
        .eq('id', staff.tenant_id)
        .maybeSingle()
      setSettings(data?.settings || {})
      setTelegramChatId(data?.telegram_chat_id || '')
      setLoading(false)
    }
    load()
  }, [staff.tenant_id])

  function toggleFeature(key) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    const { error } = await supabase
      .from('tenants')
      .update({ settings, telegram_chat_id: telegramChatId || null })
      .eq('id', staff.tenant_id)
    setSaving(false)
    if (!error) setSaved(true)
  }

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>

  return (
    <div className="max-w-[560px]">
      <h1 className="font-[var(--font-display)] text-[20px] font-medium mb-6">Settings</h1>

      <h2 className="text-[12px] uppercase tracking-wide text-[var(--ink-text-muted)] mb-3">Features</h2>
      <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden mb-8">
        {FEATURES.map((f, i) => (
          <div key={f.key} className={`flex items-center justify-between p-4 gap-4 ${i !== FEATURES.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
            <div>
              <div className="text-[13.5px] font-medium mb-0.5">{f.label}</div>
              <div className="text-[12px] text-[var(--ink-text-muted)]">{f.desc}</div>
            </div>
            <Toggle checked={!!settings[f.key]} onChange={() => toggleFeature(f.key)} />
          </div>
        ))}
      </div>

      <h2 className="text-[12px] uppercase tracking-wide text-[var(--ink-text-muted)] mb-3">Telegram notifications</h2>
      <div className="bg-[var(--surface-2)] rounded-[var(--radius)] p-4 mb-8">
        <Label>Telegram chat ID</Label>
        <Input
          value={telegramChatId}
          onChange={(e) => { setTelegramChatId(e.target.value); setSaved(false) }}
          placeholder="e.g. 123456789"
        />
        <p className="text-[12px] text-[var(--ink-text-faint)] mt-2">
          Telegram notifications need a bot connected first \u2014 ask your Sellaris admin to set
          this up, then paste your chat ID here once you have it.
        </p>
      </div>

      <Button variant="primary" onClick={save} disabled={saving}>
        {saving ? 'Saving\u2026' : saved ? 'Saved' : 'Save changes'}
      </Button>
    </div>
  )
}
