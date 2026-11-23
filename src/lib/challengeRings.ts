import type { Book } from './library'
import { localDay } from './library'
import { LETTERS, alphabetYear } from './alphabet'
import { bingoYear } from './bingo'
import { challengeCalendar } from './monthChallenge'
import { periodStats } from './stats'
import { challengeBooks, challengeDone, doneText, unitOf } from './ownChallenges'
import type { OwnChallenge } from './ownChallenges'
import { worldChallenge } from './worldChallenge'
import { seasonChallenge, seasonsDone } from './seasonChallenge'
import { minutesYear } from './minutesChallenge'
import { seriesDone, seriesRows } from './seriesChallenge'

/**
 * One summary per challenge (D-0060): the ring row at the top of the
 * Challenges page, the trophy lines under it and the `challenges-N` badge
 * family all read this one list, so they can never disagree with the cards.
 *
 * A challenge with no goal (no reading goal set, a monthly challenge with no
 * books picked) has no ring at all.
 */

export interface ChallengeRing {
  /** the page's block id, so a ring can scroll to `#challenge-<id>` */
  id: string
  /** the full name, for the accessible name */
  name: string
  /** the word under the ring */
  short: string
  done: number
  goal: number
  complete: boolean
  /** what the numbers count, for the accessible name ("days", "seasons", "pages") */
  counts?: string
}

export interface RingInput {
  books: Book[]
  year: number
  /** the reading goal for that year, when she set one */
  goal: number | null
  /** her own challenges (every year; this filters by year itself) */
  own?: OwnChallenge[]
  /** her own bingo swaps (D-0063) */
  swaps?: ReadonlyMap<string, string>
  today?: string
}

/** Every challenge of a year that has a goal, in the order the page shows them. */
export function challengeRings({ books, year, goal, own = [], swaps, today = localDay() }: RingInput): ChallengeRing[] {
  const out: ChallengeRing[] = []
  /**
   * A challenge with no goal has no ring (D-0060 §3). The ready-made ones with
   * a goal of their own (bingo, A–Z, the world, the seasons, the minutes) also
   * wait until she has started them, so a brand-new shelf shows an empty page
   * with its own line instead of a row of zeroes. The ones she sets up herself
   * (the reading goal, the monthly picks, the series, her own challenges) have
   * no goal until she has, so they need nothing extra.
   */
  const push = (r: ChallengeRing, needsStart = false) => {
    if (r.goal >= 1 && (!needsStart || r.done > 0)) out.push({ ...r, complete: r.done >= r.goal })
  }

  // the reading goal
  const read = periodStats(books, { kind: 'year', year }).books
  push({ id: 'goal', name: 'Reading goal', short: 'Goal', done: read, goal: goal ?? 0, complete: false, counts: 'books' })

  // the monthly challenge: the months she picked a book for
  const months = challengeCalendar(books, year, today).filter((m) => m.item)
  push({
    id: 'monthly',
    name: 'Monthly challenge',
    short: 'Month',
    done: months.filter((m) => m.item?.doneOn).length,
    goal: months.length,
    complete: false,
    counts: 'months',
  })

  // bingo: the card being played
  const bingo = bingoYear(books, year, today, swaps)
  push(
    {
      id: 'bingo',
      name: 'Book bingo',
      short: 'Bingo',
      done: bingo.squares.filter((s) => s.ticked).length,
      goal: bingo.squares.length,
      complete: false,
      counts: 'squares',
    },
    true,
  )

  // A–Z titles
  push(
    {
      id: 'alphabet',
      name: 'A–Z challenge',
      short: 'A–Z',
      done: alphabetYear(books, year, today, 'title').done.size,
      goal: LETTERS.length,
      complete: false,
      counts: 'letters',
    },
    true,
  )

  // around the world
  const world = worldChallenge(books, year)
  push(
    { id: 'world', name: 'Around the world', short: 'World', done: world.done, goal: world.goal, complete: false, counts: 'countries' },
    true,
  )

  // seasonal
  const seasons = seasonChallenge(books, year, today)
  push({ id: 'season', name: 'Seasonal', short: 'Seasons', done: seasonsDone(seasons), goal: 4, complete: false, counts: 'seasons' }, true)

  // minutes a day
  const minutes = minutesYear(books, year, today)
  push(
    { id: 'minutes', name: 'Minutes a day', short: 'Minutes', done: minutes.done, goal: minutes.goal, complete: false, counts: 'days' },
    true,
  )

  // read the series
  const rows = seriesRows(own, books, year)
  push({ id: 'series', name: 'Read the series', short: 'Series', done: seriesDone(rows), goal: rows.length, complete: false, counts: 'series' })

  // her own challenges, the series picks aside (they are the Read the series card)
  for (const c of own) {
    if (c.year !== year || c.rule === 'finishseries') continue
    const done = challengeDone(c, challengeBooks(c, books))
    const unit = unitOf(c)
    push({
      id: `own:${c.id}`,
      name: c.name,
      short: c.name.split(/\s+/)[0] ?? c.name,
      done,
      goal: c.target,
      complete: false,
      ...(unit !== 'books' && { counts: unit }),
    })
  }
  return out
}

/** A ring's accessible name: "Reading goal: 3 of 12" / "…: done, 12 of 12". */
export function ringLabel(r: ChallengeRing): string {
  const n = (x: number) => x.toLocaleString('en')
  const count = `${n(r.done)} of ${n(r.goal)}${r.counts ? ` ${r.counts}` : ''}`
  return `${r.name}: ${r.complete ? `done, ${count}` : count}`
}

/** The years the badge family counts over: every year with a finish, and this one. */
export function challengeYearsWithData(books: Book[], own: OwnChallenge[], today = localDay()): number[] {
  const years = new Set<number>([Number(today.slice(0, 4))])
  for (const b of books) for (const d of b.finished ?? []) years.add(Number(d.slice(0, 4)))
  for (const c of own) years.add(c.year)
  return [...years].filter((y) => Number.isInteger(y) && y > 1900 && y < 3000).sort()
}

export interface CompletedInput {
  books: Book[]
  own?: OwnChallenge[]
  swaps?: ReadonlyMap<string, string>
  /** the reading goal per year, when she set one */
  goals?: Record<number, number | null>
  today?: string
}

/** Every complete challenge over every year with data, as `<year>:<id>`. */
export function completedChallenges({ books, own = [], swaps, goals = {}, today = localDay() }: CompletedInput): string[] {
  const out: string[] = []
  for (const year of challengeYearsWithData(books, own, today))
    for (const r of challengeRings({ books, year, goal: goals[year] ?? null, own, swaps, today }))
      if (r.complete) out.push(`${year}:${r.id}`)
  return out
}

/** The own-challenge count line, re-exported so the card and the ring agree. */
export { doneText }
