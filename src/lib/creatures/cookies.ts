import type { Book } from '../library'
import { listenOnly } from '../listening'
import { sleepReadIds } from '../sleepSeries'
import { allFinishes } from '../stats'
import { addDays } from './days'
import {
  CREATURES_START,
  DEFAULT_PAGES,
  FINISH_TREAT,
  MINUTES_PER_COOKIE,
  MINUTES_PER_PAGE,
  SLEEP_SHARE,
} from './numbers'

/**
 * Cookies, worked out from her reading log, never stored (D-0033 §1–2). A
 * day's minutes for a book are that day's share in `readingLog` × the book's
 * length in minutes; 1 🍪 per 5 minutes counted on the total (so nothing is
 * lost to rounding), +10 per finished book, sleep reads half. Fixing a past
 * day changes the total, which may then go below what she has spent.
 */

const positive = (n: number | undefined) => (n && n > 0 ? n : undefined)

/** The book's length in minutes: its listening time when she only listens to it, else pages × 1.5; no length: 280 pages. */
export function bookMinutes(book: Book): number {
  const pages = positive(book.pages)
  const minutes = positive(book.minutes)
  // a listen-only book's pages are a copy of its minutes (D-0008)
  if (listenOnly(book)) return minutes ?? pages ?? DEFAULT_PAGES * MINUTES_PER_PAGE
  if (pages) return pages * MINUTES_PER_PAGE
  return minutes ?? DEFAULT_PAGES * MINUTES_PER_PAGE
}

/** What she read on one day (on or after the start). */
export interface ReadingDay {
  day: string
  /** minutes of books that aren't sleep reads */
  minutes: number
  /** minutes of sleep reads (they earn half) */
  sleepMinutes: number
  /** books finished that day, in shelf order (a re-read counts again) */
  finished: Book[]
  /** how many of those are sleep reads */
  sleepFinished: number
}

/** Every day from the start with reading or a finish in it, as yyyy-mm-dd → what happened. */
export function readingDays(books: Book[], sleep: Set<string> = sleepReadIds(books), start = CREATURES_START): Map<string, ReadingDay> {
  const out = new Map<string, ReadingDay>()
  const at = (day: string) => {
    let d = out.get(day)
    if (!d) out.set(day, (d = { day, minutes: 0, sleepMinutes: 0, finished: [], sleepFinished: 0 }))
    return d
  }
  for (const book of books) {
    const length = bookMinutes(book)
    const asleep = sleep.has(book.id)
    for (const [day, share] of Object.entries(book.readingLog ?? {})) {
      if (day < start || !(share > 0)) continue
      const d = at(day)
      if (asleep) d.sleepMinutes += share * length
      else d.minutes += share * length
    }
  }
  for (const f of allFinishes(books)) {
    if (!f.day || f.day < start) continue
    const d = at(f.day)
    d.finished.push(f.book)
    if (sleep.has(f.book.id)) d.sleepFinished++
  }
  return out
}

/**
 * Cookies earned from the start up to and including `day`: the minutes are
 * added up first and rounded down once, so 3 + 3 minutes on two days still
 * make a cookie.
 */
export function earnedThrough(days: Map<string, ReadingDay>, day: string): number {
  let weighted = 0
  let treats = 0
  for (const d of days.values()) {
    if (d.day > day) continue
    weighted += d.minutes + d.sleepMinutes * SLEEP_SHARE
    treats += (d.finished.length - d.sleepFinished) * FINISH_TREAT + d.sleepFinished * FINISH_TREAT * SLEEP_SHARE
  }
  // a tiny margin, so 4.9999999 minutes from shares like 0.3333 don't lose a cookie
  return Math.floor(weighted / MINUTES_PER_COOKIE + 1e-9) + Math.floor(treats)
}

/** A line of This week (Design §4): the day's minutes, sleep minutes, finished books and cookies. */
export interface WeekLine extends ReadingDay {
  /** earned through this day minus earned through the day before, so the lines add up to the week */
  cookies: number
}

export interface Week {
  /** newest first, days without reading or finishes left out */
  lines: WeekLine[]
  /** cookies earned in the last 7 days including today */
  total: number
}

/** The last 7 days including today. */
export function thisWeek(days: Map<string, ReadingDay>, today: string): Week {
  const lines: WeekLine[] = []
  for (let i = 0; i < 7; i++) {
    const day = addDays(today, -i)
    const d = days.get(day)
    if (!d) continue
    lines.push({ ...d, cookies: earnedThrough(days, day) - earnedThrough(days, addDays(day, -1)) })
  }
  return { lines, total: earnedThrough(days, today) - earnedThrough(days, addDays(today, -7)) }
}

/** "45 min", "1 h 05 min" (Design §4): whole minutes. */
export function minutesText(minutes: number): string {
  const m = Math.round(minutes)
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`
}
