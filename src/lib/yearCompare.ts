import type { Book } from './library'
import type { Period } from './stats'
import { periodStats } from './stats'

/**
 * The Stats page's year picker and its "compare with" year (T-0070, D-0060).
 *
 * One year (or all time) drives every number and chart on the page; a second
 * year, when she picks one, is shown beside each number as "↑ 12 vs 2025".
 * Nothing here knows about the screen: the page asks for the numbers and the
 * words, and draws them.
 */

/** A year with data, or all of it together. */
export type StatsYear = number | 'all'

export const statsPeriod = (year: StatsYear): Period => (year === 'all' ? { kind: 'all' } : { kind: 'year', year })

/** "2026", or "all time" for the label under a number. */
export const yearLabel = (year: StatsYear): string => (year === 'all' ? 'all time' : String(year))

/** The days her reading log has something on, in a year (or ever). */
export function readingDays(books: Book[], year: StatsYear): number {
  const days = new Set<string>()
  const prefix = year === 'all' ? '' : `${year}-`
  for (const b of books)
    for (const [day, amount] of Object.entries(b.readingLog ?? {}))
      if (amount > 0 && day.startsWith(prefix)) days.add(day)
  return days.size
}

export interface YearNumbers {
  books: number
  pages: number
  /** whole hours listened, rounded */
  hours: number
  readingDays: number
}

/** The four headline numbers of a year (or of all time). */
export function yearNumbers(books: Book[], year: StatsYear): YearNumbers {
  const s = periodStats(books, statsPeriod(year))
  return { books: s.books, pages: s.pages, hours: Math.round(s.minutes / 60), readingDays: readingDays(books, year) }
}

export interface CompareLine {
  /** what is drawn: "↑ 12 vs 2025". The arrow is decorative. */
  text: string
  /** what a screen reader hears: "12 more than in 2025". */
  spoken: string
  /** up, down, level, or the other year has nothing */
  kind: 'up' | 'down' | 'same' | 'none'
}

/**
 * One number next to another year's. `then` is undefined when no year is being
 * compared, and the line is left out; a compare year with nothing at all reads
 * "2025: nothing", which is kinder than "↓ 48".
 */
export function compareLine(now: number, then: number | undefined, thenYear: number | undefined): CompareLine | null {
  if (then === undefined || thenYear === undefined) return null
  if (then === 0 && now === 0) return { text: `${thenYear}: nothing`, spoken: `nothing in ${thenYear}`, kind: 'none' }
  if (then === 0) return { text: `${thenYear}: nothing`, spoken: `nothing in ${thenYear}`, kind: 'none' }
  const diff = now - then
  const n = Math.abs(diff).toLocaleString('en-GB')
  if (diff === 0) return { text: `same as ${thenYear}`, spoken: `the same as in ${thenYear}`, kind: 'same' }
  if (diff > 0) return { text: `↑ ${n} vs ${thenYear}`, spoken: `${n} more than in ${thenYear}`, kind: 'up' }
  return { text: `↓ ${n} vs ${thenYear}`, spoken: `${n} fewer than in ${thenYear}`, kind: 'down' }
}

/** The years she can compare with: every year with data except the one she is looking at. */
export const compareChoices = (years: number[], year: StatsYear): number[] =>
  year === 'all' ? [] : years.filter((y) => y !== year)
