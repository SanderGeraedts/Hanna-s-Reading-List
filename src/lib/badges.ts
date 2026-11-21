import type { Book } from './library'
import { hexToHsl, localDay, timesRead } from './library'
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
  /** how far along, for a badge with steps (e.g. 3 of 10 books) */
  progress?: { done: number; goal: number }
  /** a secret badge: hidden until earned, a surprise */
  secret?: boolean
}

type Reached = { earned: boolean; on?: string; total?: number }

/** The day a running total first reaches `goal`, going through dated steps in order (and the total so far). */
function reachedOn(steps: Array<{ day?: string; n: number }>, goal: number): Reached {
  let total = 0
  let hit: Reached | null = null
  for (const s of [...steps].sort((a, b) => (a.day ?? '').localeCompare(b.day ?? ''))) {
    total += s.n
    if (!hit && total >= goal) hit = { earned: true, ...(s.day && { on: s.day }) }
  }
  return { ...(hit ?? { earned: false }), total }
}

/** The longest run of days in a row, as the day each length was first reached. */
function streakDays(days: string[]): Map<number, string> {
  const out = new Map<number, string>()
  let run = 0
  let prev = -2
  for (const d of [...new Set(days)].sort()) {
    const n = dayNumber(d)
    run = n === prev + 1 ? run + 1 : 1
    prev = n
    if (!out.has(run)) out.set(run, d)
  }
  return out
}

const dayNumber = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86_400_000

/** First time each new value shows up, as steps of one (e.g. a new genre, a new language). */
function firstsOf(items: Array<{ day?: string; values: string[] }>) {
  const seen = new Set<string>()
  const steps: Array<{ day?: string; n: number }> = []
  for (const it of [...items].sort((a, b) => (a.day ?? '').localeCompare(b.day ?? ''))) {
    for (const v of it.values) {
      if (seen.has(v)) continue
      seen.add(v)
      steps.push({ day: it.day, n: 1 })
    }
  }
  return steps
}

/** The rainbow colour a spine is, or null when it's too grey, dark or light to say. */
function rainbowColour(hex: string): number | null {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return null
  const [h, s, l] = hexToHsl(hex)
  if (s < 0.25 || l < 0.15 || l > 0.85) return null
  // red, orange, yellow, green, blue, indigo, violet
  const edges = [15, 40, 70, 165, 225, 260, 330]
  const i = edges.findIndex((e) => h < e)
  return i === -1 ? 0 : i
}

