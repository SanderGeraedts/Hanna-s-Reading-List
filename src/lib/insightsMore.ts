import type { Book } from './library'
import { localDay, timesRead } from './library'
import { thicknessPages } from './listening'
import { cleanRating, cleanSpice, topRated } from './ratings'
import { amountUnit } from './readingLog'
import { breakdown, monthlyCounts } from './insights'
import { bingoYear } from './bingo'
import type { Period } from './stats'
import { periodStats } from './stats'

/**
 * More for the dashboard: when a book will be finished, a year of reading
 * days, favourite authors, the spice meter, the year in review and the pace
 * towards the goal. Book bingo is in bingo.ts.
 */

// ---- days ---------------------------------------------------------------------

/** Whole days since 1970 for a yyyy-mm-dd day (no time zones or summer time). */
export const dayNumber = (day: string) =>
  Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10))) / 86_400_000

/** The yyyy-mm-dd day of a day number. */
export const dayOf = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10)

export const addDays = (day: string, n: number) => dayOf(dayNumber(day) + n)

/** 0 for Monday … 6 for Sunday. */
const weekday = (day: string) => (new Date(dayNumber(day) * 86_400_000).getUTCDay() + 6) % 7

// ---- finish-by estimate ------------------------------------------------------------

/** How many days back the pace is taken from. */
export const PACE_WINDOW = 14

export type FinishEstimate =
  | {
      book: Book
      known: true
      /** the day she will likely finish it, yyyy-mm-dd */
      day: string
      /** days from today: 0 is today */
      daysAway: number
      /** share of the book read on a day she reads in it */
      perReadingDay: number
      /** days she read in it, out of the days looked at */
      readingDays: number
      days: number
    }
  | { book: Book; known: false }

/**
 * When she will likely finish a book she is reading: how much she read in it
 * on the days she read it over the last two weeks (or since she started),
 * and how often she picks it up, give how many days the rest will take.
 */
export function finishEstimate(book: Book, now = new Date()): FinishEstimate {
  const today = localDay(now)
  const started = book.started?.at(-1)
  let from = addDays(today, -(PACE_WINDOW - 1))
  if (started && started > from && started <= today) from = started
  const days = dayNumber(today) - dayNumber(from) + 1
  const log = Object.entries(book.readingLog ?? {}).filter(([d, a]) => d >= from && d <= today && a > 0)
  const total = log.reduce((s, [, a]) => s + a, 0)
  const left = 1 - Math.min(1, book.progress ?? 0)
  if (left <= 0.0005) return { book, known: true, day: today, daysAway: 0, perReadingDay: 0, readingDays: log.length, days }
  // two days of reading, or one when she only started yesterday or today
  if (total <= 0 || log.length < Math.min(2, days)) return { book, known: false }
  const perDay = total / days // per calendar day: how much and how often
  const need = Math.ceil(left / perDay - 1e-9)
  const readToday = log.some(([d]) => d === today)
  // without reading today, today is still one of the days left
  const daysAway = Math.max(0, readToday ? need : need - 1)
  return {
    book,
    known: true,
    day: addDays(today, daysAway),
    daysAway,
    perReadingDay: total / log.length,
    readingDays: log.length,
    days,
  }
}

export const finishEstimates = (books: Book[], now = new Date()) =>
  books.filter((b) => b.status === 'reading').map((b) => finishEstimate(b, now))

// ---- heatmap ------------------------------------------------------------------------

export interface HeatDay {
  day: string
  /** share of books read, all books together */
  share: number
  /** pages read, of books with pages */
  pages: number
  /** minutes listened, of books she listens to */
  minutes: number
  /** books read in, for the tooltip */
  books: number
  /** 0 (nothing) to 4 (a big day) */
  level: number
}

export interface Heatmap {
  /** weeks from old to new, each Monday to Sunday; null for days after today */
  weeks: Array<Array<HeatDay | null>>
  /** where a month starts: its column and month number (1-12) */
  months: Array<{ column: number; month: number }>
  readingDays: number
  pages: number
  minutes: number
}

/**
 * The last twelve months of reading days, like a contribution graph: weeks
 * as columns, Monday on top. A day's shade is how much she read, counting a
 * minute listened as a page (as the shelf does), on a scale set by her own
 * bigger days so one marathon day doesn't make every other day pale.
 */
