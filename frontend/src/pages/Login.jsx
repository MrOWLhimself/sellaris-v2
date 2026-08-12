import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { CURRENT_TENANT_ID } from '@/lib/tenant'

export default function Login() {
  const { session, staff, signIn, refreshStaff } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [claimBusinessName, setClaimBusinessName] = useState(null)

  useEffect(() => {
    if (session && !staff) {
      supabase
        .from('tenants')
        .select('name')
        .eq('id', CURRENT_TENANT_ID)
        .maybeSingle()
        .then(({ data }) => setClaimBusinessName(data?.name || null))
    }
  }, [session, staff])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error } = await signIn(email, password)
    setBusy(false)
    if (error) setError(error.message)
  }

  async function claimOwnership() {
    setBusy(true)
    setError(null)
    const { error } = await supabase.rpc('claim_tenant_owner', {
      p_tenant_id: CURRENT_TENANT_ID,
      p_name: name || session.user.email,
    })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    await refreshStaff()
  }

  // Logged in but not yet linked to a business — pilot-tenant bootstrap
  // path (Roger's Lounge specifically). New businesses use /signup instead.
  if (session && !staff) {
    return (
      <Shell>
        <h1 className="font-[var(--font-display)] text-[20px] font-medium mb-1.5">
          Set up {claimBusinessName || 'your business'}
        </h1>
        <p className="text-[13px] text-[var(--ink-text-muted)] mb-6">
          You're signed in as {session.user.email}. Claim this business as its owner to continue.
        </p>
        <Label>Your name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Toyosola Amuludun" className="mb-4" />
        {error && <p className="text-[13px] text-[var(--danger)] mb-4">{error}</p>}
        <Button variant="primary" size="lg" className="w-full" disabled={busy} onClick={claimOwnership}>
          {busy ? 'Setting up\u2026' : 'Claim ownership'}
        </Button>
      </Shell>
    )
  }

  return (
    <Shell>
      <h1 className="font-[var(--font-display)] text-[20px] font-medium mb-1.5">
        Sign in to Sellaris
      </h1>
      <p className="text-[13px] text-[var(--ink-text-muted)] mb-6">Staff login</p>

      <form onSubmit={handleSubmit}>
        <Label>Email</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourbusiness.com"
          required
          className="mb-4"
        />
        <Label>Password</Label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          minLength={6}
          className="mb-4"
        />

        {error && <p className="text-[13px] text-[var(--danger)] mb-4">{error}</p>}

        <Button variant="primary" size="lg" className="w-full" disabled={busy} type="submit">
          {busy ? 'Please wait\u2026' : 'Sign in'}
        </Button>
      </form>

      <p className="text-[13px] text-[var(--ink-text-muted)] mt-4 text-center">
        New business? <Link to="/signup" className="text-[var(--violet-bright)]">Start your free trial</Link>
      </p>
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[380px] bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--radius-lg)] p-7">
        <div className="font-[var(--font-display)] text-[20px] font-semibold mb-6">
          Sell<span className="text-[var(--violet-bright)]">aris</span>
        </div>
        {children}
      </div>
    </div>
  )
}
