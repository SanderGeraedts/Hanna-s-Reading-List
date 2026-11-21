import type { Book } from './library'
import { localDay } from './library'

/**
 * Finish estimates: when Hanna will finish a book at the pace she's reading
 * it, and where her reading goal is heading. No timer: the pace comes from
 * the reading log (how much of the book she read each day).
 */

/** Days the pace looks back over, and the reading days it needs before it says anything. */
export const PACE_DAYS = 14
export const MIN_READING_DAYS = 3

const dayNumber = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86_400_000
const fromNumber = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10)

/**
 * Days until she finishes the book at her pace: how much of it she read per
 * day over the last 14 days, days without reading included (so the date is
 * realistic). Null when there's too little to go on (fewer than 3 reading
 * days), she isn't reading it, it's done, or it's more than a year away.
 */
export function daysToFinish(book: Book, today = localDay()): number | null {
  if (book.status !== 'reading') return null
  const left = 1 - (book.progress ?? 0)
  if (left <= 0) return null
  const now = dayNumber(today)
  let read = 0
  let days = 0
  for (const [day, amount] of Object.entries(book.readingLog ?? {})) {
    const ago = now - dayNumber(day)
    if (ago < 0 || ago >= PACE_DAYS || amount <= 0) continue
    read += amount
    days++
  }
  if (days < MIN_READING_DAYS || read <= 0) return null
  const n = Math.ceil(left / (read / PACE_DAYS))
  return n > 365 ? null : n
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "today", "tomorrow", a weekday within the week, otherwise "12 Dec". */
export function dayText(daysAhead: number, today = localDay()): string {
  if (daysAhead <= 0) return 'today'
  if (daysAhead === 1) return 'tomorrow'
  const d = fromNumber(dayNumber(today) + daysAhead)
  const date = new Date(`${d}T12:00:00Z`)
  if (daysAhead <= 6) return WEEKDAYS[date.getUTCDay()]
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`
}

/** "About 4 days left at your pace", for the quick update card. */
export function daysLeftText(days: number): string {
  if (days <= 1) return 'You could finish it today at your pace'
  return `About ${days} days left at your pace`
}

/**
 * Where the year's goal is heading at the pace of the books finished so far
 * this year: the day she'd reach it, or how many she'd end the year at.
 * Null when it's already reached, nothing's finished yet, or it isn't this year.
 */
export function goalForecast(done: number, goal: number, year: number, today = localDay()): string | null {
  if (!today.startsWith(`${year}-`) || done <= 0 || done >= goal) return null
  const start = dayNumber(`${year}-01-01`)
  const end = dayNumber(`${year + 1}-01-01`)
  const sofar = dayNumber(today) - start + 1
  const perDay = done / sofar
  const reach = Math.ceil((goal - done) / perDay)
  if (dayNumber(today) + reach < end) return `At this pace you'll reach your goal around ${dayText(reach, today)}`
  const total = Math.floor(done + perDay * (end - dayNumber(today) - 1))
  return `At this pace you'll end the year at ${total} of ${goal}`
}
