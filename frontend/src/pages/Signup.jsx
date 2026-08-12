import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Input'

const BUSINESS_TYPES = [
  { value: 'bar_lounge', label: 'Bar / Lounge' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'retail', label: 'Retail shop' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'salon', label: 'Salon / Spa' },
  { value: 'other', label: 'Other' },
]

export default function Signup() {
  const { session, staff, signUp, refreshStaff } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(session ? 'business' : 'account')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('bar_lounge')
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [busy, setBusy] = useState(false)

  // If this person was already attached to a business via a staff
  // invitation (the auth.users trigger runs on signup), skip the
  // "create a business" step entirely — they're joining one, not
  // starting one.
  useEffect(() => {
    if (session && staff) {
      navigate('/')
    }
  }, [session, staff, navigate])

  async function handleCreateAccount(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error } = await signUp(email, password)
    setBusy(false)
    if (error) { setError(error.message); return }
    setInfo('Account created. If email confirmation is required, check your inbox, then come back and sign in to continue setup.')
  }

  async function handleCreateBusiness(e) {
    e.preventDefault()
    setError(null)
    if (!businessName.trim() || !ownerName.trim()) {
      setError('Enter your business name and your name.')
      return
    }
    setBusy(true)
    const { error } = await supabase.rpc('create_business', {
      p_business_name: businessName,
      p_business_type: businessType,
      p_owner_name: ownerName,
    })
    setBusy(false)
    if (error) { setError(error.message); return }
    await refreshStaff()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--radius-lg)] p-7">
        <div className="font-[var(--font-display)] text-[20px] font-semibold mb-6">
          Sell<span className="text-[var(--violet-bright)]">aris</span>
        </div>

        {step === 'account' && !session ? (
          <>
            <h1 className="font-[var(--font-display)] text-[20px] font-medium mb-1.5">
              Start your free trial
            </h1>
            <p className="text-[13px] text-[var(--ink-text-muted)] mb-6">
              Create your login first, then set up your business.
            </p>
            <form onSubmit={handleCreateAccount}>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mb-4" />
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mb-4" />
              {error && <p className="text-[13px] text-[var(--danger)] mb-4">{error}</p>}
              {info && <p className="text-[13px] text-[var(--success)] mb-4">{info}</p>}
              <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
                {busy ? 'Creating\u2026' : 'Continue'}
              </Button>
            </form>
            <p className="text-[13px] text-[var(--ink-text-muted)] mt-4 text-center">
              Already have an account? <Link to="/login" className="text-[var(--violet-bright)]">Sign in</Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="font-[var(--font-display)] text-[20px] font-medium mb-1.5">
              Tell us about your business
            </h1>
            <p className="text-[13px] text-[var(--ink-text-muted)] mb-6">
              We'll set up your warehouse and main store automatically.
            </p>
            <form onSubmit={handleCreateBusiness}>
              <Label>Your name</Label>
              <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required className="mb-4" />
              <Label>Business name</Label>
              <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} required className="mb-4" />
              <Label>Business type</Label>
              <Select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="mb-4">
                {BUSINESS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
              {error && <p className="text-[13px] text-[var(--danger)] mb-4">{error}</p>}
              <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
                {busy ? 'Setting up\u2026' : 'Create my business'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
