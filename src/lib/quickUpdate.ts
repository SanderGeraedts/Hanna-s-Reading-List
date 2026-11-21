import type { Book } from './library'
import { statusPatch } from './library'
import { formatDuration } from './listening'
import { progressFromPage, progressFromPercent, progressFromTime } from './progress'
import { amountUnit, progressPatch } from './readingLog'
import type { AmountUnit } from './readingLog'

/**
 * Quick update (T-0011): the books she's on, and moving one on a page (or a
 * minute, or a percent) at a time without the full book panel.
 */

/** The books to offer: the ones she's reading (latest touched first), then the paused ones. */
export function quickBooks(books: Book[]): Book[] {
  const recent = (b: Book) => b.editedAt ?? b.addedAt
  const by = (status: Book['status']) =>
    books.filter((b) => b.status === status).sort((a, b) => recent(b) - recent(a))
  return [...by('reading'), ...by('paused')]
}

/** What one step is for a book: a page, a minute of listening, or a percent. */
export function stepOf(book: Book): { unit: AmountUnit; one: number } {
  const unit = amountUnit(book)
  if (unit === 'pages') return { unit, one: 1 / book.pages! }
  if (unit === 'time') return { unit, one: 1 / book.minutes! }
  return { unit, one: 0.01 }
}

/** Where she is, as the number to show big and what it's out of: "123" / "of 400". */
export function position(book: Book, progress = book.progress ?? 0): { value: string; of: string } {
  const unit = amountUnit(book)
  if (unit === 'pages') return { value: String(Math.round(progress * book.pages!)), of: `of ${book.pages} pages` }
  if (unit === 'time')
    return { value: formatDuration(Math.round(progress * book.minutes!)), of: `of ${formatDuration(book.minutes!)}` }
  return { value: `${Math.round(progress * 100)}%`, of: 'read' }
}

/** A typed position (a page, a listening time like "1:20" or "80 min", or a percentage) as progress, or null. */
export function parsePosition(book: Book, text: string): number | null {
  const unit = amountUnit(book)
  if (unit === 'pages') return progressFromPage(text, book.pages!)
  if (unit === 'time') return progressFromTime(text, book.minutes!)
  return progressFromPercent(text)
}

/** Moving on (or back) by `steps` steps from where the book is: the change for it. */
export function stepPatch(book: Book, steps: number): Partial<Book> {
  // from the whole page (minute, percent) she's on, so many taps never drift
  const total = Math.round(1 / stepOf(book).one)
  const at = Math.round((book.progress ?? 0) * total)
  const next = Math.min(total, Math.max(0, at + steps)) / total
  return progressPatch(book, next)
}

/** Finished: the rest of the book goes in today's log, then it's marked read (a rating waits on the dashboard). */
export function finishPatch(book: Book): Partial<Book> {
  const moved = progressPatch(book, 1)
  return { ...moved, ...statusPatch({ ...book, ...moved }, 'read') }
}
