import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MetricCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/context/AuthContext'

const naira = (n) => `\u20a6${Number(n).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

export default function SuperAdmin() {
  const { signOut } = useAuth()
  const [stats, setStats] = useState(null)
  const [tenants, setTenants] = useState([])
  const [recentErrors, setRecentErrors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: statsData, error: statsErr }, { data: tenantsData, error: tenantsErr }, { data: errorsData, error: errorsErr }] = await Promise.all([
        supabase.rpc('get_platform_stats'),
        supabase.rpc('get_platform_tenants'),
        supabase.rpc('get_platform_recent_errors', { p_limit: 20 }),
      ])
      if (statsErr || tenantsErr || errorsErr) setError((statsErr || tenantsErr || errorsErr).message)
      setStats(statsData?.[0] || null)
      setTenants(tenantsData || [])
      setRecentErrors(errorsData || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</div>

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="font-[var(--font-display)] text-[20px] font-semibold">
            Sell<span className="text-[var(--violet-bright)]">aris</span>
            <span className="text-[13px] font-normal text-[var(--ink-text-muted)] ml-2">Super Admin</span>
          </div>
          <button onClick={signOut} className="text-[13px] text-[var(--ink-text-muted)] hover:text-[var(--ink-text)]">
            Sign out
          </button>
        </div>

        {error && <p className="text-[13px] text-[var(--danger)] mb-4">{error}</p>}

        <div className="grid grid-cols-3 gap-3.5 mb-8">
          <MetricCard label="Total businesses" value={stats?.total_businesses ?? 0} accent />
          <MetricCard label="Active in last 30 days" value={stats?.active_businesses_30d ?? 0} accent />
          <MetricCard label="Total GMV (all-time)" value={naira(stats?.total_gmv ?? 0)} accent />
        </div>

        <h2 className="text-[12px] uppercase tracking-wide text-[var(--ink-text-muted)] mb-3">Businesses</h2>
        <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden overflow-x-auto">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-4.5 py-2.5 text-[11px] uppercase tracking-wide text-[var(--ink-text-muted)] border-b border-[var(--line)] min-w-[700px]">
            <span>Business</span>
            <span>Slug</span>
            <span>Plan</span>
            <span className="text-right">Orders</span>
            <span className="text-right">Joined</span>
          </div>
          {tenants.map((t, i) => (
            <div key={t.id} className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-4.5 py-3 text-[13px] items-center min-w-[700px] ${i !== tenants.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
              <span className="font-medium">{t.name}</span>
              <span className="text-[var(--ink-text-muted)] font-[var(--font-mono)] text-[12px]">{t.slug}</span>
              <Badge tone={t.plan === 'trial' ? 'warning' : 'success'}>{t.plan}</Badge>
              <span className="text-right font-[var(--font-mono)]">{t.order_count}</span>
              <span className="text-right text-[12px] text-[var(--ink-text-muted)]">
                {new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
          ))}
        </div>

        <h2 className="text-[12px] uppercase tracking-wide text-[var(--ink-text-muted)] mb-3 mt-8">
          Recent errors (last 20, across all businesses)
        </h2>
        <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden">
          {recentErrors.length === 0 ? (
            <p className="text-[13px] text-[var(--ink-text-faint)] p-5">No errors logged. Good sign.</p>
          ) : (
            recentErrors.map((e, i) => (
              <div key={e.id} className={`p-4 ${i !== recentErrors.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[13px] font-medium">{e.tenant_name || 'Unknown business'}</span>
                  <div className="flex items-center gap-2">
                    <Badge tone={e.action === 'app_error' ? 'danger' : 'warning'}>
                      {e.action === 'app_error' ? 'App crash' : 'Offline sync failed'}
                    </Badge>
                    <span className="text-[11px] text-[var(--ink-text-muted)]">
                      {new Date(e.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <p className="text-[12px] text-[var(--ink-text-muted)] font-[var(--font-mono)] truncate">
                  {e.details?.message || e.details?.error || JSON.stringify(e.details)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
