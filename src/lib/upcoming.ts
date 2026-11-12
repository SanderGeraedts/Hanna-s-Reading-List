import type { Book } from './library'
import { localDay } from './library'

/**
 * Upcoming releases (#103): a book added before it comes out has a
 * `releaseDate` in the future. It isn't on the shelf yet but in the
 * dashboard's "Upcoming releases"; on its release day it moves to the shelf.
 */

const DAY = /^\d{4}-\d{2}-\d{2}$/

/** A release day made safe: yyyy-mm-dd, or undefined. */
export function cleanReleaseDate(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const day = v.slice(0, 10)
  return DAY.test(day) && !Number.isNaN(Date.parse(day)) ? day : undefined
}

export const isUpcoming = (b: Book, today = localDay()) => !!b.releaseDate && b.releaseDate > today

/** The books still to come out, the first one first. */
export function upcomingBooks(books: Book[], today = localDay()): Book[] {
  return books.filter((b) => isUpcoming(b, today)).sort((a, b) => a.releaseDate!.localeCompare(b.releaseDate!))
}

/** Books whose release day has come: they go onto the shelf. */
export const releasedBooks = (books: Book[], today = localDay()) =>
  books.filter((b) => !!b.releaseDate && b.releaseDate <= today)

/**
 * The change that puts a released book on the shelf: no longer upcoming,
 * added as of today (so it shows up as a new book), with its publication
 * date filled in from the release day.
 */
export function releasePatch(b: Book, now = Date.now()): Partial<Book> {
  const day = b.releaseDate!
  return {
    releaseDate: undefined,
    addedAt: now,
    published: b.published ?? day,
    year: b.year ?? Number(day.slice(0, 4)),
  }
}

/** Whole days from `today` to `day` (both yyyy-mm-dd). */
export function daysUntil(day: string, today = localDay()) {
  const n = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)))
  return Math.round((n(day) - n(today)) / 86_400_000)
}

export function countdownText(day: string, today = localDay()) {
  const n = daysUntil(day, today)
  if (n <= 0) return 'Out today'
  if (n === 1) return 'Tomorrow'
  if (n < 7) return `In ${n} days`
  if (n < 60) return `In ${Math.round(n / 7)} week${Math.round(n / 7) === 1 ? '' : 's'}`
  return `In ${Math.round(n / 30.4)} months`
}

export function releaseDayText(day: string) {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
