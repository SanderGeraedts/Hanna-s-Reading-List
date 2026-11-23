import type { Book } from './library'
import { timesRead } from './library'
import { seriesGroups } from './series'
import { newChallengeId, ruleOptions } from './ownChallenges'
import type { OwnChallenge } from './ownChallenges'

/**
 * Read the series (D-0065 §4): the series she picks to finish this year, kept
 * as her own challenges with the rule `finishseries` — the challenges list is
 * already saved with her account, so nothing new is stored and nothing waits
 * for Sander.
 *
 * Progress is the books of that series she has read **ever**: she is finishing
 * a series, not re-reading it in one year.
 */

/** Her picks for a year, in the order she made them. */
export const seriesPicks = (own: OwnChallenge[], year: number) =>
  own.filter((c) => c.rule === 'finishseries' && c.year === year)

/** The series on her shelf she has not picked yet, alphabetically. */
export function pickableSeries(books: Book[], own: OwnChallenge[], year: number) {
  const taken = new Set(seriesPicks(own, year).map((c) => c.value))
  return ruleOptions('finishseries', books).filter((o) => !taken.has(o.value))
}

/** A new pick: the series key as the value, its size on the shelf as the target. */
export function newSeriesPick(key: string, name: string, books: Book[], year: number): OwnChallenge {
  const size = [...seriesGroups(books).values()].filter((g) => g.key === key).length
  return {
    id: newChallengeId(),
    name,
    target: Math.max(1, size),
    year,
    rule: 'finishseries',
    value: key,
  }
}

export interface SeriesProgressRow {
  challenge: OwnChallenge
  /** the series' name as it is on the shelf now, else the name she saved */
  name: string
  /** books of the series she has read */
  done: number
  /** books of the series on her shelf now, else the saved target */
  total: number
  complete: boolean
  books: Book[]
}

/** One row per picked series. */
export function seriesRows(own: OwnChallenge[], books: Book[], year: number): SeriesProgressRow[] {
  const groups = seriesGroups(books)
  return seriesPicks(own, year).map((c) => {
    const mine = books.filter((b) => groups.get(b.id)?.key === c.value)
    const name = mine.length ? (groups.get(mine[0].id)!.name ?? c.name) : c.name
    const done = mine.filter((b) => timesRead(b) > 0).length
    // the series as it is on the shelf now; a pick whose series is gone keeps its saved target
    const total = mine.length || c.target
    return { challenge: c, name, done: Math.min(done, total), total, complete: total > 0 && done >= total, books: mine }
  })
}

/** Series completed out of the ones she picked. */
export const seriesDone = (rows: SeriesProgressRow[]) => rows.filter((r) => r.complete).length
