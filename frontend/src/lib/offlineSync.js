import { supabase } from '@/lib/supabase'
import { getPendingSales, removeSale, markSaleFailed } from '@/lib/offlineQueue'
import { logAudit } from '@/lib/audit'

// Attempts to replay every pending sale against the real database via
// the SAME atomic RPC the online POS flow uses — order + all line
// items succeed together or not at all, and the idempotency key means
// a sale that partially synced before a connection drop can be safely
// retried without ever creating a duplicate order.
//
// A sale can legitimately fail to sync — e.g. stock ran out from
// OTHER sales at this branch while this device was offline. That's
// not a bug to hide: it's marked 'failed' with the real error and
// left visible for staff to resolve (adjust the order, or accept the
// loss), rather than silently dropped or blindly retried forever.
export async function syncPendingSales() {
  if (!navigator.onLine) return { synced: 0, failed: 0 }

  const pending = await getPendingSales()
  let synced = 0
  let failed = 0

  for (const sale of pending) {
    try {
      let customerId = sale.customerId || null

      // Customer lookup couldn't happen while offline — do it now.
      if (!customerId && sale.customerPhone) {
        const { data: existing } = await supabase
          .from('customers')
          .select('id')
          .eq('tenant_id', sale.tenantId)
          .eq('phone', sale.customerPhone)
          .maybeSingle()

        if (existing) {
          customerId = existing.id
        } else {
          const { data: created } = await supabase
            .from('customers')
            .insert({ tenant_id: sale.tenantId, name: sale.customerPhone, phone: sale.customerPhone })
            .select('id')
            .single()
          customerId = created?.id || null
        }
      }

      const { error: saleErr } = await supabase.rpc('create_pos_sale', {
        p_tenant_id: sale.tenantId,
        p_branch_id: sale.branchId,
        p_table_label: sale.tableLabel,
        p_order_type: sale.orderType || 'walk_in',
        p_customer_id: customerId,
        p_items: sale.cartLines.map((l) => ({ item_id: l.id, qty: l.qty, unit_price: l.price })),
        p_idempotency_key: sale.idempotencyKey,
      })

      if (saleErr) throw saleErr

      await removeSale(sale.localId)
      synced++
    } catch (e) {
      await markSaleFailed(sale.localId, e.message || 'Sync failed')
      // Logged centrally too — a local device's IndexedDB is invisible
      // to an owner checking on things remotely. This is what makes a
      // sync failure a MONITORABLE event instead of something only
      // visible if someone happens to be standing at that exact till.
      logAudit('offline_sale_sync_failed', {
        error: e.message,
        total: sale.total,
        itemCount: sale.cartLines?.length,
      }, sale.tenantId)
      failed++
    }
  }

  return { synced, failed }
}

// Call once on app start, then keep retrying: on every 'online' event,
// and on a slow background interval in case the browser's online
// event doesn't fire reliably (happens on some mobile networks).
export function startSyncEngine(onSyncComplete) {
  const run = async () => {
    const result = await syncPendingSales()
    if (result.synced > 0 || result.failed > 0) onSyncComplete?.(result)
  }

  run()
  window.addEventListener('online', run)
  const interval = setInterval(run, 30000)

  return () => {
    window.removeEventListener('online', run)
    clearInterval(interval)
  }
}
