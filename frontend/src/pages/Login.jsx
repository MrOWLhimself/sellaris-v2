import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { PinPad } from '@/components/ui/PinPad'
import { CURRENT_TENANT_ID } from '@/lib/tenant'
import { listPinProfiles, verifyPin, savePinProfile, hasPinProfile, removePinProfile, checkLockout, recordFailedAttempt, clearAttempts } from '@/lib/pinAuth'

export default function Login() {
  const { session, staff, signIn, refreshStaff, switchToStaffSession } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [claimBusinessName, setClaimBusinessName] = useState(null)

  const [pinProfiles, setPinProfiles] = useState(null) // null = still loading
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [activeProfile, setActiveProfile] = useState(null) // staff profile currently entering a PIN
  const [pinError, setPinError] = useState(null)
  const [pinBusy, setPinBusy] = useState(false)

  const [needsPinSetup, setNeedsPinSetup] = useState(false)
  const [newPin, setNewPin] = useState(null)
  const [pinSetupError, setPinSetupError] = useState(null)

  useEffect(() => {
    listPinProfiles().then((profiles) => {
      setPinProfiles(profiles)
      if (profiles.length === 0) setShowEmailForm(true)
    })
  }, [])

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

  // Right after a real login (email/password), offer to set up a PIN
  // for next time on this device — but only once per staff member.
  useEffect(() => {
    if (staff) {
      hasPinProfile(staff.id).then((has) => setNeedsPinSetup(!has))
    }
  }, [staff])

  // Once staff is loaded and there's no pending PIN setup, leave /login.
  useEffect(() => {
    if (staff && !needsPinSetup) {
      navigate('/', { replace: true })
    }
  }, [staff, needsPinSetup, navigate])

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

  async function handlePinComplete(pin) {
    setPinError(null)

    const lockout = await checkLockout(activeProfile.staffId)
    if (lockout.locked) {
      const seconds = Math.ceil(lockout.retryInMs / 1000)
      setPinError(`Too many wrong attempts. Try again in ${seconds}s.`)
      return
    }

    setPinBusy(true)
    const refreshToken = await verifyPin(activeProfile.staffId, pin)
    if (!refreshToken) {
      const attemptCount = await recordFailedAttempt(activeProfile.staffId)
      setPinBusy(false)
      const remaining = 5 - attemptCount
      setPinError(remaining > 0 ? `Wrong PIN. ${remaining} attempt${remaining === 1 ? '' : 's'} left.` : 'Too many wrong attempts. Try again in 60s.')
      return
    }

    await clearAttempts(activeProfile.staffId)
    const { error } = await switchToStaffSession(activeProfile.staffId, refreshToken)
    setPinBusy(false)
    if (error) {
      setPinError('This device needs a fresh sign-in. Use email & password.')
      await removePinProfile(activeProfile.staffId)
      setPinProfiles((p) => p.filter((x) => x.staffId !== activeProfile.staffId))
      setActiveProfile(null)
    }
  }

  async function saveNewPin(pin) {
    setPinSetupError(null)
    const { data: { session: current } } = await supabase.auth.getSession()
    if (!current?.refresh_token) {
      setPinSetupError('Could not read session — try again.')
      return
    }
    await savePinProfile({
      staffId: staff.id,
      name: staff.name,
      businessName: staff.businessName,
      pin,
      refreshToken: current.refresh_token,
    })
    setNeedsPinSetup(false)
  }

  // --- Staff is fully logged in but hasn't set a device PIN yet ---
  if (staff && needsPinSetup) {
    return (
      <Shell>
        <h1 className="font-[var(--font-display)] text-[20px] font-medium mb-1.5">
          Set a PIN for this device
        </h1>
        <p className="text-[13px] text-[var(--ink-text-muted)] mb-6">
          Next time on this till, just tap your name and enter this PIN — no need to type your
          email and password again.
        </p>
        {pinSetupError && <p className="text-[13px] text-[var(--danger)] mb-4">{pinSetupError}</p>}
        <PinPad onComplete={saveNewPin} />
        <button
          onClick={() => setNeedsPinSetup(false)}
          className="text-[13px] text-[var(--ink-text-muted)] hover:text-[var(--ink-text)] mt-6"
        >
          Skip for now
        </button>
      </Shell>
    )
  }

  // --- Logged in, staff loaded, no PIN setup needed: ProtectedRoute takes over ---
  if (staff) return null

  // --- Logged in but not yet linked to a business (pilot bootstrap path) ---
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

  // --- PIN entry for a specific cached staff member ---
  if (activeProfile) {
    return (
      <Shell>
        <button
          onClick={() => { setActiveProfile(null); setPinError(null) }}
          className="text-[13px] text-[var(--ink-text-muted)] hover:text-[var(--ink-text)] mb-5"
        >
          &larr; Back
        </button>
        <h1 className="font-[var(--font-display)] text-[20px] font-medium mb-1.5 text-center">
          {activeProfile.name}
        </h1>
        <p className="text-[13px] text-[var(--ink-text-muted)] mb-6 text-center">Enter your PIN</p>
        <PinPad onComplete={handlePinComplete} error={pinError} busy={pinBusy} />
      </Shell>
    )
  }

  // --- Quick-switch tiles for staff who've logged in on this device before ---
  if (pinProfiles && pinProfiles.length > 0 && !showEmailForm) {
    return (
      <Shell wide>
        <h1 className="font-[var(--font-display)] text-[20px] font-medium mb-1.5">Who's logging in?</h1>
        <p className="text-[13px] text-[var(--ink-text-muted)] mb-6">{pinProfiles[0]?.businessName}</p>
        <div className="flex flex-wrap gap-3 mb-6">
          {pinProfiles.map((p) => (
            <button
              key={p.staffId}
              onClick={() => setActiveProfile(p)}
              className="flex flex-col items-center gap-2 p-3 rounded-[var(--radius)] hover:bg-[var(--surface-2)] transition-colors w-24"
            >
              <span className="w-14 h-14 rounded-full bg-[var(--violet)] text-[#F5F3FA] flex items-center justify-center text-[18px] font-[var(--font-display)]">
                {p.name.charAt(0).toUpperCase()}
              </span>
              <span className="text-[12.5px] text-center truncate w-full">{p.name}</span>
            </button>
          ))}
        </div>
        <button onClick={() => setShowEmailForm(true)} className="text-[13px] text-[var(--violet)] hover:underline">
          Sign in with a different account
        </button>
      </Shell>
    )
  }

  // --- Full email/password sign-in ---
  return (
    <Shell>
      {pinProfiles && pinProfiles.length > 0 && (
        <button
          onClick={() => setShowEmailForm(false)}
          className="text-[13px] text-[var(--ink-text-muted)] hover:text-[var(--ink-text)] mb-5"
        >
          &larr; Back to quick login
        </button>
      )}
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

function Shell({ children, wide }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className={`w-full ${wide ? 'max-w-[480px]' : 'max-w-[380px]'} bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--radius-lg)] p-7`}>
        <div className="font-[var(--font-display)] text-[20px] font-semibold mb-6">
          Sell<span className="text-[var(--violet-bright)]">aris</span>
        </div>
        {children}
      </div>
    </div>
  )
}
