import type { Book } from './library'
import { localDay } from './library'
import { bingoYear } from './bingo'

/**
 * What the Challenges page says about a year, besides the challenges
 * themselves.
 *
 * Until D-0064 this was a row of trophy lines, one per challenge. The ring row
 * at the top of the page now says the same thing in one picture — name,
 * progress and done — so the lines are gone and only the one thing that is not
 * a challenge with a goal is left: how many bingo cards she filled that year.
 */

/** "1 full bingo card" / "3 full bingo cards" for a year, or null when none. */
export function fullCardsLine(books: Book[], year: number, today = localDay(), swaps?: ReadonlyMap<string, string>): string | null {
  const full = bingoYear(books, year, today, swaps).finished.length
  if (full === 0) return null
  return full === 1 ? '1 full bingo card' : `${full} full bingo cards`
}

/** The years the Challenges page can show: from the first year with a finish to this one. */
export function challengeYears(books: Book[], today = localDay()): number[] {
  const thisYear = Number(today.slice(0, 4))
  let first = thisYear
  for (const b of books) for (const d of b.finished ?? []) first = Math.min(first, Number(d.slice(0, 4)) || thisYear)
  return Array.from({ length: thisYear - first + 1 }, (_, i) => first + i)
}
