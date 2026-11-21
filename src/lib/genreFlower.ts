import type { Book } from './library'
import { periodStats } from './stats'

/**
 * The genre flower: the genres of the books Hanna finished, as petals (a
 * bigger petal is more books), for one year or all time. A book with
 * several genres counts for each; books without a genre get no petal.
 */

export interface Petal {
  genre: string
  count: number
}

/** At most this many petals; the rest is one "Other" petal. */
export const MAX_PETALS = 8

export function genrePetals(books: Book[], year: number | 'all'): { petals: Petal[]; books: number } {
  const list = periodStats(books, year === 'all' ? { kind: 'all' } : { kind: 'year', year }).list
  const count = new Map<string, number>()
  for (const b of list) for (const g of new Set(b.genres ?? [])) count.set(g, (count.get(g) ?? 0) + 1)
  const sorted = [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([genre, n]) => ({ genre, count: n }))
  if (sorted.length <= MAX_PETALS) return { petals: sorted, books: list.length }
  const top = sorted.slice(0, MAX_PETALS - 1)
  const rest = sorted.slice(MAX_PETALS - 1).reduce((a, p) => a + p.count, 0)
  return { petals: [...top, { genre: 'Other', count: rest }], books: list.length }
}

/** A petal's length, 0 to 1: by the square root, so a small genre still shows as a petal. */
export const petalLength = (count: number, max: number) => (max > 0 ? Math.max(0.35, Math.sqrt(count / max)) : 0)
