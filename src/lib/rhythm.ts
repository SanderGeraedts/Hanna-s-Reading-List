import type { Book } from './library'
import { localDay } from './library'

/**
 * When I read most: on which weekdays and in which months the reading log
 * has days with reading.
 *
 * On the dashboard it was weekdays over the last twelve months and months of
 * this year (`scope: 'recent'`). On the Stats page (T-0070) both follow the
 * year she picked, or all of her reading for All time (`scope: 'period'`).
 */

export const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export interface Rhythm {
  /** reading days per weekday, Monday first */
  weekdays: number[]
  /** reading days per month of the year, January first */
  months: number[]
  /** "You read most on Sundays.", or undefined without reading days */
  line?: string
}

const readingDays = (books: Book[]) => {
  const days = new Set<string>()
  for (const b of books) for (const [day, amount] of Object.entries(b.readingLog ?? {})) if (amount > 0) days.add(day)
  return days
}

export function rhythm(
  books: Book[],
  year: number | 'all',
  today = localDay(),
  scope: 'recent' | 'period' = 'recent',
): Rhythm {
  const days = readingDays(books)
  const from = `${Number(today.slice(0, 4)) - 1}${today.slice(4)}`
  const prefix = year === 'all' ? '' : `${year}-`
  const weekdays = Array(7).fill(0)
  const months = Array(12).fill(0)
  for (const day of days) {
    const d = new Date(`${day}T12:00:00Z`)
    const counts = scope === 'period' ? day.startsWith(prefix) : day > from && day <= today
    if (counts) weekdays[(d.getUTCDay() + 6) % 7]++
    if (day.startsWith(prefix)) months[d.getUTCMonth()]++
  }
  const best = Math.max(...weekdays)
  if (best === 0) return { weekdays, months }
  const tops = weekdays.map((n, i) => (n === best ? WEEKDAY_NAMES[i] + 's' : null)).filter(Boolean) as string[]
  const line =
    tops.length === 1
      ? `You read most on ${tops[0]}.`
      : tops.length === 7
        ? 'You read just as often on every day of the week.'
        : `You read most on ${tops.slice(0, -1).join(', ')} and ${tops.at(-1)}.`
  return { weekdays, months, line }
}
