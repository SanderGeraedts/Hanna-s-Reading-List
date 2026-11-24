import type { Book } from './library'
import { localDay } from './library'
import { SEASON_ICON, SEASON_LABEL, SEASONS, seasonOf } from './garden/seasons'
import type { Season } from './garden/seasons'
import { sleepReadIds } from './sleepSeries'
import { foldTrope, tropesOf } from './tropes'

/**
 * Seasonal (D-0065 §2): a target per calendar season, judged by the seasons
 * Hanna gave the book herself (D-0072) or, while she gave it none, by the
 * book's genres **and** its tropes (D-0042). The season of a finish comes from
 * `seasonOf`, which is meteorological, northern-hemisphere and already safe
 * around a leap day: a day that does not exist (2027-02-29, from an older
 * shelf) is no season at all and counts for nothing.
 */

export interface SeasonTarget {
  season: Season
  /** how many books */
  target: number
  /** what counts, as a short phrase for the accessible name */
  what: string
  /** the genres and tropes that match, folded on use */
  words: readonly string[]
}

export const SEASON_TARGETS: readonly SeasonTarget[] = [
  {
    season: 'spring',
    target: 3,
    what: 'romance, contemporary and coming-of-age books',
    words: ['romance', 'contemporary', 'coming of age', 'friends to lovers', 'second chance', 'slow burn'],
  },
  {
    season: 'summer',
    target: 5,
    what: 'beach reads',
    words: ['romance', 'beach', 'holiday', 'adventure', 'fake dating', 'one bed', 'forced proximity'],
  },
  {
    season: 'autumn',
    target: 3,
    what: 'cosy or spooky reads',
    words: ['horror', 'thriller', 'mystery', 'gothic', 'paranormal', 'academic rivals', 'locked room', 'dark academia'],
  },
  {
    season: 'winter',
    target: 3,
    what: 'fantasy, classic and historical books',
    words: ['fantasy', 'classic', 'historical', 'found family', 'quest', 'redemption arc'],
  },
]

const targetFor = (season: Season) => SEASON_TARGETS.find((t) => t.season === season)!

/**
 * Whether a folded text holds a word whole: "Historical romance" holds
 * "romance", "Romantasy" does not (D-0065 §2).
 */
export function holdsWord(text: string, word: string): boolean {
  const haystack = ` ${foldTrope(text)} `
  const needle = foldTrope(word)
  return !!needle && haystack.includes(` ${needle} `)
}

/**
 * The seasons Hanna picked for this book herself (D-0072), in season order.
 * Anything that is not one of the four seasons is ignored, so a shelf saved by
 * a newer app — or a `null`, a number or a misspelling — still reads cleanly.
 */
export function seasonsOf(book: Pick<Book, 'seasons'> | undefined | null): Season[] {
  const raw = (book as { seasons?: unknown } | undefined | null)?.seasons
  if (!Array.isArray(raw)) return []
  return SEASONS.filter((s) => raw.includes(s))
}

/**
 * Whether a book is for this season. **Her own pick wins** (D-0072 §3): once she
 * has given a book any season, those are its seasons and nothing else is, so a
 * Christmas book counts for winter and a book can also be taken out of a season
 * it was wrongly guessed into. With the field empty it is the guess as it always
 * was: the season's words against the book's genres and tropes.
 */
export function matchesSeason(book: Book, season: Season): boolean {
  const picked = seasonsOf(book)
  if (picked.length) return picked.includes(season)
  const { words } = targetFor(season)
  const texts = [...(book.genres ?? []), ...tropesOf(book)]
  return texts.some((t) => words.some((w) => holdsWord(t, w)))
}

/**
 * The patch that gives a book these seasons. An empty pick clears the field
 * (never writes `[]`), so a book she filled in and emptied again is
 * byte-for-byte the book she never touched (D-0072 §1).
 */
export function seasonsPatch(seasons: readonly Season[]): Pick<Book, 'seasons'> {
  const clean = SEASONS.filter((s) => seasons.includes(s))
  return { seasons: clean.length ? clean : undefined }
}

export interface SeasonProgress {
  season: Season
  label: string
  icon: string
  what: string
  target: number
  done: number
  complete: boolean
  /** the season happening now (only for the year that is running) */
  current: boolean
  /** the books that counted, newest first */
  books: Book[]
}

/** Each season of a year: how many matching books she finished in it. */
export function seasonChallenge(books: Book[], year: number, today = localDay()): SeasonProgress[] {
  const sleep = sleepReadIds(books)
  const thisYear = Number(today.slice(0, 4))
  const now = year === thisYear ? seasonOf(today) : null
  const counted = new Map<Season, Map<string, { book: Book; day: string }>>(SEASONS.map((s) => [s, new Map()]))
  for (const b of books) {
    if (sleep.has(b.id)) continue
    for (const day of b.finished ?? []) {
      if (!day.startsWith(`${year}-`)) continue
      const season = seasonOf(day)
      // a day that does not exist has no season and counts for nothing
      if (!season || !matchesSeason(b, season)) continue
      const have = counted.get(season)!
      const prev = have.get(b.id)
      if (!prev || prev.day < day) have.set(b.id, { book: b, day })
    }
  }
  return SEASONS.map((season) => {
    const { target, what } = targetFor(season)
    const rows = [...counted.get(season)!.values()].sort((a, b) => b.day.localeCompare(a.day))
    return {
      season,
      label: SEASON_LABEL[season],
      icon: SEASON_ICON[season],
      what,
      target,
      done: rows.length,
      complete: rows.length >= target,
      current: now === season,
      books: rows.map((r) => r.book),
    }
  })
}

/** Seasons completed out of four. */
export const seasonsDone = (list: SeasonProgress[]) => list.filter((s) => s.complete).length
