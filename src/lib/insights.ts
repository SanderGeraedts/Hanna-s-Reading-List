import type { Book } from './library'
import { FORMAT_LABELS, formatsOf, timesRead } from './library'
import { languageName } from './languages'
import { listenOnly } from './listening'
import type { Quote } from './quotes'
import { quoteChoices } from './quotes'
import type { DayEntry } from './readingLog'
import { dayEntries } from './readingLog'
import { seriesGroups } from './series'
import type { Period } from './stats'
import { allFinishes, periodStats } from './stats'

/** The dashboard extras (#66). */

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// ---- books per month ---------------------------------------------------------

/** Times a book was finished in each month of a year (index 0 = January). */
export function monthlyCounts(books: Book[], year: number): number[] {
  const out = Array<number>(12).fill(0)
  for (const f of allFinishes(books)) {
    if (f.day?.startsWith(`${year}-`)) out[Number(f.day.slice(5, 7)) - 1]++
  }
  return out
}

// ---- what I read --------------------------------------------------------------

export interface Slice {
  label: string
  count: number
}

export type BreakdownKind = 'genre' | 'language' | 'format'

/**
 * The books read in a period by genre, language or format: the biggest
 * groups, the rest folded into "Other".
 */
export function breakdown(books: Book[], period: Period, by: BreakdownKind, top = 6): Slice[] {
  const counts = new Map<string, number>()
  for (const b of periodStats(books, period).list) {
    const labels =
      by === 'genre'
        ? b.genres?.length
          ? b.genres
          : ['No genre']
        : by === 'language'
          ? [b.language ? languageName(b.language) : 'Unknown']
          : formatsOf(b).length
            ? formatsOf(b).map((f) => FORMAT_LABELS[f])
            : ['Unknown']
    for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1)
  }
  const unknown = (l: string) => Number(l === 'No genre' || l === 'Unknown')
  // biggest first; equal groups alphabetically, with the unknown ones last
  const sorted = [...counts]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || unknown(a.label) - unknown(b.label) || a.label.localeCompare(b.label))
  if (sorted.length <= top) return sorted
  const rest = sorted.slice(top - 1).reduce((n, s) => n + s.count, 0)
  return [...sorted.slice(0, top - 1), { label: 'Other', count: rest }]
}

// ---- currently reading, the pile, lent out ----------------------------------------

export const reading = (books: Book[]) => books.filter((b) => b.status === 'reading')
export const paused = (books: Book[]) => books.filter((b) => b.status === 'paused')

export interface Pile {
  books: number
  pages: number
  minutes: number
  /** books finished per month over the last year, from noted dates */
  perMonth: number
  /** months to read the whole pile at that pace, when there is a pace */
  months?: number
}

export function wantPile(books: Book[], now = new Date()): Pile {
  const want = books.filter((b) => b.status === 'want')
  let pages = 0
  let minutes = 0
  for (const b of want) {
    if (listenOnly(b)) minutes += b.minutes ?? 0
    else pages += b.pages ?? 0
  }
  const yearAgo = ymd(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()))
  const today = ymd(now)
  const lastYear = allFinishes(books).filter((f) => f.day && f.day > yearAgo && f.day <= today).length
  const perMonth = lastYear / 12
  return {
    books: want.length,
    pages,
    minutes,
    perMonth,
    ...(perMonth > 0 && want.length > 0 && { months: Math.ceil(want.length / perMonth) }),
  }
}

export interface Lent {
  book: Book
  to: string
  /** days since it was lent, when the day is known */
  days?: number
}

export function lentOut(books: Book[], now = new Date()): Lent[] {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return books
    .filter((b) => b.lent)
    .map((b) => {
      const since = b.lent!.since
      const days = since ? Math.round((today - Date.parse(`${since}T00:00:00Z`)) / 86_400_000) : undefined
      return { book: b, to: b.lent!.to || 'someone', ...(days !== undefined && !Number.isNaN(days) && { days }) }
    })
    .sort((a, b) => (b.days ?? -1) - (a.days ?? -1))
}

// ---- series progress -------------------------------------------------------------

export interface SeriesProgress {
  name: string
  read: number
  total: number
  /** the books in series order */
  books: Book[]
}

/** Series she has started (a book read, being read or paused), unfinished ones first. */
export function seriesProgress(books: Book[]): SeriesProgress[] {
  const groups = seriesGroups(books)
  const byKey = new Map<string, SeriesProgress>()
  for (const b of books) {
    const g = groups.get(b.id)!
    if (!g.key) continue
    const s = byKey.get(g.key) ?? { name: g.name, read: 0, total: 0, books: [] }
    s.total++
    if (timesRead(b) > 0) s.read++
    s.books.push(b)
    byKey.set(g.key, s)
  }
  const started = [...byKey.values()].filter((s) =>
    s.books.some((b) => timesRead(b) > 0 || b.status === 'reading' || b.status === 'paused'),
  )
  for (const s of started) {
    s.books.sort((a, b) => (groups.get(a.id)!.index ?? 999) - (groups.get(b.id)!.index ?? 999))
  }
  return started.sort(
    (a, b) =>
      Number(a.read === a.total) - Number(b.read === b.total) ||
      b.read / b.total - a.read / a.total ||
      a.name.localeCompare(b.name),
  )
}

// ---- records ---------------------------------------------------------------------

