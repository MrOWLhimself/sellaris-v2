import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { CURRENT_TENANT_ID } from '@/lib/tenant'

export default function Login() {
  const { session, staff, signIn, signUp, refreshStaff } = useAuth()
  const [mode, setMode] = useState('signin') // signin | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [info, setInfo] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)

    const { error } = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password)

    setBusy(false)

    if (error) {
      setError(error.message)
      return
    }

    if (mode === 'signup') {
      setInfo('Account created. If email confirmation is required, check your inbox, then sign in below.')
      setMode('signin')
    }
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

  // Logged in but not yet linked to a business — first-run bootstrap
  if (session && !staff) {
    return (
      <Shell>
        <h1 className="font-[var(--font-display)] text-[20px] font-medium mb-1.5">
          Set up Roger's Lounge
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
        {mode === 'signin' ? 'Sign in to Sellaris' : 'Create your account'}
      </h1>
      <p className="text-[13px] text-[var(--ink-text-muted)] mb-6">
        {mode === 'signin' ? "Roger's Lounge staff login" : 'Set a password to get started'}
      </p>

      <form onSubmit={handleSubmit}>
        <Label>Email</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@rogerslounge.com"
          required
          className="mb-4"
        />
        <Label>Password</Label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
          required
          minLength={6}
          className="mb-4"
        />

        {error && <p className="text-[13px] text-[var(--danger)] mb-4">{error}</p>}
        {info && <p className="text-[13px] text-[var(--success)] mb-4">{info}</p>}

        <Button variant="primary" size="lg" className="w-full" disabled={busy} type="submit">
          {busy ? 'Please wait\u2026' : mode === 'signin' ? 'Sign in' : 'Sign up'}
        </Button>
      </form>

      <button
        onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setInfo(null) }}
        className="text-[13px] text-[var(--ink-text-muted)] hover:text-[var(--ink-text)] mt-4 w-full text-center"
      >
        {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
      </button>
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
