import type { Book } from './library'
import { formatsOf, hexToHsl, localDay, timesRead } from './library'
import { LETTERS, alphabetYear } from './alphabet'
import { bingoYear } from './bingo'
import { challengeCalendar } from './monthChallenge'
import { amountUnit } from './readingLog'
import { AUDIO_FORMATS, listenOnly } from './listening'
import { seriesGroups } from './series'
import { allFinishes } from './stats'
import { finished as onTheMap, landKey, placesOf } from './places'
import { MAP_COUNTRY_SET } from './mapCountries'
import { CONTINENTS, continentsOf } from './continents'
import type { Continent } from './continents'
import { bookKinds } from './pileHeight'
import { foldTrope, tropesOf } from './tropes'
import { completedChallenges } from './challengeRings'
import type { OwnChallenge } from './ownChallenges'

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
  /** a secret badge's riddle, shown on its locked medal's card when tapped (the name stays secret) */
  riddle?: string
  /** the rim of its medal once earned, by its step in its family (D-0038) */
  tier: Tier
}

export type Tier = 'bronze' | 'silver' | 'gold'

/**
 * Bronze, silver or gold by a badge's step in its family (D-0038): a family is the badges
 * whose ids are the same up to a final `-<number>` (books-1 … books-250), secret ones
 * included. In a family of two or more the lowest step is bronze, the highest gold and the
 * rest silver; a badge on its own is gold.
 */
