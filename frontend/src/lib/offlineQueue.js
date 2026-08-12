import { openDB } from 'idb'

// A queue of sales made while offline, stored locally until they can
// be synced to Supabase. This is the actual "offline mode" — the app
// shell loading without internet (handled by the service worker) is
// necessary but not sufficient; a bar/shop needs to keep SELLING
// during an outage, not just look at a static screen.

const DB_NAME = 'sellaris-offline'
const STORE_NAME = 'pending_sales'
const DB_VERSION = 1

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'localId' })
        store.createIndex('status', 'status')
        store.createIndex('createdAt', 'createdAt')
      }
    },
  })
}

// Queue a sale locally. Stores exactly what's needed to replay the
// same order-creation flow once connectivity returns.
export async function queueSale(sale) {
  const db = await getDb()
  const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  const record = {
    localId,
    status: 'pending', // pending | failed
    errorMessage: null,
    createdAt: new Date().toISOString(),
    ...sale,
  }
  await db.put(STORE_NAME, record)
  return localId
}

export async function getPendingSales() {
  const db = await getDb()
  return db.getAllFromIndex(STORE_NAME, 'status', 'pending')
}

export async function getAllQueuedSales() {
  const db = await getDb()
  return db.getAll(STORE_NAME)
}

export async function removeSale(localId) {
  const db = await getDb()
  await db.delete(STORE_NAME, localId)
}

export async function markSaleFailed(localId, errorMessage) {
  const db = await getDb()
  const record = await db.get(STORE_NAME, localId)
  if (record) {
    record.status = 'failed'
    record.errorMessage = errorMessage
    await db.put(STORE_NAME, record)
  }
}

export async function retrySale(localId) {
  const db = await getDb()
  const record = await db.get(STORE_NAME, localId)
  if (record) {
    record.status = 'pending'
    record.errorMessage = null
    await db.put(STORE_NAME, record)
  }
}

export async function pendingCount() {
  const pending = await getPendingSales()
  return pending.length
}
