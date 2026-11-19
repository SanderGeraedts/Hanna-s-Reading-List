import type { Book } from './library'

/**
 * The reading journal: a short note about a book on a day she read it
 * ("Cried at chapter 12 😭"), written on the Calendar page. Kept on the book
 * (`journal`, day → note), so it's the same on every device.
 */

export const MAX_NOTE = 280

/** A note made safe: trimmed, at most MAX_NOTE characters; '' for none. */
export const cleanNote = (text: string) => text.trim().slice(0, MAX_NOTE)

/** The change that sets (or with an empty text, removes) the note for `day`. */
export function journalPatch(book: Book, day: string, text: string): Partial<Book> {
  const note = cleanNote(text)
  const journal = { ...(book.journal ?? {}) }
  if (note) journal[day] = note
  else delete journal[day]
  return { journal: Object.keys(journal).length ? journal : undefined }
}

/** A book's notes, the newest first. */
export function notesOf(book: Book): Array<{ day: string; note: string }> {
  return Object.entries(book.journal ?? {})
    .filter(([, note]) => typeof note === 'string' && note.trim())
    .map(([day, note]) => ({ day, note }))
    .sort((a, b) => b.day.localeCompare(a.day))
}

/** Whether any book has a note on `day`, for the ✎ on the calendar. */
export const hasNote = (books: Book[], day: string) => books.some((b) => !!b.journal?.[day])
