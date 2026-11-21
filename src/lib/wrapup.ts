import type { Book } from './library'
import { localDay } from './library'
import { listenOnly } from './listening'
import { allFinishes, periodStats } from './stats'

/**
 * The monthly wrap-up: the covers Hanna finished in a month, the numbers,
 * her book of the month and a fun fact, as a card to look at and share.
 */

export interface WrapUp {
  year: number
  month: number
  /** finished that month, latest first */
  books: Book[]
  pages: number
  minutes: number
  /** days she read anything that month */
  readingDays: number
  /** her highest-rated finish of the month, if she rated any */
  top?: Book
  fact?: string
}

const WEEKDAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']
const pad = (n: number) => String(n).padStart(2, '0')
const dayNumber = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86_400_000

export function monthWrap(books: Book[], year: number, month: number): WrapUp {
  const prefix = `${year}-${pad(month)}-`
  const s = periodStats(books, { kind: 'month', year, month })
  const days = [...new Set(books.flatMap((b) => Object.entries(b.readingLog ?? {}).filter(([d, a]) => a > 0 && d.startsWith(prefix)).map(([d]) => d)))].sort()
  const rated = s.list.filter((b) => b.rating)
  const top = rated.length ? [...rated].sort((a, b) => b.rating! - a.rating!)[0] : undefined
  return { year, month, books: s.list, pages: s.pages, minutes: s.minutes, readingDays: days.length, top, fact: funFact(books, s.list, days, prefix) }
}

/** The most interesting thing about the month, in order: a new genre, a long streak, a long book, a favourite day. */
function funFact(books: Book[], finished: Book[], days: string[], prefix: string): string | undefined {
  // a genre she had never finished before this month
  const before = new Set(
    allFinishes(books)
      .filter((f) => f.day && f.day < prefix)
      .flatMap((f) => f.book.genres ?? []),
  )
  const fresh = finished.flatMap((b) => b.genres ?? []).find((g) => !before.has(g))
  if (fresh && before.size > 0) return `A new genre for you: ${fresh}`
  // the longest run of days in a row
  let best = 0
  let run = 0
  let prev = -2
  for (const d of days) {
    const n = dayNumber(d)
    run = n === prev + 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = n
  }
  if (best >= 5) return `Your longest streak: ${best} days in a row`
  // the longest book finished
  const longest = finished.filter((b) => !listenOnly(b) && b.pages).sort((a, b) => b.pages! - a.pages!)[0]
  if (longest && longest.pages! >= 450) return `Longest book: ${longest.title} (${longest.pages} pages)`
  // the day of the week she read most
  if (days.length >= 4) {
    const count = Array(7).fill(0) as number[]
    for (const d of days) count[new Date(`${d}T12:00:00Z`).getUTCDay()]++
    const top = count.indexOf(Math.max(...count))
    return `You read most on ${WEEKDAYS[top]}`
  }
  if (days.length > 0) return `You read on ${days.length} ${days.length === 1 ? 'day' : 'days'}`
  return undefined
}

/** In the first week of a month: the month just ended, for "Waiting for you". */
export function wrapUpDue(today = localDay()): { year: number; month: number } | null {
  const d = +today.slice(8, 10)
  if (d > 7) return null
  const y = +today.slice(0, 4)
  const m = +today.slice(5, 7)
  return m === 1 ? { year: y - 1, month: 12 } : { year: y, month: m - 1 }
}

export const wrapKey = (year: number, month: number) => `${year}-${pad(month)}`