function withTiers(list: Array<Omit<Badge, 'tier'>>): Badge[] {
  const step = (id: string) => {
    const m = id.match(/^(.*)-(\d+)$/)
    return m ? { family: m[1], n: Number(m[2]) } : { family: id, n: 0 }
  }
  const families = new Map<string, number[]>()
  for (const b of list) {
    const { family, n } = step(b.id)
    families.set(family, [...(families.get(family) ?? []), n])
  }
  return list.map((b) => {
    const { family, n } = step(b.id)
    const steps = families.get(family)!
    const tier: Tier =
      steps.length < 2 || n === Math.max(...steps) ? 'gold' : n === Math.min(...steps) ? 'bronze' : 'silver'
    return { ...b, tier }
  })
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

/** A riddle for each secret badge: a hint, never the answer. */
export const RIDDLES: Record<string, string> = {
  'author-5': 'Five times you return to the same storyteller.',
  doorstopper: 'A tale so thick it could hold a door open.',
  'same-day': 'Open it at sunrise, close it by moonlight.',
  slow: 'Some stories need a whole season to be told.',
  dusty: 'A book that waited a long, long time on your shelf for its turn.',
  'reread-3': "Third time's the charm with a story you love.",
  'spice-5': 'Five times the peppers burn their brightest.',
  'five-stars': 'Three shining stories in a row, each worth every star.',
  'new-year': 'Turn the last page as the new year begins.',
  binge: 'Three stories in seven days.',
  rainbow: 'Red, orange, yellow, green, blue, indigo, violet: finish them all.',
  'home-sweet-home': 'No passport needed: a story set among the tulips, windmills and canals.',
  birthday: 'Turn the last page on the one day a year the candles are all for you.',
}

/** The travel badges for each continent (T-0040). */
const POSTCARDS: Record<Continent, { id: string; icon: string }> = {
  Europe: { id: 'continent-europe', icon: '🏰' },
  Asia: { id: 'continent-asia', icon: '🏯' },
  Africa: { id: 'continent-africa', icon: '🦒' },
  'North America': { id: 'continent-north-america', icon: '🗽' },
  'South America': { id: 'continent-south-america', icon: '🦜' },
  Oceania: { id: 'continent-oceania', icon: '🦘' },
}

export interface BadgeOptions {
  /** this device's birthday, `MM-DD` (D-0039): for the secret Birthday book */
  birthday?: string
  /**
   * her own challenges (D-0064 §6): they are not in `books`, so the
   * `challenges-N` family counts only the ready-made ones without them. Never
   * required, so no caller breaks and no medal is ever wrongly shown as earned.
   */
  challenges?: OwnChallenge[]
  /** her own bingo swaps (D-0067), so a swapped card is judged as she sees it */
  swaps?: ReadonlyMap<string, string>
  /** her reading goal per year, for the reading-goal challenge */
  goals?: Record<number, number | null>
}

export function badges(books: Book[], today = localDay(), options: BadgeOptions = {}): Badge[] {
  const finishes = allFinishes(books)
  // each finished book once, on its first finish day ("different books")
  const finishedBooks = books
    .filter((b) => timesRead(b) > 0)
    .map((b) => ({ book: b, day: [...(b.finished ?? [])].sort()[0] as string | undefined }))
  const authorOf = (b: Book) => b.authors[0]?.trim().toLowerCase() || undefined
  const out: Array<Omit<Badge, 'tier'>> = []
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

  // formats: the pile switch's kinds (paper, e-book, audio), and different books by format
  const kindSteps = firstsOf(finishes.map((f) => ({ day: f.day, values: bookKinds(f.book) })))
  add('kinds-3', '🔀', 'Mix it up', 'Finish a paper book, an e-book and an audiobook', reachedOn(kindSteps, 3), 3)
  const booksWith = (has: (b: Book) => boolean) => finishedBooks.filter((f) => has(f.book)).map((f) => ({ day: f.day, n: 1 }))
  add('library-10', '🪪', 'Library lover', 'Finish 10 books from the library', reachedOn(booksWith((b) => formatsOf(b).includes('library')), 10), 10)
  add('ebooks-10', '📱', 'E-reader', 'Finish 10 e-books', reachedOn(booksWith((b) => formatsOf(b).includes('ebook')), 10), 10)
  add(
    'audiobooks-10',
    '👂',
    'All ears',
    'Finish 10 audiobooks',
    reachedOn(booksWith((b) => formatsOf(b).some((f) => AUDIO_FORMATS.includes(f))), 10),
    10,
  )

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

  // authors: different books by one author (first author, trimmed, lower case), and different authors
  const byAuthor = new Map<string, Array<string | undefined>>()
  for (const { book: b, day } of finishedBooks) {
    const author = authorOf(b)
    if (author) byAuthor.set(author, [...(byAuthor.get(author) ?? []), day])
  }
  const fan = [...byAuthor.values()]
    .map((days) => reachedOn(days.map((day) => ({ day, n: 1 })), 10))
    .filter((r) => r.earned)
    .sort((a, b) => (a.on ?? '￿').localeCompare(b.on ?? '￿'))[0]
  const most = Math.max(0, ...[...byAuthor.values()].map((d) => d.length))
  add('author-10', '🤩', 'Superfan', 'Finish 10 books by the same author', fan ?? { earned: false, total: most }, 10)
  const authorSteps = firstsOf(finishes.map((f) => ({ day: f.day, values: [authorOf(f.book)].filter((a): a is string => !!a) })))
  add('authors-25', '👥', 'Wide reader', 'Finish books by 25 different authors', reachedOn(authorSteps, 25), 25)
  add('authors-50', '🦉', 'Well-read', 'Finish books by 50 different authors', reachedOn(authorSteps, 50), 50)

  // travel (D-0037): the finished books the world map counts, each once, on its first finish day
  const trips = books
    .filter((b) => onTheMap(b) && b.places !== undefined)
    .map((b) => {
      const p = placesOf(b.places!, MAP_COUNTRY_SET)
      return {
        day: [...(b.finished ?? [])].sort()[0] as string | undefined,
        countries: p.countries,
        continents: [...new Set(p.countries.flatMap(continentsOf))],
        lands: [...new Set(p.imaginary.map(landKey))],
      }
    })
  const countrySteps = firstsOf(trips.map((t) => ({ day: t.day, values: t.countries })))
  for (const [n, icon, name] of [
    [5, '🛂', 'Passport stamped'],
    [10, '✈️', 'Frequent flyer'],
    [25, '🧳', 'World traveller'],
    [50, '🌐', 'Around the world'],
  ] as const) {
    add(`countries-${n}`, icon, name, `Finish books set in ${n} countries`, reachedOn(countrySteps, n), n)
  }
  for (const c of CONTINENTS) {
    const { id, icon } = POSTCARDS[c]
    add(id, icon, `Postcard from ${c}`, `Finish a book set in ${c}`, once(trips.filter((t) => t.continents.includes(c)).map((t) => t.day)))
  }
  const continentSteps = firstsOf(trips.map((t) => ({ day: t.day, values: t.continents })))
  add('continents-6', '🌏', 'World tour', 'Finish books set on all 6 continents', reachedOn(continentSteps, 6), 6)
  const landSteps = firstsOf(trips.map((t) => ({ day: t.day, values: t.lands })))
  add('lands-3', '🦄', 'Dreamwalker', 'Finish books set in 3 imaginary lands', reachedOn(landSteps, 3), 3)
  add('lands-10', '🐉', 'Realm hopper', 'Finish books set in 10 imaginary lands', reachedOn(landSteps, 10), 10)

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

  // challenges completed (D-0064 §6): one family, not one medal per challenge.
  // A completed challenge has no day of its own, so these medals carry none.
  const completed = completedChallenges({
    books,
    own: options.challenges ?? [],
    swaps: options.swaps,
    goals: options.goals ?? {},
    today,
  }).length
  for (const [n, icon, name, how] of [
    [1, '🎖️', 'First challenge', 'Finish a challenge'],
    [5, '🏵️', 'Five challenges', 'Finish 5 challenges'],
    [10, '🎗️', 'Ten challenges', 'Finish 10 challenges'],
  ] as const) {
    add(`challenges-${n}`, icon, name, how, { earned: completed >= n, total: completed }, n)
  }

  // seasons, re-reads included
  const month = (d: string) => d.slice(5, 7)
  const spooky = finishes.filter((f) => f.day && month(f.day) === '10' && (f.book.genres ?? []).some((g) => /horror|thriller|paranormal/i.test(g)))
  add('spooky-season', '🎃', 'Spooky season', 'Finish a horror, thriller or paranormal book in October', once(spooky.map((f) => f.day)))
  const summers = new Map<string, string[]>()
  for (const f of finishes) {
    if (!f.day || !['06', '07', '08'].includes(month(f.day))) continue
    const year = f.day.slice(0, 4)
    summers.set(year, [...(summers.get(year) ?? []), f.day])
  }
  const summerOn = [...summers.values()]
    .filter((d) => d.length >= 10)
    .map((d) => d.sort()[9])
    .sort()[0]
  const bestSummer = Math.max(0, ...[...summers.values()].map((d) => d.length))
  add(
    'summer-10',
    '🏖️',
    'Summer reader',
    'Finish 10 books between June and August of one year',
    summerOn ? { earned: true, on: summerOn } : { earned: false, total: bestSummer },
    10,
  )
  add('winter-warmer', '🧣', 'Winter warmer', 'Finish a book on 24, 25 or 26 December', once(finishes.filter((f) => /-12-2[456]$/.test(f.day ?? '')).map((f) => f.day)))

  // reading streaks, from the reading log
  const runs = streakDays(books.flatMap((b) => Object.entries(b.readingLog ?? {}).filter(([, a]) => a > 0).map(([d]) => d)))
  const longest = Math.max(0, ...runs.keys())
  for (const [n, icon] of [
    [3, '✨'],
    [7, '🔥'],
    [14, '🌋'],
    [30, '☄️'],
    [100, '🌠'],
    [365, '🌞'],
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

  // tropes (D-0042): different finished books that share one and the same trope.
  // One family, not one badge per trope: her own words must not change the grid.
  const byTrope = new Map<string, { name: string; days: Array<string | undefined> }>()
  for (const { book: b, day } of finishedBooks) {
    const seen = new Set<string>()
    for (const t of tropesOf(b)) {
      const key = foldTrope(t)
      if (!key || seen.has(key)) continue
      seen.add(key)
      const found = byTrope.get(key)
      if (found) found.days.push(day)
      else byTrope.set(key, { name: t, days: [day] })
    }
  }
  const bestTrope = Math.max(0, ...[...byTrope.values()].map((t) => t.days.length))
  for (const [n, icon, name] of [
    [5, '💘', 'Trope lover'],
    [10, '🫶', 'Trope devotee'],
    [25, '💝', 'Trope queen'],
  ] as const) {
    // the earliest book that brought a trope to n, and which trope it was
    const hit = [...byTrope.values()]
      .map((t) => ({ name: t.name, ...reachedOn(t.days.map((day) => ({ day, n: 1 })), n) }))
      .filter((r) => r.earned)
      .sort((a, b) => (a.on ?? '￿').localeCompare(b.on ?? '￿'))[0]
    add(
      `trope-${n}`,
      icon,
      name,
      hit ? `Finish ${n} books with the same trope · ${hit.name}` : `Finish ${n} books with the same trope`,
      hit ?? { earned: false, total: bestTrope },
      n,
    )
  }

  // ---- secret badges: hidden until earned ------------------------------
  const secret = (id: string, icon: string, name: string, how: string, r: Reached) => {
    add(id, icon, name, how, r, undefined, true)
    out[out.length - 1].riddle = RIDDLES[id]
  }

  // 5 different books by the same author
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

  // a story set at home
  secret('home-sweet-home', '🌷', 'Home sweet home', 'Finish a book set in the Netherlands', once(trips.filter((t) => t.countries.includes('Netherlands')).map((t) => t.day)))

  // a book finished on her birthday, any year; the day comes from this device only (D-0039)
  const bday = options.birthday && /^\d\d-\d\d$/.test(options.birthday) ? `-${options.birthday}` : undefined
  secret('birthday', '🎂', 'Birthday book', 'Finish a book on your birthday', once(bday ? finishes.filter((f) => f.day?.endsWith(bday)).map((f) => f.day) : []))

  return withTiers(out)
}

/** Badges earned in the last 7 days (with a known day): shown under "Waiting for you". */
export function newBadges(all: Badge[], today = localDay()): Badge[] {
  const weekAgo = new Date(`${today}T12:00:00Z`)
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 6)
  const from = weekAgo.toISOString().slice(0, 10)
  return all.filter((b) => b.earned && b.on && b.on >= from && b.on <= today)
}
