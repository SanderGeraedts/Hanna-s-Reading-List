import type { Book } from './library'
import { localDay } from './library'
import type { Streak } from './insights'

/**
 * The today dashboard (T-0124, D-0093): every card shows only its "today" part and hides on a
 * day it has nothing to say. The small sums behind that live here, so a test can read them.
 * Nothing here is saved: it is all worked out from her books and the date.
 */

/** How long a book has to be lent before Lent out says something on the dashboard. */
export const LONG_LENT_DAYS = 30

/** Pick of the day shows while she is reading fewer books than this. */
export const PICK_BELOW = 3

const MS_DAY = 86_400_000
const dayNumber = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / MS_DAY
const fromNumber = (n: number) => new Date(n * MS_DAY).toISOString().slice(0, 10)

export interface WeekDot {
  day: string
  /** M, T, W… */
  label: string
  read: boolean
  today: boolean
  future: boolean
}

/** This week, Monday to Sunday: which days she read on. */
export function weekDots(books: readonly Book[], today = localDay()): WeekDot[] {
  const read = new Set<string>()
  for (const b of books) for (const [d, amount] of Object.entries(b.readingLog ?? {})) if (amount > 0) read.add(d)
  const n = dayNumber(today)
  const weekday = (new Date(n * MS_DAY).getUTCDay() + 6) % 7 // Monday 0
  return Array.from({ length: 7 }, (_, i) => {
    const day = fromNumber(n - weekday + i)
    return { day, label: 'MTWTFSS'[i], read: read.has(day), today: day === today, future: day > today }
  })
}

/** "✓ Read today · 8 days in a row", or what keeps the streak going. */
export function streakLine(s: Streak): string {
  if (s.today) return s.current > 1 ? `✓ Read today · ${s.current} days in a row` : '✓ Read today'
  if (s.current > 0) return `🔥 ${s.current} ${s.current === 1 ? 'day' : 'days'} in a row, read today to make it ${s.current + 1}`
  return 'Read a little today to start a streak.'
}

/** Books lent at least a month ago: the only ones Lent out mentions on the dashboard. */
export function longLent(books: readonly Book[], today = localDay()): Book[] {
  const n = dayNumber(today)
  return books.filter((b) => {
    const since = b.lent?.since
    return !!since && /^\d{4}-\d{2}-\d{2}$/.test(since) && n - dayNumber(since) >= LONG_LENT_DAYS
  })
}

/** Books added to the shelf today. */
export function addedToday(books: readonly Book[], now = new Date()): Book[] {
  const today = localDay(now)
  return books.filter((b) => b.addedAt > 0 && localDay(new Date(b.addedAt)) === today && !b.wish)
}

/** "Set in Japan" for a book with a place, or nothing. */
export function placeLine(book: Book): string | null {
  const place = book.places?.find((p) => typeof p === 'string' && p.trim() !== '')
  return place ? `Set in ${place}` : null
}

export type PickKind = 'next' | 'again' | 'newforyou'
export const PICK_KINDS: readonly PickKind[] = ['next', 'again', 'newforyou']

/** The kind of pick for a day, taking turns; `another` steps on from it. */
export function pickKind(today: string, another = 0): PickKind {
  const start = Math.abs(Math.floor(dayNumber(today))) % PICK_KINDS.length
  return PICK_KINDS[(start + another) % PICK_KINDS.length]
}

/** Pick of the day shows while she has room for another book. */
export const showPick = (books: readonly Book[]) => books.filter((b) => b.status === 'reading').length < PICK_BELOW
