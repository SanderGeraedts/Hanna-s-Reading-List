import type { Book } from './library'
import { timesRead } from './library'
import { listenOnly } from './listening'

/**
 * Counting for the dashboard (#59): how many books Hanna read in a year, a
 * month or all time, and which day she finished each one.
 */

export type Period = { kind: 'all' } | { kind: 'year'; year: number } | { kind: 'month'; year: number; month: number }

/** One time a book was finished. `day` is yyyy-mm-dd, or undefined when she didn't note the day. */
export interface Finish {
  book: Book
  day?: string
}

/** Every time a book was finished. Finishes from before dates were noted have no day. */
export function allFinishes(books: Book[]): Finish[] {
  const out: Finish[] = []
  for (const book of books) {
    const days = [...(book.finished ?? [])].sort()
    const reads = Math.max(timesRead(book), days.length)
    for (let i = 0; i < reads; i++) out.push({ book, day: days[i] })
  }
  return out
}

const inPeriod = (day: string, p: Period) =>
  p.kind === 'all' ||
  (p.kind === 'year' && day.startsWith(`${p.year}-`)) ||
  (p.kind === 'month' && day.startsWith(`${p.year}-${String(p.month).padStart(2, '0')}-`))

export interface PeriodStats {
  /** different books finished */
  books: number
  /** times a book was finished, re-reads included */
  reads: number
  pages: number
  /** listening time of the audiobooks among them */
  minutes: number
  /** the books, latest finish first (those without a day last) */
  list: Book[]
}

export function periodStats(books: Book[], p: Period): PeriodStats {
  const finishes = allFinishes(books).filter((f) => p.kind === 'all' || (f.day && inPeriod(f.day, p)))
  const last = new Map<string, string>()
  for (const f of finishes) {
    const prev = last.get(f.book.id)
    if (prev === undefined || (f.day ?? '') > prev) last.set(f.book.id, f.day ?? '')
  }
  const list = books.filter((b) => last.has(b.id)).sort((a, b) => last.get(b.id)!.localeCompare(last.get(a.id)!))
  let pages = 0
  let minutes = 0
  for (const f of finishes) {
    // a book she only listens to counts as listening time; its pages are its minutes (#51)
    if (listenOnly(f.book)) minutes += f.book.minutes ?? 0
    else pages += f.book.pages ?? 0
  }
  return { books: list.length, reads: finishes.length, pages, minutes, list }
}

/** Years with a noted finish, newest first, always including this year. */
export function readingYears(books: Book[], now = new Date()): number[] {
  const years = new Set([now.getFullYear()])
  for (const f of allFinishes(books)) if (f.day) years.add(Number(f.day.slice(0, 4)))
  return [...years].sort((a, b) => b - a)
}

/** The books finished on each day of a month (1-based), for the calendar. */
export function finishedByDay(books: Book[], year: number, month: number): Map<number, Book[]> {
  const out = new Map<number, Book[]>()
  for (const f of allFinishes(books)) {
    if (!f.day || !inPeriod(f.day, { kind: 'month', year, month })) continue
    const d = Number(f.day.slice(8, 10))
    const list = out.get(d) ?? []
    if (!list.includes(f.book)) list.push(f.book)
    out.set(d, list)
  }
  return out
}

/**
 * The weeks of a month for a calendar starting on Monday: each week is seven
 * day numbers, with null for days outside the month.
 */
export function monthWeeks(year: number, month: number): Array<Array<number | null>> {
  const first = new Date(year, month - 1, 1)
  const days = new Date(year, month, 0).getDate()
  const lead = (first.getDay() + 6) % 7
  const cells: Array<number | null> = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)
  const weeks: Array<Array<number | null>> = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}
