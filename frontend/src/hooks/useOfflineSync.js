import { useEffect, useState, useCallback } from 'react'
import { startSyncEngine } from '@/lib/offlineSync'
import { pendingCount as getPendingCount, getAllQueuedSales } from '@/lib/offlineQueue'

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pending, setPending] = useState(0)
  const [failedCount, setFailedCount] = useState(0)

  const refreshCounts = useCallback(async () => {
    const [count, all] = await Promise.all([getPendingCount(), getAllQueuedSales()])
    setPending(count)
    setFailedCount(all.filter((s) => s.status === 'failed').length)
  }, [])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    refreshCounts()
    const stopSync = startSyncEngine(() => refreshCounts())
    const refreshInterval = setInterval(refreshCounts, 5000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      stopSync()
      clearInterval(refreshInterval)
    }
  }, [refreshCounts])

  return { isOnline, pending, failedCount, refreshCounts }
}
