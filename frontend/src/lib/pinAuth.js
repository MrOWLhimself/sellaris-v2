import { openDB } from 'idb'

// PIN-based quick switching for a SHARED DEVICE (e.g. a till behind
// the bar). The PIN never touches the server and isn't a real
// authentication factor on its own — it's a local convenience lock
// on top of a session this exact device already has, from a real
// email/password login that happened at least once.
//
// How it works:
// 1. Staff signs in with email/password (once, ever, per device).
// 2. They set a 4-digit PIN. We hash it (SHA-256 + device-local salt,
//    Web Crypto, never plaintext) and cache it alongside their
//    Supabase refresh token, IndexedDB, scoped to this browser/device.
// 3. Next time, tapping their name + entering the right PIN uses the
//    cached refresh token to restore THEIR session — no email/password
//    typing, no network password check, just a local unlock.
// 4. Refresh tokens rotate on use (Supabase default) — every time we
//    use one, we must overwrite the cache with the new one, or the
//    next unlock will fail.

const DB_NAME = 'sellaris-pin-auth'
const STORE_NAME = 'pin_profiles'
const DB_VERSION = 1

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'staffId' })
      }
    },
  })
}

async function hashPin(pin, staffId) {
  // staffId as salt: same PIN, different staff on the same device,
  // different hash — prevents trivially comparing hashes across profiles.
  const enc = new TextEncoder().encode(`${staffId}:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function savePinProfile({ staffId, name, businessName, pin, refreshToken }) {
  const db = await getDb()
  const pinHash = await hashPin(pin, staffId)
  await db.put(STORE_NAME, { staffId, name, businessName, pinHash, refreshToken, updatedAt: new Date().toISOString() })
}

export async function updateCachedToken(staffId, refreshToken) {
  const db = await getDb()
  const existing = await db.get(STORE_NAME, staffId)
  if (existing) {
    existing.refreshToken = refreshToken
    existing.updatedAt = new Date().toISOString()
    await db.put(STORE_NAME, existing)
  }
}

export async function listPinProfiles() {
  const db = await getDb()
  return db.getAll(STORE_NAME)
}

export async function hasPinProfile(staffId) {
  const db = await getDb()
  const existing = await db.get(STORE_NAME, staffId)
  return !!existing
}

// Returns the cached refresh token if the PIN matches this staff
// member's profile on this device, otherwise null.
export async function verifyPin(staffId, pin) {
  const db = await getDb()
  const profile = await db.get(STORE_NAME, staffId)
  if (!profile) return null
  const candidateHash = await hashPin(pin, staffId)
  return candidateHash === profile.pinHash ? profile.refreshToken : null
}

export async function removePinProfile(staffId) {
  const db = await getDb()
  await db.delete(STORE_NAME, staffId)
}
