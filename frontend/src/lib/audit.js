import { supabase } from '@/lib/supabase'

// Lightweight audit log writer. Never throws — a failed audit write
// should never block or crash the action being logged. tenant_id is
// optional since some events (a crash before staff loads, a failed
// sign-in) don't have tenant context yet.
export async function logAudit(action, details = {}, tenantId = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return // can't attribute an anonymous action, skip silently

    await supabase.from('audit_log').insert({
      tenant_id: tenantId,
      actor_user_id: user.id,
      action,
      details,
    })
  } catch {
    // Intentionally swallowed — logging failures must never surface
    // to the user or interrupt the action that triggered the log.
  }
}