export function badges(books: Book[], today = localDay()): Badge[] {
  const finishes = allFinishes(books)
  const out: Badge[] = []
  const add = (id: string, icon: string, name: string, how: string, r: Reached, goal?: number, secret?: boolean) =>
    out.push({
      id,
      icon,
      name,
      how,
      earned: r.earned,
      ...(r.on && { on: r.on }),
      // progress on the visible badges with steps that aren't earned yet
      ...(goal && !r.earned && !secret && { progress: { done: Math.min(goal, Math.floor(r.total ?? 0)), goal } }),
      ...(secret && { secret: true }),
    })
  const once = (days: Array<string | undefined>): Reached => {
    const known = days.filter((d): d is string => !!d).sort()
    return days.length ? { earned: true, ...(known[0] && { on: known[0] }) } : { earned: false }
  }

  // books finished
  const reads = finishes.map((f) => ({ day: f.day, n: 1 }))
  for (const [n, icon] of [
    [1, '📖'],
    [5, '🔖'],
    [10, '📚'],
    [25, '🎓'],
    [50, '🏅'],
    [100, '🏆'],
    [250, '👑'],
  ] as const) {
    add(`books-${n}`, icon, n === 1 ? 'First book' : `${n} books`, `Finish ${n === 1 ? 'a book' : `${n} books`}`, reachedOn(reads, n), n)
  }

  // pages read, from finished books with pages of their own
  const pages = finishes.filter((f) => !listenOnly(f.book) && f.book.pages).map((f) => ({ day: f.day, n: f.book.pages! }))
  for (const [n, icon] of [
    [1000, '📄'],
    [5000, '🗞️'],
    [10_000, '📜'],
    [25_000, '🏛️'],
  ] as const) {
    add(`pages-${n}`, icon, `${n.toLocaleString('en')} pages`, `Read ${n.toLocaleString('en')} pages`, reachedOn(pages, n), n)
  }

  // hours listened, from the reading log
  const listened: Array<{ day: string; n: number }> = []
  for (const b of books)
    if (amountUnit(b) === 'time')
      for (const [day, amount] of Object.entries(b.readingLog ?? {})) if (amount > 0) listened.push({ day, n: (amount * b.minutes!) / 60 })
  for (const [n, icon] of [
    [10, '🎵'],
    [100, '🎧'],
    [1000, '🎶'],
  ] as const) {
    add(`listen-${n}`, icon, `${n.toLocaleString('en')} hours listened`, `Listen for ${n.toLocaleString('en')} hours`, reachedOn(listened, n), n)
  }

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
  for (const [n, icon] of [
    [3, '🪢'],
    [5, '⛓️'],
    [10, '🧶'],
  ] as const) {
    add(`series-${n}`, icon, `${n} series`, `Finish ${n} series`, reachedOn(seriesDone, n), n)
  }

  // variety: different genres and languages among the books she finished
  const genreSteps = firstsOf(finishes.map((f) => ({ day: f.day, values: f.book.genres ?? [] })))
  add('genres-5', '🧭', 'Explorer', 'Finish books in 5 different genres', reachedOn(genreSteps, 5), 5)
  add('genres-10', '🗺️', 'Globetrotter', 'Finish books in 10 different genres', reachedOn(genreSteps, 10), 10)
  const languageSteps = firstsOf(finishes.map((f) => ({ day: f.day, values: f.book.language ? [f.book.language] : [] })))
  add('languages-2', '🗣️', 'Bilingual', 'Finish books in 2 languages', reachedOn(languageSteps, 2), 2)
  add('languages-3', '🌍', 'Polyglot', 'Finish books in 3 languages', reachedOn(languageSteps, 3), 3)

  // ratings and the journal
  const rated = books.filter((b) => b.rating).map((b) => ({ day: [...(b.finished ?? [])].sort().at(-1), n: 1 }))
  add('rated-10', '⭐', 'Critic', 'Rate 10 books', reachedOn(rated, 10), 10)
  add('rated-50', '🌟', 'Head critic', 'Rate 50 books', reachedOn(rated, 50), 50)
  const notes = books.flatMap((b) => Object.entries(b.journal ?? {}).filter(([, t]) => t.trim()).map(([day]) => ({ day, n: 1 })))
  add('journal-10', '✏️', 'Diarist', 'Write 10 journal notes', reachedOn(notes, 10), 10)
  add('journal-50', '📓', 'Storyteller', 'Write 50 journal notes', reachedOn(notes, 50), 50)

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
  add('bingo', '🎯', 'Full bingo card', 'Fill a whole book bingo card', once(bingoDays))
  add('alphabet', '🔤', 'A to Z', 'Finish a book for every letter in one year', once(alphabetDays))
  add('monthly', '🗓️', 'Twelve months', 'Finish all 12 monthly challenge books of a year', once(monthlyDays))

  // reading streaks, from the reading log
  const runs = streakDays(books.flatMap((b) => Object.entries(b.readingLog ?? {}).filter(([, a]) => a > 0).map(([d]) => d)))
  const longest = Math.max(0, ...runs.keys())
  for (const [n, icon] of [
    [3, '✨'],
    [7, '🔥'],
    [14, '🌋'],
    [30, '☄️'],
    [100, '🌠'],
  ] as const) {
    const on = runs.get(n)
    add(`streak-${n}`, icon, `${n}-day streak`, `Read ${n} days in a row`, on ? { earned: true, on } : { earned: false, total: longest }, n)
  }

  // a favourite read again and again
  const rereadOn = (times: number) => {
    const days = books.filter((b) => timesRead(b) >= times).map((b) => [...(b.finished ?? [])].sort()[times - 1])
    return once(days)
  }
  add('reread-5', '💞', 'Old favourite', 'Read one book 5 times', rereadOn(5))

  // ---- secret badges: hidden until earned ------------------------------
  const secret = (id: string, icon: string, name: string, how: string, r: Reached) => add(id, icon, name, how, r, undefined, true)

  // 5 different books by the same author
  const byAuthor = new Map<string, Array<string | undefined>>()
  for (const b of books) {
    const author = b.authors[0]?.trim().toLowerCase()
    if (!author || timesRead(b) === 0) continue
    byAuthor.set(author, [...(byAuthor.get(author) ?? []), [...(b.finished ?? [])].sort()[0]])
  }
  secret(
    'author-5',
    '💌',
    'Loyal fan',
    'Finish 5 books by the same author',
    once([...byAuthor.values()].filter((d) => d.length >= 5).map((d) => (d.every(Boolean) ? (d as string[]).sort()[4] : undefined))),
  )
  secret('doorstopper', '🧱', 'Doorstopper', 'Finish a book of 800 pages or more', once(finishes.filter((f) => !listenOnly(f.book) && (f.book.pages ?? 0) >= 800).map((f) => f.day)))

  // started and finished on the same day; or a read that took over 100 days
  const sameDay: string[] = []
  const slow: string[] = []
  for (const b of books) {
    const starts = [...(b.started ?? [])].sort()
    for (const end of b.finished ?? []) {
      const start = starts.filter((s) => s <= end).at(-1)
      if (!start) continue
      if (start === end) sameDay.push(end)
      if (dayNumber(end) - dayNumber(start) > 100) slow.push(end)
    }
  }
  secret('same-day', '⚡', "Couldn't put it down", 'Start and finish a book on the same day', once(sameDay))
  secret('slow', '🐢', 'Slow and steady', 'Take more than 100 days over one book', once(slow))

  // a book that waited on the shelf for over a year
  const dusty = books.flatMap((b) => {
    const first = [...(b.finished ?? [])].sort()[0]
    return b.addedAt > 0 && first && dayNumber(first) - b.addedAt / 86_400_000 > 365 ? [first] : []
  })
  secret('dusty', '🕸️', 'Dusty pile', 'Finish a book that waited on your shelf for over a year', once(dusty))
  secret('reread-3', '🔁', 'Old friend', 'Read one book 3 times', rereadOn(3))

  const spicy = books.filter((b) => b.spice === 5 && timesRead(b) > 0).map((b) => ({ day: [...(b.finished ?? [])].sort()[0], n: 1 }))
  secret('spice-5', '🌶️', 'Spice queen', 'Finish 5 books with 5 peppers', reachedOn(spicy, 5))

  // three five-star books in a row, in the order she finished them
  const ordered = finishes.filter((f) => f.day).sort((a, b) => a.day!.localeCompare(b.day!))
  let fives = 0
  let fiveOn: string | undefined
  for (const f of ordered) {
    fives = f.book.rating === 5 ? fives + 1 : 0
    if (fives === 3 && !fiveOn) fiveOn = f.day
  }
  secret('five-stars', '🌠', 'Five-star streak', 'Finish 3 five-star books in a row', fiveOn ? { earned: true, on: fiveOn } : { earned: false })
  secret('new-year', '🎆', "New Year's reader", 'Finish a book on 1 January', once(ordered.filter((f) => f.day!.endsWith('-01-01')).map((f) => f.day)))

  // three books finished within a week
  let bingeOn: string | undefined
  for (let i = 2; i < ordered.length && !bingeOn; i++) {
    if (dayNumber(ordered[i].day!) - dayNumber(ordered[i - 2].day!) <= 6) bingeOn = ordered[i].day
  }
  secret('binge', '🍿', 'Binge', 'Finish 3 books in one week', bingeOn ? { earned: true, on: bingeOn } : { earned: false })

  // spines in all seven colours of the rainbow
  const colourSteps = firstsOf(
    finishes.map((f) => {
      const c = rainbowColour(f.book.color)
      return { day: f.day, values: c === null ? [] : [String(c)] }
    }),
  )
  secret('rainbow', '🌈', 'Rainbow', 'Finish books with spines in all 7 colours of the rainbow', reachedOn(colourSteps, 7))

  return out
}

/** Badges earned in the last 7 days (with a known day): shown under "Waiting for you". */
export function newBadges(all: Badge[], today = localDay()): Badge[] {
  const weekAgo = new Date(`${today}T12:00:00Z`)
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 6)
  const from = weekAgo.toISOString().slice(0, 10)
  return all.filter((b) => b.earned && b.on && b.on >= from && b.on <= today)
}
