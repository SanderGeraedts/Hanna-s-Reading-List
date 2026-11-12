import type { Book } from './library'
import type { Period } from './stats'
import { periodStats } from './stats'

/**
 * Star ratings (#100): half a star to five stars, in halves. No rating is
 * undefined (not 0), so an unrated book doesn't sort as a bad one.
 */
export const MAX_STARS = 5

/** A rating made safe: the nearest half star from ½ to 5, or undefined for none. */
export function cleanRating(n: unknown, step = 0.5): number | undefined {
  if (typeof n !== 'number' || !Number.isFinite(n)) return undefined
  const r = Math.round(n / step) * step
  return r <= 0 ? undefined : Math.min(MAX_STARS, r)
}

/** The spice level (how steamy a book is): 1 to 5 peppers, whole ones only. */
export const cleanSpice = (n: unknown) => cleanRating(n, 1)

export function spiceText(s: number | undefined) {
  if (!s) return 'No spice level'
  return `Spice ${s} of ${MAX_STARS}`
}

export function ratingText(r: number | undefined) {
  if (!r) return 'Not rated'
  return `${String(r).replace('.5', '½')} ${r === 1 ? 'star' : 'stars'}`
}

/**
 * Her favourites among the books she finished in `period`: best rated
 * first, and of two with the same rating the one she finished last.
 */
export function topRated(books: Book[], period: Period, n = 5): Book[] {
  const read = periodStats(books, period).list // latest finish first
  return read
    .filter((b) => cleanRating(b.rating))
    .map((b, i) => ({ b, i }))
    .sort((x, y) => cleanRating(y.b.rating)! - cleanRating(x.b.rating)! || x.i - y.i)
    .slice(0, n)
    .map(({ b }) => b)
}
