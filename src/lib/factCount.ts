import type { Book } from './library'
import { localDay } from './library'

/**
 * How many facts she has been given — the counting, with none of the text
 * (D-0079, D-0080 §3).
 *
 * This is its own little module so that the page can keep her mark up to date
 * (`useFactMark`) without pulling in the 625 book facts and 212 general ones,
 * which are 34 kB of the download. The lists now travel with the dashboard and
 * the calendar, which are the only places that show a fact.
 */

/** Every reading day up to today, oldest first. */
export function readingDays(books: Book[], todayKey: string): string[] {
  const days = new Set<string>()
  for (const b of books) for (const day of Object.keys(b.readingLog ?? {})) if (day <= todayKey) days.add(day)
  return [...days].sort()
}

/**
 * How many facts she has been given: her reading days, or the mark she has
 * already reached, whichever is further on (D-0079). Only ever goes forward, so
 * correcting a past day down to nothing, sliding a book back or removing a book
 * can never hand her a fact she has already had.
 */
export const factCount = (days: readonly string[], seen = 0) => Math.max(days.length, seen)

/** How many facts she has been given: her reading days up to today, and the mark. */
export const factsUnlocked = (books: Book[], now = new Date(), seen = 0) =>
  factCount(readingDays(books, localDay(now)), seen)
