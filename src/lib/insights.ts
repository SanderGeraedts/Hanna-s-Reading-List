import type { Book } from './library'
import { FORMAT_LABELS, formatsOf, timesRead } from './library'
import { languageName } from './languages'
import { listenOnly } from './listening'
import type { PileKind } from './pileHeight'
import { audioMinutes, bookKinds, pileHeights } from './pileHeight'
import type { DayEntry } from './readingLog'
import { dayEntries } from './readingLog'
import { seriesGroups } from './series'
import type { Finish, Period } from './stats'
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
    // the hours are the 🎧 line's: every audiobook, by the same rule (D-0036)
    if (bookKinds(b).includes('audio')) minutes += audioMinutes(b)
    // the pages: real page counts of the books she doesn't only listen to (D-0008)
    if (!listenOnly(b)) pages += b.pages ?? 0
  }
  const perMonth = finishesLastYear(books, now).length / 12
  return {
    books: want.length,
    pages,
    minutes,
    perMonth,
    ...(perMonth > 0 && want.length > 0 && { months: Math.ceil(want.length / perMonth) }),
  }
}

/**
 * Every finish with a day after the same date a year ago and not after today
 * (local dates): re-reads count each time, sleep reads count, finishes without
 * a day don't, whatever the book's status now. The window of every pace (D-0031).
 */
export function finishesLastYear(books: Book[], now = new Date()): Finish[] {
  const yearAgo = ymd(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()))
  const today = ymd(now)
  return allFinishes(books).filter((f) => f.day !== undefined && f.day > yearAgo && f.day <= today)
}

export interface KindPace {
  kind: PileKind
  /** what is waiting: books for Paper and E-book, listening minutes for Audiobook */
  waiting: number
  /** a month over the last year: books finished for Paper and E-book, minutes listened for Audiobook */
  perMonth: number
  /** months to get through the waiting part at that pace, when there is a pace */
  months?: number
}

/** A kind's pace that has a time to show. */
export type KindPaceWithTime = KindPace & { months: number }

/**
 * The pace line of one kind under the pile switch (T-0024, D-0031): the
 * waiting books of that kind at the pace she finished books of that kind in
 * the last year; Audiobook in minutes (`audioMinutes`, as the 🎧 line).
 */
export function kindPace(books: Book[], kind: PileKind, now = new Date()): KindPace {
  const pile = pileHeights(books)
  const waiting = kind === 'audio' ? pile.audioMinutes : pile.counts[kind]
  let done = 0
  for (const f of finishesLastYear(books, now)) {
    if (!bookKinds(f.book).includes(kind)) continue
    done += kind === 'audio' ? audioMinutes(f.book) : 1
  }
  const perMonth = done / 12
  return {
    kind,
    waiting,
    perMonth,
    ...(perMonth > 0 && waiting > 0 && { months: Math.ceil(waiting / perMonth) }),
  }
}

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`

/** "7 months", "about 2 years": the time of a pace line, as All writes it. */
export function paceTime(months: number): string {
  return months < 12 ? plural(months, 'month') : `about ${plural(Math.round(months / 12), 'year')}`
}

/** A pace a month as the pace line writes it: one decimal, ".0" dropped ("1.1", "1", "0.3"). */
export function paceNumber(perMonth: number): string {
  return perMonth.toFixed(1).replace(/\.0$/, '')
}

/** The listening pace in hours as shown: "5.1", "14", at least "0.1". */
export function paceHours(minutesPerMonth: number): string {
  const h = paceNumber(minutesPerMonth / 60)
  return h === '0' ? '0.1' : h
}

const KIND_BOOKS: Record<Exclude<PileKind, 'audio'>, [string, string]> = {
  paper: ['paper book', 'paper books'],
  ebook: ['e-book', 'e-books'],
}

/** The words of a kind's pace line around the hours ("At your pace of " … " a month, …"); for books, all in `before`. */
export function kindPaceWords(p: KindPaceWithTime): { before: string; after: string } {
  if (p.kind === 'audio') return { before: 'At your pace of ', after: ` a month, that's ${paceTime(p.months)} of listening.` }
  const n = paceNumber(p.perMonth)
  const [one, many] = KIND_BOOKS[p.kind]
  return { before: `At your pace of ${n} ${n === '1' ? one : many}`, after: ` a month, that's ${paceTime(p.months)} of reading.` }
}

/** "At your pace of 5.1 h a month, that's 7 months of listening." Pass a non-breaking space as `space` for the screen. */
export function kindPaceText(p: KindPaceWithTime, space = ' '): string {
  const { before, after } = kindPaceWords(p)
  return p.kind === 'audio' ? `${before}${paceHours(p.perMonth)}${space}h${after}` : `${before}${after}`
}

/** What a screen reader hears: "At your pace of 5.1 hours a month, …", "1 hour". */
export function kindPaceSpoken(p: KindPaceWithTime): string {
  const { before, after } = kindPaceWords(p)
  return p.kind === 'audio' ? `${before}${hoursSpoken(paceHours(p.perMonth))}${after}` : `${before}${after}`
}

/** "5.1 hours", "1 hour" */
export function hoursSpoken(hours: string): string {
  return `${hours} ${hours === '1' ? 'hour' : 'hours'}`
}

/** The muted line for a kind with no finishes in the last year. */
export function noPaceLine(kind: PileKind): string {
  const what = kind === 'paper' ? 'a paper book' : kind === 'ebook' ? 'an e-book' : 'an audiobook'
  return `You haven't finished ${what} in the last year, so there's no pace yet.`
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
  /**
   * days in a row with reading, up to today; while today has none yet it
   * runs up to yesterday, so it stays alive until the day is over
   */
  current: number
  best: number
  /** read today already */
  today: boolean
}

/** Whole days since 1970 for a yyyy-mm-dd day, the same everywhere (no time zones or summer time). */
const dayNumber = (day: string) =>
  Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10))) / 86_400_000

/**
 * The daily reading streak (#75). A reading day is a day the progress of a
 * book moved: by hand, typed into the calendar, or by a Storytel sync. Those
 * are the days in the reading log (#76).
 */
export function readingStreak(books: Book[], now = new Date()): Streak {
  const days = new Set<number>()
  for (const b of books) for (const day of Object.keys(b.readingLog ?? {})) days.add(dayNumber(day))
  const todayN = dayNumber(ymd(now))
  const today = days.has(todayN)
  let current = 0
  for (let n = today ? todayN : todayN - 1; days.has(n); n--) current++
  let best = 0
  let run = 0
  let prev: number | null = null
  for (const n of [...days].sort((a, b) => a - b)) {
    run = prev !== null && n === prev + 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = n
  }
  return { current, best, today }
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

