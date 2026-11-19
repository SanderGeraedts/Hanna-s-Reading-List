import type { Book } from './library'
import { localDay } from './library'
import { amountUnit } from './readingLog'
import { cleanReleaseDate } from './upcoming'

/**
 * The Calendar page: books coming out, a month's summary and the year's
 * reading days. What was read, started and finished each day comes from
 * dayEntries (readingLog.ts), like the dashboard calendar.
 */

export interface Release {
  book: Book
  /** how exactly the release is known */
  precision: 'day' | 'month' | 'year'
  /** yyyy-mm-dd, yyyy-mm or yyyy */
  when: string
}

/**
 * When a book still comes out, if it does: an exact day (from Storytel or the
 * publication date), or only a month or a year. Books out before today are
 * left out; a year-only date counts only for a year still to come.
 */
export function releaseOf(b: Book, today = localDay()): Release | undefined {
  const published = b.published?.trim() ?? ''
  const exact = cleanReleaseDate(b.releaseDate) ?? (/^\d{4}-\d{2}-\d{2}$/.test(published) ? published : undefined)
  if (exact) return exact >= today ? { book: b, precision: 'day', when: exact } : undefined
  if (/^\d{4}-\d{2}$/.test(published)) {
    return published >= today.slice(0, 7) ? { book: b, precision: 'month', when: published } : undefined
  }
  const year = /^\d{4}$/.test(published) ? Number(published) : b.year
  if (year && year > Number(today.slice(0, 4))) return { book: b, precision: 'year', when: String(year) }
  return undefined
}

export interface MonthReleases {
  /** day of the month → books coming out that day */
  byDay: Map<number, Book[]>
  /** above the grid: books known to come out this month, or (in January) this year */
  vague: Array<{ book: Book; text: string }>
}

export function monthReleases(books: Book[], year: number, month: number, today = localDay()): MonthReleases {
  const key = `${year}-${String(month).padStart(2, '0')}`
  const byDay = new Map<number, Book[]>()
  const vague: MonthReleases['vague'] = []
  for (const b of books) {
    const r = releaseOf(b, today)
    if (!r) continue
    if (r.precision === 'day' && r.when.startsWith(`${key}-`)) {
      const d = Number(r.when.slice(8, 10))
      byDay.set(d, [...(byDay.get(d) ?? []), b])
    } else if (r.precision === 'month' && r.when === key) {
      vague.push({ book: b, text: 'coming this month' })
    } else if (r.precision === 'year' && month === 1 && r.when === String(year)) {
      vague.push({ book: b, text: `sometime in ${year}` })
    }
  }
  return { byDay, vague }
}

export interface MonthSummary {
  finished: number
  pages: number
  minutes: number
  /** days with any reading or listening in the log */
  days: number
}

/** A month in numbers, from the finishes and the reading log; sleep reads count too. */
export function monthSummary(books: Book[], year: number, month: number): MonthSummary {
  const prefix = `${year}-${String(month).padStart(2, '0')}-`
  const days = new Set<string>()
  let finished = 0
  let pages = 0
  let minutes = 0
  for (const b of books) {
    finished += (b.finished ?? []).filter((d) => d.startsWith(prefix)).length
    const unit = amountUnit(b)
    for (const [day, amount] of Object.entries(b.readingLog ?? {})) {
      if (!day.startsWith(prefix) || !(amount > 0)) continue
      days.add(day)
      if (unit === 'pages') pages += amount * b.pages!
      else if (unit === 'time') minutes += amount * b.minutes!
    }
  }
  return { finished, pages: Math.round(pages), minutes: Math.round(minutes), days: days.size }
}

/**
 * How much was read each day of a year, as a level from 1 (a little) to 4
 * (a lot), for the dots of the year view. A minute of listening counts as a
 * page, as on the shelf; a book without a length counts as a little.
 */
export function yearLevels(books: Book[], year: number): Map<string, number> {
  const amount = new Map<string, number>()
  for (const b of books) {
    const size = b.pages || b.minutes || 0
    for (const [day, part] of Object.entries(b.readingLog ?? {})) {
      if (!day.startsWith(`${year}-`) || !(part > 0)) continue
      amount.set(day, (amount.get(day) ?? 0) + (size ? part * size : 5))
    }
  }
  const out = new Map<string, number>()
  for (const [day, n] of amount) out.set(day, n < 15 ? 1 : n < 40 ? 2 : n < 90 ? 3 : 4)
  return out
}

/** "6 books finished · 1,840 pages · 12 h listened · 21 reading days", leaving out what's zero. */
export function summaryText(s: MonthSummary): string {
  const parts = [
    s.finished > 0 && `${s.finished} ${s.finished === 1 ? 'book' : 'books'} finished`,
    s.pages > 0 && `${s.pages.toLocaleString('en-GB')} pages`,
    s.minutes > 0 && `${Math.round(s.minutes / 60)} h listened`,
    `${s.days} reading ${s.days === 1 ? 'day' : 'days'}`,
  ].filter((p): p is string => !!p)
  return parts.join(' · ')
}
