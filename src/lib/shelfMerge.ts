import type { Book } from './library'

/**
 * How a save from a device is folded into the shelf on the server, so a save
 * can never wipe out books it didn't mean to.
 *
 * A device says which server version its copy was based on (`base`) and which
 * books it removed on purpose since then (`removed`). Then:
 *
 * - a book on the server that the device doesn't send stays, unless the device
 *   removed it (or merged it into another book, see `mergedIds`);
 * - when the server copy changed since `base` (another device saved, the
 *   nightly Storytel sync ran, or the device's copy is simply stale), a book
 *   both have is taken from whichever edited it last (`editedAt`); with no
 *   newer edit on the device, the server's copy wins;
 * - books only the device has are added.
 *
 * So the worst a stale or mixed-up device can do is add books, never lose them.
 */

export interface IncomingShelf {
  books: Book[]
  /** the server's `updated` the device's copy was based on; null/undefined when unknown */
  base?: string | null
  /** ids the device removed (or merged away) since `base` */
  removed?: string[]
}

export interface ServerShelf {
  books: Book[]
  updated: string
}

export interface MergeResult {
  books: Book[]
  /** the result differs from what the device sent: it should take this copy */
  changed: boolean
  /** a book both had was taken from the server, or server books were kept */
  conflict: boolean
}

const editedAt = (b: Book) => b.editedAt ?? 0

export function mergeIntoServer(server: ServerShelf | null, incoming: IncomingShelf): MergeResult {
  if (!server) return { books: incoming.books, changed: false, conflict: false }
  const stale = !incoming.base || incoming.base !== server.updated
  const removed = new Set(incoming.removed ?? [])
  // every id the device's shelf accounts for, including books merged into others
  const accounted = new Set<string>()
  for (const b of incoming.books) {
    accounted.add(b.id)
    for (const id of b.mergedIds ?? []) accounted.add(id)
  }
  const serverById = new Map(server.books.map((b) => [b.id, b]))

  let changed = false
  const books = incoming.books.map((mine) => {
    const theirs = serverById.get(mine.id)
    // in step with the server: the device's edits are simply the newest
    if (!stale || !theirs || editedAt(mine) > editedAt(theirs)) return mine
    if (theirs !== mine && JSON.stringify(theirs) !== JSON.stringify(mine)) changed = true
    return theirs
  })
  let conflict = changed
  for (const b of server.books) {
    if (accounted.has(b.id) || removed.has(b.id)) continue
    books.push(b)
    changed = conflict = true
  }
  return { books, changed, conflict }
}
