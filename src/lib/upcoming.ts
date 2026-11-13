import type { Book } from './library'
import { localDay } from './library'

/**
 * Books that aren't out yet. They used to wait in a dashboard block of their
 * own (#103); now they are on the shelf like any want-to-read book, and only
 * "What next?" leaves them out until they can be read.
 *
 * A book counts as not out yet when its publication date is still to come,
 * or when the Storytel sync gave it a release day still to come.
 */

const DAY = /^\d{4}-\d{2}-\d{2}$/

/** A release day made safe: yyyy-mm-dd, or undefined. */
export function cleanReleaseDate(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const day = v.slice(0, 10)
  return DAY.test(day) && !Number.isNaN(Date.parse(day)) ? day : undefined
}

/** The first day a publication date can mean: "2027" → 2027-01-01, "2027-03" → 2027-03-01. */
export function publishedDay(published?: string): string | undefined {
  if (!published) return undefined
  const [y, m = '01', d = '01'] = published.split('-')
  return cleanReleaseDate(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
}

/**
 * The release day that follows from a book's publication date, when it is
 * still to come. A year on its own counts from 1 January of that year.
 */
export function releaseFromPublished(b: Pick<Book, 'published' | 'year'>, today = localDay()): string | undefined {
  const day = publishedDay(b.published) ?? (b.year && b.year > Number(today.slice(0, 4)) ? `${b.year}-01-01` : undefined)
  return day && day > today ? day : undefined
}

/** Whether a book can't be read yet because it hasn't come out. */
export function notOutYet(b: Pick<Book, 'published' | 'year' | 'releaseDate'>, today = localDay()): boolean {
  const release = cleanReleaseDate(b.releaseDate)
  return (!!release && release > today) || !!releaseFromPublished(b, today)
}
