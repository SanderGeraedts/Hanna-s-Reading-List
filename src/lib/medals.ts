import type { Book } from './library'
import { timesRead } from './library'
import { seriesGroups } from './series'

/**
 * Medals. A finished book wears one on its spine: bronze for the first read,
 * silver for the second, gold from the third on. A series she has read every
 * book of gets one on its book nook, going by the book read the fewest times.
 * The year in review counts the medals won that year.
 */

export type Metal = 'bronze' | 'silver' | 'gold'

export const metalFor = (reads: number): Metal => (reads >= 3 ? 'gold' : reads === 2 ? 'silver' : 'bronze')

/** How many times every book of a series has been read: the least-read book decides. */
export function seriesReads(books: Book[]): number {
  return books.length ? Math.min(...books.map((b) => timesRead(b))) : 0
}

/**
 * Each read of a book, oldest first: '' for reads from before finish days
 * were noted (they count as the earliest), else the day it was finished.
 */
function readDays(b: Book): string[] {
  const days = [...(b.finished ?? [])].sort()
  const undated = Math.max(0, timesRead(b) - days.length)
  return [...Array<string>(undated).fill(''), ...days]
}

export type MedalCount = Record<Metal, number>

export interface YearMedals {
  books: MedalCount
  series: MedalCount
}

const none = (): MedalCount => ({ bronze: 0, silver: 0, gold: 0 })

/**
 * The medals won in a year. A book wins one each time it is finished: the
 * metal of that read (first bronze, second silver, third and on gold). A
 * series wins one on the day its last book needed is finished: bronze when
 * every book has been read once, silver twice, gold three times and more.
 * Reads without a day count towards the metal, but not towards any year.
 */
export function yearMedals(books: Book[], year: number): YearMedals {
  const prefix = `${year}-`
  const out: YearMedals = { books: none(), series: none() }
  const reads = new Map(books.map((b) => [b.id, readDays(b)]))

  for (const b of books)
    reads.get(b.id)!.forEach((day, i) => {
      if (day.startsWith(prefix)) out.books[metalFor(i + 1)]++
    })

  const bySeries = new Map<string, Book[]>()
  for (const [id, g] of seriesGroups(books)) {
    if (!g.key) continue
    const list = bySeries.get(g.key) ?? []
    list.push(books.find((b) => b.id === id)!)
    bySeries.set(g.key, list)
  }
  for (const list of bySeries.values()) {
    const times = seriesReads(list)
    for (let n = 1; n <= times; n++) {
      // the n-th time through the series ends with the latest n-th read of its books
      const day = list.map((b) => reads.get(b.id)![n - 1]).reduce((a, d) => (d > a ? d : a), '')
      if (day.startsWith(prefix)) out.series[metalFor(n)]++
    }
  }
  return out
}

/** "🥉 28 · 🥈 3 · 🥇 1", leaving out metals with none; '' when there are none at all. */
export function medalLine(count: MedalCount): string {
  const parts: string[] = []
  if (count.bronze) parts.push(`🥉 ${count.bronze}`)
  if (count.silver) parts.push(`🥈 ${count.silver}`)
  if (count.gold) parts.push(`🥇 ${count.gold}`)
  return parts.join(' · ')
}
