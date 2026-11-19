import type { Book } from './library'
import { localDay } from './library'
import { LETTERS, alphabetYear } from './alphabet'
import { bingoYear } from './bingo'
import { challengeCalendar } from './monthChallenge'
import { periodStats } from './stats'

/**
 * The trophy row on the Challenges page: what Hanna completed in a year,
 * one short line per challenge she took part in.
 */
export interface Trophy {
  id: 'goal' | 'bingo' | 'alphabet' | 'alphabetAuthors' | 'monthly'
  label: string
  /** completed */
  done: boolean
}

export function yearTrophies(books: Book[], year: number, goal: number | null, today = localDay()): Trophy[] {
  const out: Trophy[] = []
  const read = periodStats(books, { kind: 'year', year }).books
  if (goal) {
    out.push({
      id: 'goal',
      label: read >= goal ? `Goal reached · ${read} of ${goal}` : `Goal · ${read} of ${goal}`,
      done: read >= goal,
    })
  }
  const full = bingoYear(books, year, today).finished.length
  if (full > 0) out.push({ id: 'bingo', label: full === 1 ? '1 full bingo card' : `${full} full bingo cards`, done: true })
  for (const [id, kind, name] of [
    ['alphabet', 'title', 'A–Z titles'],
    ['alphabetAuthors', 'author', 'A–Z authors'],
  ] as const) {
    const n = alphabetYear(books, year, today, kind).done.size
    if (n > 0) out.push({ id, label: `${name} · ${n}/${LETTERS.length}`, done: n === LETTERS.length })
  }
  const months = challengeCalendar(books, year, today).filter((m) => m.item)
  if (months.length > 0) {
    const done = months.filter((m) => m.item?.doneOn).length
    out.push({ id: 'monthly', label: `Monthly · ${done} of ${months.length} months`, done: done === months.length })
  }
  return out
}

/** The years the Challenges page can show: from the first year with a finish to this one. */
export function challengeYears(books: Book[], today = localDay()): number[] {
  const thisYear = Number(today.slice(0, 4))
  let first = thisYear
  for (const b of books) for (const d of b.finished ?? []) first = Math.min(first, Number(d.slice(0, 4)) || thisYear)
  return Array.from({ length: thisYear - first + 1 }, (_, i) => first + i)
}
