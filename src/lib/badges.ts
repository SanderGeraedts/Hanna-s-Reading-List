import type { Book } from './library'
import { localDay, timesRead } from './library'
import { LETTERS, alphabetYear } from './alphabet'
import { bingoYear } from './bingo'
import { challengeCalendar } from './monthChallenge'
import { amountUnit } from './readingLog'
import { listenOnly } from './listening'
import { seriesGroups } from './series'
import { allFinishes } from './stats'

/**
 * Milestones & badges on the dashboard: worked out from the books, so nothing
 * is saved for them. A badge has the day it was earned when that's known
 * (finishes from before days were noted have none); a badge earned in the
 * last week also shows under "Waiting for you".
 */

export interface Badge {
  id: string
  icon: string
  name: string
  /** what it takes */
  how: string
  earned: boolean
  /** yyyy-mm-dd, when known */
  on?: string
}

/** The day a running total first reaches `goal`, going through dated steps in order. */
function reachedOn(steps: Array<{ day?: string; n: number }>, goal: number): { earned: boolean; on?: string } {
  let total = 0
  for (const s of [...steps].sort((a, b) => (a.day ?? '').localeCompare(b.day ?? ''))) {
    total += s.n
    if (total >= goal) return { earned: true, ...(s.day && { on: s.day }) }
  }
  return { earned: false }
}

/** The longest run of days in a row, as the day each length was first reached. */
function streakDays(days: string[]): Map<number, string> {
  const out = new Map<number, string>()
  const num = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86_400_000
  let run = 0
  let prev = -2
  for (const d of [...new Set(days)].sort()) {
    const n = num(d)
    run = n === prev + 1 ? run + 1 : 1
    prev = n
    if (!out.has(run)) out.set(run, d)
  }
  return out
}

export function badges(books: Book[], today = localDay()): Badge[] {
  const finishes = allFinishes(books)
  const out: Badge[] = []
  const add = (id: string, icon: string, name: string, how: string, r: { earned: boolean; on?: string }) =>
    out.push({ id, icon, name, how, ...r })

  // books finished
  const reads = finishes.map((f) => ({ day: f.day, n: 1 }))
  for (const [n, icon] of [
    [1, '📖'],
    [10, '📚'],
    [50, '🏅'],
    [100, '🏆'],
    [250, '👑'],
  ] as const) {
    add(`books-${n}`, icon, n === 1 ? 'First book' : `${n} books`, `Finish ${n === 1 ? 'a book' : `${n} books`}`, reachedOn(reads, n))
  }

  // pages read, from finished books with pages of their own
  const pages = finishes.filter((f) => !listenOnly(f.book) && f.book.pages).map((f) => ({ day: f.day, n: f.book.pages! }))
  add('pages-10000', '📜', '10,000 pages', 'Read 10,000 pages', reachedOn(pages, 10_000))

  // hours listened, from the reading log
  const listened: Array<{ day: string; n: number }> = []
  for (const b of books)
    if (amountUnit(b) === 'time')
      for (const [day, amount] of Object.entries(b.readingLog ?? {})) if (amount > 0) listened.push({ day, n: amount * b.minutes! })
  add('listen-100', '🎧', '100 hours listened', 'Listen for 100 hours', reachedOn(listened, 100 * 60))
  add('listen-1000', '🎶', '1,000 hours listened', 'Listen for 1,000 hours', reachedOn(listened, 1000 * 60))

  // series finished: the day the last book of it was first finished
  const groups = seriesGroups(books)
  const bySeries = new Map<string, Book[]>()
  for (const b of books) {
    const key = groups.get(b.id)?.key
    if (key) bySeries.set(key, [...(bySeries.get(key) ?? []), b])
  }
  const seriesDone: Array<{ day?: string; n: number }> = []
  for (const list of bySeries.values()) {
    if (!list.every((b) => timesRead(b) > 0)) continue
    const firsts = list.map((b) => [...(b.finished ?? [])].sort()[0])
    seriesDone.push({ day: firsts.every(Boolean) ? firsts.sort().at(-1) : undefined, n: 1 })
  }
  add('series-1', '🔗', 'First series', 'Finish every book of a series', reachedOn(seriesDone, 1))
  add('series-5', '⛓️', '5 series', 'Finish 5 series', reachedOn(seriesDone, 5))

  // challenges, over every year with finishes
  const years = [...new Set(finishes.map((f) => f.day?.slice(0, 4)).filter(Boolean))].map(Number).sort()
  const bingoDays: string[] = []
  const alphabetDays: string[] = []
  const monthlyDays: string[] = []
  for (const y of years) {
    for (const c of bingoYear(books, y, today).finished) bingoDays.push(c.endsAt.slice(0, 10))
    const a = alphabetYear(books, y, today, 'title')
    if (a.done.size === LETTERS.length) alphabetDays.push([...a.done.values()].map((d) => d.day).sort().at(-1)!)
    const months = challengeCalendar(books, y, today).filter((m) => m.item)
    if (months.length === 12 && months.every((m) => m.item?.doneOn)) {
      monthlyDays.push(months.map((m) => m.item!.doneOn!).sort().at(-1)!)
    }
  }
  const first = (days: string[]) => (days.length ? { earned: true, on: days.sort()[0] } : { earned: false })
  add('bingo', '🎯', 'Full bingo card', 'Fill a whole book bingo card', first(bingoDays))
  add('alphabet', '🔤', 'A to Z', 'Finish a book for every letter in one year', first(alphabetDays))
  add('monthly', '🗓️', 'Twelve months', 'Finish all 12 monthly challenge books of a year', first(monthlyDays))

  // reading streaks, from the reading log
  const runs = streakDays(books.flatMap((b) => Object.entries(b.readingLog ?? {}).filter(([, a]) => a > 0).map(([d]) => d)))
  for (const n of [7, 30]) {
    const on = runs.get(n)
    add(`streak-${n}`, n === 7 ? '🔥' : '☄️', `${n}-day streak`, `Read ${n} days in a row`, on ? { earned: true, on } : { earned: false })
  }

  // a favourite read again and again
  const rereads = books
    .filter((b) => timesRead(b) >= 5)
    .map((b) => [...(b.finished ?? [])].sort()[4])
    .sort()
  add('reread-5', '💞', 'Old favourite', 'Read one book 5 times', rereads.length ? { earned: true, ...(rereads[0] && { on: rereads[0] }) } : { earned: false })

  return out
}

/** Badges earned in the last 7 days (with a known day): shown under "Waiting for you". */
export function newBadges(all: Badge[], today = localDay()): Badge[] {
  const weekAgo = new Date(`${today}T12:00:00Z`)
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 6)
  const from = weekAgo.toISOString().slice(0, 10)
  return all.filter((b) => b.earned && b.on && b.on >= from && b.on <= today)
}
