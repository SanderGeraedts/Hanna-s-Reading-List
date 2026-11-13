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

/**
 * "No spice": 0, set on purpose with the No spice button. A book without a
 * spice level (undefined) just hasn't been scored yet. Clearing the peppers
 * never stored 0, so no older book reads as No spice by itself.
 */
export const NO_SPICE = 0

/** The spice score: 0 for No spice, 1 to 5 peppers, or undefined when not scored. */
export const spiceScore = (n: unknown) => (n === NO_SPICE ? NO_SPICE : cleanSpice(n))

export function spiceText(s: number | undefined) {
  if (s === NO_SPICE) return 'No spice'
  if (!s) return 'Spice not scored'
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
