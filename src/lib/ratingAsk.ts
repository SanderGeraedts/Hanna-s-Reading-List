import type { Book } from './library'
import { timesRead } from './library'
import { isSleepRead } from './sleepSeries'

/**
 * "You finished it!" for books finished without her there, mostly by the
 * nightly Storytel sync: the next time she opens the app, each new finish
 * that hasn't been asked about gets the rating pop-up, one book at a time.
 *
 * A book remembers the finish day it was last asked about (`ratingAsked`),
 * also when she marked it read herself and the pop-up opened then, so no
 * finish is asked twice. A sleep read's re-reads aren't asked, as before.
 * Only finishes from RATING_ASK_FROM on are asked about.
 */

/** Finishes from this day on are asked about: a day that hadn't come yet when this shipped. */
export const RATING_ASK_FROM = '2026-11-15'

/** The day a book was last finished, or undefined. */
export const lastFinish = (b: Book): string | undefined => [...(b.finished ?? [])].sort().at(-1)

/** The books with a finish still to ask about, the earliest finish first. */
export function pendingRatings(books: Book[], from = RATING_ASK_FROM): Book[] {
  return books
    .filter((b) => {
      const last = lastFinish(b)
      if (b.status !== 'read' || !last || last < from) return false
      if (b.ratingAsked && b.ratingAsked >= last) return false
      // the finish is counted already: more than one read means a re-read
      return !(timesRead(b) > 1 && isSleepRead(b, books))
    })
    .sort((a, b) => lastFinish(a)!.localeCompare(lastFinish(b)!) || a.title.localeCompare(b.title))
}

/** Remembers that the book's latest finish has been asked about. */
export const askedPatch = (b: Book): Partial<Book> => {
  const last = lastFinish(b)
  return last ? { ratingAsked: last } : {}
}
