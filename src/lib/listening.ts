import type { Book, BookFormat } from './library'
import { formatsOf } from './library'

/**
 * Listening time for audiobooks (#48). A book Hanna has as an audiobook or on
 * Storytel can have a length in minutes instead of pages. On the shelf a minute
 * counts as a page, so a long listen is a thick book.
 */

export const AUDIO_FORMATS: BookFormat[] = ['audiobook', 'storytel']

/** She has the book as an audiobook or on Storytel (maybe as well as in print). */
export const hasAudio = (book: Book) => formatsOf(book).some((f) => AUDIO_FORMATS.includes(f))

/** She only listens to this book: no paper copy or e-book with pages of its own. */
export function listenOnly(book: Book) {
  const formats = formatsOf(book).filter((f) => f !== 'other')
  return formats.length > 0 && formats.every((f) => AUDIO_FORMATS.includes(f))
}

/**
 * Pages and listening time are one number for a book she only listens to
 * (#51): a minute is a page. Setting one gives the other too. Books she also
 * has on paper or as an e-book keep their own page count.
 */
export function lengthPatch(book: Book, change: { pages?: number | undefined } | { minutes?: number | undefined }): Partial<Book> {
  if (!listenOnly(book)) return change
  const n = 'pages' in change ? change.pages : (change as { minutes?: number }).minutes
  return { pages: n, minutes: n }
}

/** Fills in the missing one of pages and minutes when a book becomes listen-only (#51). */
export function linkOnFormatChange(book: Book, next: Book): Partial<Book> {
  if (!listenOnly(next) || listenOnly(book)) return {}
  if (next.minutes && !next.pages) return { pages: next.minutes }
  if (next.pages && !next.minutes) return { minutes: next.pages }
  return {}
}

/** The page count that sets how thick the book stands: its minutes when she only listens to it. */
export function thicknessPages(book: Book): number | undefined {
  const pages = book.pages && book.pages > 0 ? book.pages : undefined
  const minutes = book.minutes && book.minutes > 0 ? book.minutes : undefined
  return listenOnly(book) ? (minutes ?? pages) : (pages ?? minutes)
}

/** "10 h 25 min", "45 min", "3 h". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

/**
 * Minutes from what Hanna types, or null: "10:25", "10h 25m", "10 h 25 min",
 * "10 Std. 25 Min.", "10,5 h", "625" (minutes) or "10 h".
 */
export function parseDuration(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(',', '.')
  if (!s) return null
  let m: RegExpMatchArray | null
  let minutes: number | null = null
  if ((m = s.match(/^(\d+):([0-5]\d)(?::[0-5]\d)?$/))) minutes = +m[1] * 60 + +m[2]
  else if ((m = s.match(/^\d+$/))) minutes = +s
  else if ((m = s.match(/^(?:(\d+(?:\.\d+)?)\s*(?:h|hrs?|hours?|std\.?|stunden?)\.?)?\s*(?:(\d+)\s*(?:m|min|mins|minutes?|minuten?)\.?)?$/)) && (m[1] || m[2]))
    minutes = Math.round(Number(m[1] ?? 0) * 60) + Number(m[2] ?? 0)
  return minutes && minutes > 0 && minutes <= 200 * 60 ? minutes : null
}
