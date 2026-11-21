import type { Book } from './library'
import { periodStats } from './stats'

/**
 * Pages per month (reading in pictures, part 3): the pages of the books
 * Hanna finished each month, and the hours she listened, for one year.
 * A book counts in the month she finished it (as on the rest of the dashboard).
 */
export interface MonthAmount {
  month: number
  pages: number
  /** listening time in minutes */
  minutes: number
}

export function monthlyAmounts(books: Book[], year: number): MonthAmount[] {
  return Array.from({ length: 12 }, (_, i) => {
    const s = periodStats(books, { kind: 'month', year, month: i + 1 })
    return { month: i + 1, pages: s.pages, minutes: s.minutes }
  })
}

/** A round top for the chart's scale: 1,000 / 2,000 / 2,500 / 5,000 … */
export function niceMax(n: number): number {
  if (n <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(n))
  for (const step of [1, 2, 2.5, 5, 10]) if (n <= step * p) return step * p
  return 10 * p
}
