import type { Book } from './library'

/**
 * Story tropes per book (D-0042). A trope is a plain string on the book, but
 * "enemies to lovers", "Enemies to Lovers" and "ENEMIES TO LOVERS" are one
 * trope to Hanna, so everything that compares, counts or suggests a trope goes
 * through this module: `foldTrope` decides when two tropes are the same, and
 * `canonicalTrope` decides which spelling is kept (the one it first got on the
 * shelf, or the ready list's).
 *
 * Tropes are never looked up anywhere: they are hers, typed by her.
 */

/** The ready list she picks from; her own words join the suggestions by being on a book. */
export const READY_TROPES = [
  'Enemies to lovers',
  'Found family',
  'Slow burn',
  'Chosen one',
  'Fake dating',
  'Grumpy/sunshine',
  'Morally grey',
  'Forced proximity',
  'Friends to lovers',
  'Second chance',
  'Love triangle',
  'Only one bed',
  'Secret identity',
  'Redemption arc',
  'Coming of age',
  'Quest',
  'Heist',
  'Time loop',
  'Unreliable narrator',
  'Dual timeline',
  'Locked room',
  'Academic rivals',
  'Marriage of convenience',
  'Touch her and you die',
]

/** The longest a trope may be; she can type anything, the chip must stay a chip. */
export const MAX_TROPE = 60

/**
 * How two tropes are compared: trimmed, inner whitespace collapsed, lower case
 * and without accents. Two tropes are the same trope when they fold the same.
 */
export function foldTrope(trope: string): string {
  return trope
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

/** The tropes of a book, never undefined; a book with `tropes: []` is a book with none. */
export const tropesOf = (book: Book): string[] => book.tropes ?? []

/** Whether a book has this trope (folded). */
export const hasTrope = (book: Book, trope: string): boolean => {
  const want = foldTrope(trope)
  return !!want && tropesOf(book).some((t) => foldTrope(t) === want)
}

/** Every trope in use on the shelf, in the spelling it has there, first use first. */
export function shelfTropes(books: Book[]): string[] {
  const seen = new Map<string, string>()
  for (const b of books) for (const t of tropesOf(b)) if (!seen.has(foldTrope(t))) seen.set(foldTrope(t), t)
  return [...seen.values()]
}

/**
 * The ready list plus every trope on the shelf, each once, alphabetically: what
 * the field suggests. The shelf's spelling wins over the ready list's, because
 * the spelling a trope first got on her shelf is the one that is kept (D-0042 §4).
 */
export function tropeSuggestions(books: Book[]): string[] {
  const all = new Map<string, string>()
  for (const t of shelfTropes(books)) all.set(foldTrope(t), t)
  for (const t of READY_TROPES) if (!all.has(foldTrope(t))) all.set(foldTrope(t), t)
  return [...all.values()].sort((a, b) => a.localeCompare(b))
}

/**
 * The spelling a typed trope is saved as (D-0042 §4): the one the shelf (or the
 * ready list) already uses, else what she typed with its first letter made a
 * capital when she typed it all lower case. Empty when there is nothing to add.
 */
export function canonicalTrope(typed: string, books: Book[]): string {
  const tidy = typed.trim().replace(/\s+/g, ' ').slice(0, MAX_TROPE)
  if (!tidy) return ''
  const folded = foldTrope(tidy)
  const known = tropeSuggestions(books).find((t) => foldTrope(t) === folded)
  if (known) return known
  return tidy === tidy.toLowerCase() ? tidy.charAt(0).toUpperCase() + tidy.slice(1) : tidy
}

/**
 * The patch that adds a typed trope to a book, or null when there is nothing to
 * do (empty, or the book already has it).
 */
export function addTrope(book: Book, typed: string, books: Book[]): Pick<Book, 'tropes'> | null {
  const name = canonicalTrope(typed, books)
  if (!name || hasTrope(book, name)) return null
  return { tropes: [...tropesOf(book), name] }
}

/** The patch that takes a trope off a book; the field goes away when it was the last one. */
export function removeTrope(book: Book, trope: string): Pick<Book, 'tropes'> {
  const gone = foldTrope(trope)
  const left = tropesOf(book).filter((t) => foldTrope(t) !== gone)
  return { tropes: left.length ? left : undefined }
}

export interface TropeCount {
  /** the spelling the shelf uses */
  name: string
  /** how many books */
  count: number
}

/**
 * How often each trope is used over a list of books, biggest first (ties
 * alphabetically). Each book counts once per trope, however it is spelled.
 */
export function tropeCounts(books: Book[]): TropeCount[] {
  const counts = new Map<string, TropeCount>()
  for (const b of books) {
    const seen = new Set<string>()
    for (const t of tropesOf(b)) {
      const key = foldTrope(t)
      if (!key || seen.has(key)) continue
      seen.add(key)
      const found = counts.get(key)
      if (found) found.count++
      else counts.set(key, { name: t, count: 1 })
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}