export function heatmap(books: Book[], now = new Date()): Heatmap {
  const today = localDay(now)
  const yearAgo = addDays(today, -364)
  const first = addDays(yearAgo, -weekday(yearAgo))
  const byDay = new Map<string, HeatDay & { weight: number }>()
  for (const b of books) {
    for (const [day, amount] of Object.entries(b.readingLog ?? {})) {
      if (day < first || day > today || !(amount > 0)) continue
      const d = byDay.get(day) ?? { day, share: 0, pages: 0, minutes: 0, books: 0, level: 0, weight: 0 }
      d.share += amount
      d.books++
      const unit = amountUnit(b)
      if (unit === 'time') d.minutes += amount * b.minutes!
      else if (unit === 'pages') d.pages += amount * b.pages!
      d.weight += amount * (thicknessPages(b) ?? 300)
      byDay.set(day, d)
    }
  }
  const weights = [...byDay.values()].map((d) => d.weight).sort((a, b) => a - b)
  const top = weights[Math.floor((weights.length - 1) * 0.9)] ?? 1
  const weeks: Heatmap['weeks'] = []
  const months: Heatmap['months'] = []
  let pages = 0
  let minutes = 0
  for (let day = first, col = 0; day <= today; col++) {
    const week: Array<HeatDay | null> = []
    for (let i = 0; i < 7; i++, day = addDays(day, 1)) {
      if (day > today) {
        week.push(null)
        continue
      }
      if (day.endsWith('-01') || (col === 0 && i === 0)) {
        const month = Number(day.slice(5, 7))
        // a month starting late in the first week is labelled from the next column
        if (!months.length || months.at(-1)!.month !== month) months.push({ column: i === 0 ? col : col + 1, month })
      }
      const d = byDay.get(day)
      if (!d) {
        week.push({ day, share: 0, pages: 0, minutes: 0, books: 0, level: 0 })
        continue
      }
      const { weight, ...rest } = d
      pages += d.pages
      minutes += d.minutes
      week.push({ ...rest, pages: Math.round(d.pages), minutes: Math.round(d.minutes), level: Math.min(4, Math.max(1, Math.ceil((4 * weight) / top))) })
    }
    weeks.push(week)
  }
  // labels too close together (a month starting late in the first week): keep the later one
  const cleaned = months.filter(
    (m, i) => m.column < weeks.length && (months[i + 1] === undefined || months[i + 1].column - m.column >= 3),
  )
  return {
    weeks,
    months: cleaned,
    readingDays: [...byDay.keys()].filter((d) => d >= yearAgo).length,
    pages: Math.round(pages),
    minutes: Math.round(minutes),
  }
}

// ---- favourite authors -----------------------------------------------------------

export interface AuthorStat {
  name: string
  /** different books of theirs she finished */
  books: number
  /** her average star rating of them, when she rated any */
  rating?: number
  rated: number
}

/** The authors she read most (all time), with her average rating of their books. */
export function favouriteAuthors(books: Book[], n = 5): AuthorStat[] {
  const byName = new Map<string, { name: string; books: number; sum: number; rated: number }>()
  for (const b of books) {
    if (timesRead(b) === 0) continue
    for (const raw of new Set(b.authors.map((a) => a.trim()).filter(Boolean))) {
      const key = raw.toLowerCase()
      const a = byName.get(key) ?? { name: raw, books: 0, sum: 0, rated: 0 }
      a.books++
      const r = cleanRating(b.rating)
      if (r) (a.sum += r), a.rated++
      byName.set(key, a)
    }
  }
  return [...byName.values()]
    .map(({ name, books, sum, rated }) => ({ name, books, rated, ...(rated > 0 && { rating: sum / rated }) }))
    .sort((a, b) => b.books - a.books || (b.rating ?? 0) - (a.rating ?? 0) || a.name.localeCompare(b.name))
    .slice(0, n)
}

// ---- spice meter -----------------------------------------------------------------

export interface SpiceStats {
  /** average spice of the books with a spice level, or undefined for none */
  average?: number
  /** books with a spice level */
  rated: number
  /** books read in the period */
  read: number
  /** the spiciest, hottest first */
  spiciest: Book[]
}

