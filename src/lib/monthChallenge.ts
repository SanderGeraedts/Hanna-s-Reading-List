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

/**
 * Where a monthly challenge's picks come from (T-0126, D-0094): the original Monthly challenge
 * keeps them on the books (`challengeMonth`); a monthly own challenge keeps them in itself. Both
 * read and work the same through this.
 */
export type PicksOf = (year: number) => Map<MonthKey, Book>

/** The picks of a monthly own challenge, for its own year only. */
export function ownMonthPicks(c: { year: number; months?: Record<string, string> }, books: Book[]): PicksOf {
  return (year) => {
    const out = new Map<MonthKey, Book>()
    if (year !== c.year) return out
    const byId = new Map(books.map((b) => [b.id, b]))
    for (const [m, id] of Object.entries(c.months ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
      const b = byId.get(id)
      if (b) out.set(monthKey(year, Number(m)), b)
    }
    return out
  }
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
export function challengeNow(books: Book[], today = localDay(), picksOf: PicksOf = (y) => challengeFor(books, y)): ChallengeNow {
  const sleep = sleepReadIds(books)
  const now = thisMonth(today)
  const year = Number(today.slice(0, 4))
  // last year's unfinished books carry over into this one
  const picks = [...picksOf(year - 1), ...picksOf(year)]
  const items = picks.filter(([m]) => m <= now).map(([m, b]) => itemFor(m, b, sleep))
  const next = picksOf(year + 1)
  return {
    open: items.filter((i) => !i.doneOn),
    current: items.find((i) => i.month === now),
    remindNextYear: today.slice(5, 7) === '12' && next.size === 0,
    notStarted: picksOf(year).size === 0 && next.size === 0,
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
export function challengeCalendar(books: Book[], year: number, today = localDay(), picksOf: PicksOf = (y) => challengeFor(books, y)): CalendarMonth[] {
  const sleep = sleepReadIds(books)
  const picks = picksOf(year)
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

/** A month can be picked or changed only before it starts, in every monthly challenge (T-0127, D-0095). */
export const canChange = (month: MonthKey, today = localDay()) => month > thisMonth(today)

/**
 * Whether a month's picking list is open (T-0128, D-0096): before the month starts, always; once
 * it has started, only while it has no book yet, so an empty month can still be filled. A book
 * picked into a started month is fixed from then on.
 */
export const canPick = (month: MonthKey, hasBook: boolean, today = localDay()) => canChange(month, today) || !hasBook

/**
 * Books that can be picked for a month: not finished, not a sleep read, not picked for another
 * month of the same challenge that year. Books that fit the challenge's rule (`hint`) come
 * first; any book can still be picked.
 */
export function pickable(books: Book[], month: MonthKey, picksOf: PicksOf = (y) => challengeFor(books, y), hint?: (b: Book) => boolean): Book[] {
  const sleep = sleepReadIds(books)
  const taken = new Set([...picksOf(Number(month.slice(0, 4)))].filter(([m]) => m !== month).map(([, b]) => b.id))
  const fit = (b: Book) => (hint && hint(b) ? 0 : 1)
  return books
    .filter((b) => b.status !== 'read' && !sleep.has(b.id) && !taken.has(b.id))
    .sort((a, b) => fit(a) - fit(b) || a.title.localeCompare(b.title))
}

/** The other monthly challenges that have this book in this month: their names, for the "also in" note. */
export function alsoIn(bookId: string, month: MonthKey, others: ReadonlyArray<{ name: string; picksOf: PicksOf }>): string[] {
  const year = Number(month.slice(0, 4))
  return others.filter((o) => o.picksOf(year).get(month)?.id === bookId).map((o) => o.name)
}

/** The changes that put `bookId` in `month` (or empty it with null): book id → patch. */
export function pickFor(books: Book[], month: MonthKey, bookId: string | null): Map<string, Partial<Book>> {
  const out = new Map<string, Partial<Book>>()
  for (const b of books) if (b.challengeMonth === month && b.id !== bookId) out.set(b.id, { challengeMonth: undefined })
  if (bookId) out.set(bookId, { challengeMonth: month })
  return out
}
