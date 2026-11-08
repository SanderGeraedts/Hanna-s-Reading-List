import type { Book } from './library'
import { localDay } from './library'
import { formatDuration, listenOnly, parseDuration } from './listening'
import { percentText, progressFromPercent } from './progress'

/**
 * The reading log (#76): how much of a book Hanna read on each day, and the
 * days she started it. Every change of progress notes what it moved on for
 * that day, whether she moved it by hand or Storytel did; in the dashboard
 * calendar she can also type in how much she read on a day.
 */

const clamp = (n: number) => Math.min(1, Math.max(0, n))
const round = (n: number) => Math.round(n * 10_000) / 10_000
/** less than this is nothing (rounding) */
const EPS = 0.00005

function logPatch(book: Book, day: string, amount: number): Pick<Book, 'readingLog'> {
  const log = { ...(book.readingLog ?? {}) }
  if (amount > EPS) log[day] = round(amount)
  else delete log[day]
  return { readingLog: Object.keys(log).length ? log : undefined }
}

/**
 * The change for moving a book's progress to `progress` on `day`: how far it
 * moved on is added to that day. Moving it back takes off that day's amount
 * (a slip of the slider), but never below nothing.
 */
export function progressPatch(book: Book, progress: number, day = localDay()): Partial<Book> {
  const p = round(clamp(progress))
  const moved = p - (book.progress ?? 0)
  if (Math.abs(moved) <= EPS) return book.progress === p ? {} : { progress: p }
  return { progress: p, ...logPatch(book, day, (book.readingLog?.[day] ?? 0) + moved) }
}

/**
 * The change for setting how much of a book she read on `day`, from the
 * calendar. A book she is reading moves on (or back) by the difference.
 */
export function dayAmountPatch(book: Book, day: string, amount: number): Partial<Book> {
  const a = clamp(amount)
  const before = book.readingLog?.[day] ?? 0
  const moves = book.status === 'reading' || book.status === 'paused'
  return {
    ...logPatch(book, day, a),
    ...(moves && { progress: round(clamp((book.progress ?? 0) + a - before)) }),
  }
}

/** How an amount read is typed and shown for a book: pages, listening time, or a percentage. */
export type AmountUnit = 'pages' | 'time' | 'percent'

export function amountUnit(book: Book): AmountUnit {
  if (book.minutes && (listenOnly(book) || !book.pages)) return 'time'
  if (book.pages) return 'pages'
  return 'percent'
}

/** "30 pages", "1 h 20 min" or "12%". */
export function amountText(book: Book, amount: number): string {
  switch (amountUnit(book)) {
    case 'pages': {
      const n = Math.max(1, Math.round(amount * book.pages!))
      return `${n} ${n === 1 ? 'page' : 'pages'}`
    }
    case 'time':
      return formatDuration(Math.max(1, Math.round(amount * book.minutes!)))
    case 'percent':
      return `${percentText(amount)}%`
  }
}

/** What to put in the field for an amount: "30", "1 h 20 min" or "12". */
export function amountDraft(book: Book, amount: number): string {
  if (!amount) return ''
  const unit = amountUnit(book)
  if (unit === 'pages') return String(Math.round(amount * book.pages!))
  if (unit === 'time') return formatDuration(Math.round(amount * book.minutes!))
  return percentText(amount)
}

/** The share of the book in what she typed (pages, a time, or a percentage); 0 for nothing, null when it isn't one. */
export function amountFromText(book: Book, text: string): number | null {
  const s = text.trim()
  if (!s || /^0+([.,]0*)?\s*%?$/.test(s)) return 0
  switch (amountUnit(book)) {
    case 'pages':
      return /^\d+$/.test(s) ? clamp(Number(s) / book.pages!) : null
    case 'time': {
      const m = parseDuration(s)
      return m === null ? null : clamp(m / book.minutes!)
    }
    case 'percent':
      return progressFromPercent(s)
  }
}

// ---- the calendar ------------------------------------------------------------------------

/** What happened with a book on one day. */
export interface DayEntry {
  book: Book
  /** share of the book read that day */
  amount?: number
  started?: boolean
  finished?: boolean
}

const monthPrefix = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}-`

/** Every day with something in it, as yyyy-mm-dd → entries (books in shelf order). */
export function dayEntries(books: Book[], match: (day: string) => boolean): Map<string, DayEntry[]> {
  const out = new Map<string, DayEntry[]>()
  const entry = (day: string, book: Book) => {
    const list = out.get(day) ?? []
    let e = list.find((x) => x.book === book)
    if (!e) list.push((e = { book }))
    out.set(day, list)
    return e
  }
  for (const book of books) {
    for (const [day, amount] of Object.entries(book.readingLog ?? {})) if (match(day)) entry(day, book).amount = amount
    for (const day of book.started ?? []) if (match(day)) entry(day, book).started = true
    for (const day of book.finished ?? []) if (match(day)) entry(day, book).finished = true
  }
  return out
}

/** What happened on each day of a month (1-based), for the calendar. */
export function monthEntries(books: Book[], year: number, month: number): Map<number, DayEntry[]> {
  const prefix = monthPrefix(year, month)
  const out = new Map<number, DayEntry[]>()
  for (const [day, list] of dayEntries(books, (d) => d.startsWith(prefix))) out.set(Number(day.slice(8, 10)), list)
  return out
}

/** The books started in a month, the first started first. */
export function startedIn(books: Book[], year: number, month: number): Array<{ book: Book; day: string }> {
  const prefix = monthPrefix(year, month)
  return books
    .flatMap((book) => (book.started ?? []).filter((d) => d.startsWith(prefix)).map((day) => ({ book, day })))
    .sort((a, b) => a.day.localeCompare(b.day))
}

/** The books she could have read on a day: the ones she is reading, and any already noted that day. */
export function loggableBooks(books: Book[], day: string): Book[] {
  return books.filter(
    (b) =>
      b.status === 'reading' ||
      b.status === 'paused' ||
      b.readingLog?.[day] !== undefined ||
      b.started?.includes(day) ||
      b.finished?.includes(day),
  )
}
