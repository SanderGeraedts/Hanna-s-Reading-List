import type { Book } from '#/lib/library'
import { syncedShelf } from '#/lib/storytelImport'
import { pb, pocketbaseUrl } from './pocketbase'
import { LoginRejected, fetchShelf, unseal } from './storytel'

/**
 * The nightly Storytel sync (#77). At 23:00 Amsterdam time a Netlify scheduled
 * function (netlify/functions/nightly-storytel.mts) calls /api/nightly-storytel,
 * which runs this: for every account with a remembered Storytel login, fetch
 * the Storytel shelf and bring the books already on the shelf up to date
 * (status, progress and the reading log), so a day of listening is noted even
 * when Hanna doesn't open the app.
 *
 * Nobody is signed in at night, so the shelves are read and saved through two
 * routes on the account server that only answer with NIGHTLY_SECRET
 * (deploy/nas/pb_hooks/nightly.pb.js). PocketBase still only sees the sealed
 * login; it is opened here, with STORYTEL_COOKIE_SECRET.
 */

export const NIGHTLY_TIME_ZONE = 'Europe/Amsterdam'

interface NightlyShelf {
  /** the libraries record */
  id: string
  sealed: string
  /** when the shelf last changed: it is only saved if it hasn't changed since */
  updated: string
  books: Book[] | null
}

export interface NightlyResult {
  shelves: number
  synced: number
  skipped: number
  errors: string[]
}

export function nightlySecret() {
  return process.env.NIGHTLY_SECRET?.trim() || null
}

/** Compares without giving away how much of the secret was right. */
export function sameSecret(given: string | null, secret: string) {
  if (!given) return false
  const a = new TextEncoder().encode(given)
  const b = new TextEncoder().encode(secret)
  let diff = a.length ^ b.length
  for (let i = 0; i < b.length; i++) diff |= (a[i] ?? 0) ^ b[i]
  return diff === 0
}

export async function runNightlySync(secret: string): Promise<NightlyResult> {
  const result: NightlyResult = { shelves: 0, synced: 0, skipped: 0, errors: [] }
  if (!pocketbaseUrl()) {
    result.errors.push('No account server is set up.')
    return result
  }
  const headers = { 'x-nightly-secret': secret }
  const { items } = await pb<{ items: NightlyShelf[] }>('/api/nightly/shelves', { headers })
  for (const shelf of items) {
    result.shelves++
    try {
      const login = await unseal(shelf.sealed)
      if (!login) {
        result.skipped++
        continue
      }
      const fromStorytel = await fetchShelf(login)
      const before = Array.isArray(shelf.books) ? shelf.books : []
      const { books, summary } = await syncedShelf(fromStorytel, before, NIGHTLY_TIME_ZONE)
      if (summary.updated === 0 && JSON.stringify(books) === JSON.stringify(before)) {
        result.skipped++
        continue
      }
      await pb(`/api/nightly/shelves/${shelf.id}`, {
        method: 'POST',
        headers,
        body: { books, updated: shelf.updated },
      })
      result.synced++
    } catch (e) {
      // a changed Storytel password, or the shelf changed in the meantime: try again tomorrow
      const why = e instanceof LoginRejected ? 'Storytel no longer accepts the saved login' : String((e as Error)?.message ?? e)
      result.errors.push(`${shelf.id}: ${why}`)
    }
  }
  return result
}
