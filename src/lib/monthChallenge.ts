import type { Book } from './library'
import { localDay } from './library'
import { sleepReadIds } from './sleepSeries'

/**
 * The monthly reading challenge (#144): one book picked for each month of a
 * year. A book remembers its month (`challengeMonth`, "2027-03"), so the
 * challenge is the same on every device.
 *
 * - A month's book is done once it's finished in or after the challenge
 *   year; finishing it before its month counts (a free month later),
 *   finishing it after its month counts too, marked late.
 * - An unfinished book carries over: it stays on the dashboard until it's
 *   finished, next to the next month's book.
 * - Months that haven't started can still be changed; started ones can't.
 * - Sleep reads don't count, and can't be picked.
 * - In December, a reminder shows until next year has a book.
 */

export type MonthKey = string // "2027-03"

export const monthKey = (year: number, month: number): MonthKey => `${year}-${String(month).padStart(2, '0')}`
export const thisMonth = (today = localDay()): MonthKey => today.slice(0, 7)

export interface ChallengeItem {
  month: MonthKey
  book: Book
  /** finished: the day */
  doneOn?: string
  /** finished after its month */
  late: boolean
}

/** The books picked for a year's months, one per month (the first if there are two). */
export function challengeFor(books: Book[], year: number): Map<MonthKey, Book> {
  const out = new Map<MonthKey, Book>()
  for (const b of [...books].sort((a, b) => a.addedAt - b.addedAt))
    if (b.challengeMonth?.startsWith(`${year}-`) && !out.has(b.challengeMonth)) out.set(b.challengeMonth, b)
  return new Map([...out].sort(([a], [b]) => a.localeCompare(b)))
}

/** Where a challenge book stands: done (when), and whether that was late. */
export function itemFor(month: MonthKey, book: Book, sleep: Set<string>): ChallengeItem {
  const year = month.slice(0, 4)
  // a sleep read doesn't count, not even its first read
  const doneOn = sleep.has(book.id) ? undefined : (book.finished ?? []).filter((d) => d >= `${year}-01-01`).sort()[0]
  return { month, book, ...(doneOn && { doneOn }), late: !!doneOn && doneOn.slice(0, 7) > month }
}

export interface ChallengeNow {
  /** books of this month and earlier ones still to finish, oldest first */
  open: ChallengeItem[]
  /** this month's book, also when it's done */
  current?: ChallengeItem
  /** December, and next year has no book yet */
  remindNextYear: boolean
  /** no book picked for this year or next: the challenge isn't in use yet */
  notStarted: boolean
}

/** What the dashboard shows today. */
export function challengeNow(books: Book[], today = localDay()): ChallengeNow {
  const sleep = sleepReadIds(books)
  const now = thisMonth(today)
  const year = Number(today.slice(0, 4))
  // last year's unfinished books carry over into this one
  const picks = [...challengeFor(books, year - 1), ...challengeFor(books, year)]
  const items = picks.filter(([m]) => m <= now).map(([m, b]) => itemFor(m, b, sleep))
  const next = challengeFor(books, year + 1)
  return {
    open: items.filter((i) => !i.doneOn),
    current: items.find((i) => i.month === now),
    remindNextYear: today.slice(5, 7) === '12' && next.size === 0,
    notStarted: challengeFor(books, year).size === 0 && next.size === 0,
  }
}

export interface CalendarMonth {
  month: MonthKey
  /** the book picked for it, and whether (and when) it's done */
  item?: ChallengeItem
  /** this month */
  current: boolean
  /** over: the month has ended */
  past: boolean
}

/**
 * The year as a calendar of twelve months (#154), so the block stays on the
 * dashboard: each month with its book, done ones marked.
 */
export function challengeCalendar(books: Book[], year: number, today = localDay()): CalendarMonth[] {
  const sleep = sleepReadIds(books)
  const picks = challengeFor(books, year)
  const now = thisMonth(today)
  return Array.from({ length: 12 }, (_, i) => {
    const month = monthKey(year, i + 1)
    const book = picks.get(month)
    return {
      month,
      ...(book && { item: itemFor(month, book, sleep) }),
      current: month === now,
      past: month < now,
    }
  })
}

/** A month can still be changed while it hasn't started. */
export const canChange = (month: MonthKey, today = localDay()) => month > thisMonth(today)

/** Books that can be picked for a month: not finished, not a sleep read, not picked for another month that year. */
export function pickable(books: Book[], month: MonthKey): Book[] {
  const sleep = sleepReadIds(books)
  const taken = new Set(
    books.filter((b) => b.challengeMonth?.startsWith(month.slice(0, 5)) && b.challengeMonth !== month).map((b) => b.id),
  )
  return books
    .filter((b) => b.status !== 'read' && !sleep.has(b.id) && !taken.has(b.id))
    .sort((a, b) => a.title.localeCompare(b.title))
}

/** The changes that put `bookId` in `month` (or empty it with null): book id → patch. */
export function pickFor(books: Book[], month: MonthKey, bookId: string | null): Map<string, Partial<Book>> {
  const out = new Map<string, Partial<Book>>()
  for (const b of books) if (b.challengeMonth === month && b.id !== bookId) out.set(b.id, { challengeMonth: undefined })
  if (bookId) out.set(bookId, { challengeMonth: month })
  return out
}
