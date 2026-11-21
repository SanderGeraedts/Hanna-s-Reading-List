import type { Book } from './library'
import { localDay } from './library'
import { formatDuration, listenOnly } from './listening'
import { percentText } from './progress'

/**
 * Books Hanna didn't finish (#187): put aside, with the progress kept, and
 * brought back one a day by the dashboard block "Give it another try".
 */

export const putAside = (books: Book[]) => books.filter((b) => b.status === 'dnf')

/**
 * How far she got: "Stopped at 42%", with `detail` also the page ("· page 99
 * of 237") or, for a book she only listens to, the listening time ("· 3:10 of
 * 10:25"). Null when she hadn't started (0%).
 */
export function stoppedAtText(book: Book, detail = false): string | null {
  const progress = book.progress ?? 0
  if (Math.round(progress * 1000) <= 0) return null
  const text = `Stopped at ${percentText(progress)}%`
  if (!detail) return text
  if (listenOnly(book) && book.minutes)
    return `${text} · ${formatDuration(Math.round(progress * book.minutes))} of ${formatDuration(book.minutes)}`
  if (book.pages) return `${text} · page ${Math.round(progress * book.pages)} of ${book.pages}`
  return text
}

/** Whole days since 1970 for a yyyy-mm-dd day, the same everywhere. */
const dayNumber = (day: string) =>
  Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10))) / 86_400_000

/** A fixed number for a book id, so the turns don't simply follow the order she added them in. */
function idHash(id: string) {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * The book the block shows on `day`: the books put aside take turns, one a
 * day, each once before any comes back. The same all day, on every device.
 */
export function bookOfTheDay(books: Book[], day = localDay()): Book | undefined {
  const turns = putAside(books).sort((a, b) => idHash(a.id) - idHash(b.id) || a.id.localeCompare(b.id))
  if (!turns.length) return undefined
  const n = dayNumber(day)
  return turns[((n % turns.length) + turns.length) % turns.length]
}
