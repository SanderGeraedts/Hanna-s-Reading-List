import type { Book } from './library'
import { localDay } from './library'
import { amountUnit } from './readingLog'
import { realDay } from './garden/seasons'

/**
 * Minutes a day (D-0061 §3): at least 20 minutes read or listened every day,
 * shown as a month grid that fills up.
 *
 * The reading log holds a *share* of a book per day, so a day's minutes are
 * that share times the book's length in minutes:
 *
 * - a book she listens to (`amountUnit` is `time`) brings its real minutes;
 * - a book with pages brings `pages × 1.5` minutes — Hanna's own number;
 * - a book with neither brings **nothing**, because the app does not know how
 *   long it is and guessing would put minutes in her grid she never read.
 *
 * Sleep reads count here: she really did read them, and this challenge is
 * about time on the page, not about which book it was.
 */

/** A paper page is about this many minutes (D-0061). Nowhere else. */
export const MINUTES_PER_PAGE = 1.5

/** The daily target. */
export const MINUTES_GOAL = 20

/**
 * How many days of a year must have happened before a clean sheet counts as
 * finished. Without it one good day on 1 January would finish the challenge
 * and set off the confetti (D-0060). Four weeks is the smallest stretch that
 * feels like a habit; it is a constant, so it is easy to change.
 */
export const MINUTES_MIN_DAYS = 28

/** How many minutes one book's whole length is worth, or 0 when it is unknown. */
export function bookMinutes(book: Book): number {
  switch (amountUnit(book)) {
    case 'time':
      return book.minutes && book.minutes > 0 ? book.minutes : 0
    case 'pages':
      return book.pages && book.pages > 0 ? book.pages * MINUTES_PER_PAGE : 0
    default:
      return 0
  }
}

/** Minutes per day over the whole shelf: `yyyy-mm-dd` → minutes. Days that do not exist are left out. */
export function minutesByDay(books: Book[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const b of books) {
    const length = bookMinutes(b)
    if (!length) continue
    for (const [day, share] of Object.entries(b.readingLog ?? {})) {
      if (!(share > 0) || !realDay(day)) continue
      out.set(day, (out.get(day) ?? 0) + share * length)
    }
  }
  return out
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const isLeap = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
/** How many days a month really has (February in a leap year has 29). */
export const daysInMonth = (year: number, month: number) =>
  month === 2 && isLeap(year) ? 29 : DAYS_IN_MONTH[month - 1]

export interface MinuteDay {
  /** yyyy-mm-dd */
  day: string
  /** day of the month, 1-based */
  date: number
  minutes: number
  /** reached the target */
  reached: boolean
  /** the day has not happened yet */
  future: boolean
  today: boolean
}

export interface MinutesMonth {
  year: number
  month: number
  days: MinuteDay[]
  /** how many days of this month reached the target */
  reached: number
  /** how many days of this month have happened */
  happened: number
}

/** One month of the grid. */
export function minutesMonth(books: Book[], year: number, month: number, today = localDay(), minutes = minutesByDay(books)): MinutesMonth {
  const days: MinuteDay[] = []
  let reached = 0
  let happened = 0
  for (let d = 1; d <= daysInMonth(year, month); d++) {
    const day = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const m = minutes.get(day) ?? 0
    const future = day > today
    const hit = !future && m >= MINUTES_GOAL
    if (!future) happened++
    if (hit) reached++
    days.push({ day, date: d, minutes: m, reached: hit, future, today: day === today })
  }
  return { year, month, days, reached, happened }
}

export interface MinutesProgress {
  /** days of the year that reached the target */
  done: number
  /** days of the year that have happened */
  goal: number
  complete: boolean
}

/**
 * The year's score: days reached against the days of that year that have
 * already happened, so a year in progress is not measured against 365.
 */
export function minutesYear(books: Book[], year: number, today = localDay()): MinutesProgress {
  const minutes = minutesByDay(books)
  let done = 0
  let goal = 0
  for (let month = 1; month <= 12; month++) {
    const m = minutesMonth(books, year, month, today, minutes)
    done += m.reached
    goal += m.happened
  }
  return { done, goal, complete: goal >= MINUTES_MIN_DAYS && done >= goal }
}
