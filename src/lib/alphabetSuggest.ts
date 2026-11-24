import type { Book } from './library'
import { localDay } from './library'
import { lettersOf } from './alphabet'
import type { AlphabetKind } from './alphabet'
import type { Candidate } from './bingoSuggest'
import { readNextChoices } from './readNext'
import { wishWeight } from './wish'

/**
 * A book from her pile for a letter she has not read yet (T-0066, D-0070),
 * exactly as a bingo square offers one (T-0017): tapping the letter opens a
 * suggestion, 🎲 Another one draws the next, and nothing is suggested that she
 * could not really start.
 *
 * The pool is `readNextChoices` (D-0025: wants to read, never finished, out
 * already, a series strictly in order, no sleep reads), weighted like Make a
 * wish, and then only the books that count for that letter — the same
 * `lettersOf` the challenge itself counts with, so a book that is offered for
 * B really does tick B when she finishes it.
 */

/** The books that would count for `letter`, with how likely each is drawn. */
export function letterPool(letter: string, books: Book[], kind: AlphabetKind = 'title', today = localDay()): Candidate[] {
  const want = letter.toUpperCase()
  return readNextChoices(books, today)
    .filter((b) => lettersOf(b, kind).includes(want))
    .map((book) => ({ book, weight: wishWeight(book, books, today).weight }))
}