export function spiceStats(books: Book[], period: Period, n = 3): SpiceStats {
  const list = periodStats(books, period).list // latest finish first
  const spiced = list.filter((b) => cleanSpice(b.spice))
  const sum = spiced.reduce((s, b) => s + cleanSpice(b.spice)!, 0)
  const spiciest = spiced
    .map((b, i) => ({ b, i }))
    .sort(
      (x, y) =>
        cleanSpice(y.b.spice)! - cleanSpice(x.b.spice)! ||
        (cleanRating(y.b.rating) ?? 0) - (cleanRating(x.b.rating) ?? 0) ||
        x.i - y.i,
    )
    .slice(0, n)
    .map(({ b }) => b)
  return { ...(spiced.length && { average: sum / spiced.length }), rated: spiced.length, read: list.length, spiciest }
}

// ---- year in review ----------------------------------------------------------------

export interface YearReview {
  year: number
  books: number
  pages: number
  minutes: number
  topRated?: Book
  spiciest?: Book
  /** longest run of reading days that year */
  streak: number
  /** book bingo cards filled that year (#119) */
  bingoCards: number
  genre?: string
  /** busiest month (1-12) and its books */
  busiest?: { month: number; books: number }
}

/** The year to look back on: this year, or last year in January. */
export const reviewYear = (now = new Date()) => (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear())

export function yearReview(books: Book[], year: number, today = localDay()): YearReview {
  const period = { kind: 'year', year } as const
  const stats = periodStats(books, period)
  const days = new Set<number>()
  for (const b of books)
    for (const [d, a] of Object.entries(b.readingLog ?? {})) if (d.startsWith(`${year}-`) && a > 0) days.add(dayNumber(d))
  let streak = 0
  for (const n of days) {
    if (days.has(n - 1)) continue
    let run = 1
    while (days.has(n + run)) run++
    streak = Math.max(streak, run)
  }
  const genre = breakdown(books, period, 'genre', 99).find((s) => s.label !== 'No genre')?.label
  const counts = monthlyCounts(books, year)
  const most = Math.max(...counts)
  return {
    year,
    books: stats.books,
    pages: stats.pages,
    minutes: stats.minutes,
    topRated: topRated(books, period, 1)[0],
    spiciest: spiceStats(books, period, 1).spiciest[0],
    streak,
    bingoCards: bingoYear(books, year, today).finished.length,
    ...(genre && { genre }),
    ...(most > 0 && { busiest: { month: counts.indexOf(most) + 1, books: most } }),
  }
}

// ---- goal pace ---------------------------------------------------------------------

export interface GoalPace {
  toGo: number
  /** days left in the year, today included */
  daysLeft: number
  /** books a week needed from now */
  perWeek: number
}

export function goalPace(done: number, goal: number, year: number, now = new Date()): GoalPace {
  const today = localDay(now)
  const from = today.startsWith(`${year}-`) ? today : today < `${year}-` ? `${year}-01-01` : `${year + 1}-01-01`
  const daysLeft = Math.max(0, dayNumber(`${year + 1}-01-01`) - dayNumber(from))
  const toGo = Math.max(0, goal - done)
  return { toGo, daysLeft, perWeek: daysLeft > 0 ? toGo / (daysLeft / 7) : Infinity }
}

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** "2 books to go, 7 weeks left: about one every 3 weeks". */
export function goalPaceText({ toGo, daysLeft, perWeek }: GoalPace): string {
  if (toGo === 0) return ''
  const weeks = Math.round(daysLeft / 7)
  const left = daysLeft < 14 ? count(daysLeft, 'day') : count(weeks, 'week')
  const head = `${count(toGo, 'book')} to go, ${left} left`
  if (daysLeft === 0) return `${count(toGo, 'book')} to go`
  if (toGo >= daysLeft) return `${head}: about ${Math.round(toGo / daysLeft)} a day`
  const every = daysLeft / toGo
  if (every < 4 && daysLeft >= 14) return `${head}: about ${Math.round(perWeek)} a week`
  if (every >= 6 && every <= 8) return `${head}: about one a week`
  if (every < 14) return `${head}: about one every ${Math.round(every)} days`
  return `${head}: about one every ${Math.round(every / 7)} weeks`
}