export interface Records {
  longest?: Book
  shortest?: Book
  longestListen?: Book
  topAuthor?: { name: string; books: number }
  mostReread?: { book: Book; times: number }
}

/** Records among the books read in a period. */
export function records(books: Book[], period: Period): Records {
  const read = periodStats(books, period).list
  const paper = read.filter((b) => !listenOnly(b) && b.pages)
  const listened = read.filter((b) => listenOnly(b) && b.minutes)
  const byPages = [...paper].sort((a, b) => b.pages! - a.pages!)
  const authors = new Map<string, number>()
  for (const b of read) for (const a of b.authors.slice(0, 1)) authors.set(a, (authors.get(a) ?? 0) + 1)
  const top = [...authors].sort((a, b) => b[1] - a[1])[0]
  const reread = [...read].sort((a, b) => timesRead(b) - timesRead(a))[0]
  return {
    longest: byPages[0],
    shortest: byPages.length > 1 ? byPages.at(-1) : undefined,
    longestListen: [...listened].sort((a, b) => b.minutes! - a.minutes!)[0],
    ...(top && top[1] > 1 && { topAuthor: { name: top[0], books: top[1] } }),
    ...(reread && timesRead(reread) > 1 && { mostReread: { book: reread, times: timesRead(reread) } }),
  }
}

// ---- reading goal ------------------------------------------------------------------

export interface GoalProgress {
  done: number
  goal: number
  /** books she would have read by today at an even pace */
  expected: number
  /** done minus expected, rounded: positive is ahead of schedule */
  ahead: number
}

export function goalProgress(done: number, goal: number, year: number, now = new Date()): GoalProgress {
  const start = new Date(year, 0, 1).getTime()
  const end = new Date(year + 1, 0, 1).getTime()
  const share = Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)))
  const expected = goal * share
  return { done, goal, expected, ahead: Math.round(done - expected) }
}

// ---- streak ------------------------------------------------------------------------

export interface Streak {
  /** months in a row with a finished book, up to this month (or last month, while this one is still empty) */
  current: number
  best: number
}

export function readingStreak(books: Book[], now = new Date()): Streak {
  const months = new Set(allFinishes(books).flatMap((f) => (f.day ? [f.day.slice(0, 7)] : [])))
  const key = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`
  let y = now.getFullYear()
  let m = now.getMonth()
  if (!months.has(key(y, m))) {
    m--
    if (m < 0) [y, m] = [y - 1, 11]
  }
  let current = 0
  while (months.has(key(y, m))) {
    current++
    m--
    if (m < 0) [y, m] = [y - 1, 11]
  }
  let best = 0
  let run = 0
  let prev: number | null = null
  for (const k of [...months].sort()) {
    const n = Number(k.slice(0, 4)) * 12 + Number(k.slice(5, 7))
    run = prev !== null && n === prev + 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = n
  }
  return { current, best }
}

// ---- on this day ---------------------------------------------------------------------

/**
 * What she read, started or finished on this day of the year in earlier
 * years (#76), the latest first. Finishes from before the reading log count
 * too: the day she finished a book is a day she read in it.
 */
export function onThisDay(books: Book[], now = new Date()): Array<DayEntry & { year: number }> {
  const md = ymd(now).slice(4)
  const out: Array<DayEntry & { year: number }> = []
  for (const [day, list] of dayEntries(books, (d) => d.slice(4) === md && Number(d.slice(0, 4)) < now.getFullYear()))
    for (const e of list) out.push({ ...e, year: Number(day.slice(0, 4)) })
  return out.sort((a, b) => b.year - a.year)
}

// ---- year in review ----------------------------------------------------------------------

export interface YearReview {
  year: number
  books: number
  pages: number
  minutes: number
  topAuthor?: { name: string; books: number }
  longest?: Book
  /** 1-based month with the most finished books */
  busiestMonth?: { month: number; books: number }
  /** loved quotes, else any quotes, from books finished that year */
  quotes: Quote[]
}

export function yearReview(books: Book[], year: number): YearReview {
  const period: Period = { kind: 'year', year }
  const stats = periodStats(books, period)
  const rec = records(books, period)
  const monthly = monthlyCounts(books, year)
  const most = Math.max(...monthly)
  const ids = new Set(stats.list.map((b) => b.id))
  const quotes = quoteChoices(books).filter((q) => ids.has(q.book.id))
  const loved = quotes.filter((q) => q.book.lovedQuotes?.includes(q.text))
  return {
    year,
    books: stats.books,
    pages: stats.pages,
    minutes: stats.minutes,
    topAuthor: rec.topAuthor,
    longest: rec.longest,
    ...(most > 0 && { busiestMonth: { month: monthly.indexOf(most) + 1, books: most } }),
    quotes: (loved.length ? loved : quotes).slice(0, 3),
  }
}

// ---- loved quotes ---------------------------------------------------------------------------

/** Quotes she gave a heart, from books she has read. */
export const lovedQuotes = (books: Book[]) => quoteChoices(books).filter((q) => q.book.lovedQuotes?.includes(q.text))

/** The change to a book for loving a quote, or no longer loving it. */
export function toggleLoved(book: Book, text: string): Partial<Book> {
  const loved = book.lovedQuotes ?? []
  const next = loved.includes(text) ? loved.filter((t) => t !== text) : [...loved, text]
  return { lovedQuotes: next.length ? next : undefined }
}
