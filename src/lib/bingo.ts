import type { Book, FinishedBingoCard } from './library'
import { formatsOf, localDay, timesRead } from './library'
import { hasAudio, thicknessPages } from './listening'
import { cleanRating, cleanSpice } from './ratings'
import { seriesProgress } from './insights'
import { seriesGroups } from './series'
import { allFinishes } from './stats'

/**
 * Book bingo (#119). A card has 16 squares, and every square ticks itself
 * from the books Hanna finishes: there is nothing to tick by hand, so the card
 * is the same on every device.
 *
 * - When all 16 are ticked, a new card starts. It only counts books finished
 *   after the previous card was full, so no finish counts twice.
 * - The first card of a year keeps the squares the card has always had; later
 *   cards are a mix of all squares. The mix is random but fixed: the same year
 *   and card number always give the same squares.
 * - A square still open a month after its card started swaps for another one,
 *   and again every month, so a card can't get stuck. A swapped-in square
 *   counts every book finished since the card started. The month is counted
 *   from 14 November 2026 at the earliest, when swapping was added.
 * - A full card is remembered on the book that finished it (`bingoCards`), so
 *   changing an old book later can't undo it.
 *
 * Everything here is worked out from the books alone, so it needs no saving
 * of its own, except that one record per finished card.
 */

export const CARD_SIZE = 16
const SWAP_DAYS = 30
/**
 * Swapping started when it was added: before that, a card that began on
 * 1 January would have swapped every open square many times over, and the
 * card Hanna had been playing would have changed on the day this shipped.
 */
const SWAPS_FROM = '2026-11-14'

// ---- finishes -----------------------------------------------------------------------

export interface BingoFinish {
  book: Book
  day: string
  /** she had read this book before */
  reread: boolean
  /** sorts finishes in a fixed order, the same on every device */
  key: string
}

/** Every dated finish in a year, in order. */
export function yearFinishes(books: Book[], year: number): BingoFinish[] {
  const out: BingoFinish[] = []
  for (const b of books) {
    const days = [...(b.finished ?? [])].sort()
    const undated = timesRead(b) > days.length
    days.forEach((day, i) => {
      if (day.startsWith(`${year}-`)) out.push({ book: b, day, reread: i > 0 || undated, key: `${day}|${b.id}|${i}` })
    })
  }
  return out.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
}

// ---- the squares --------------------------------------------------------------------

/** What a square knows about the shelf. */
export interface Shelf {
  year: number
  /** the first day she finished anything by each author; undated reads count as long ago */
  firstByAuthor: Map<string, string>
  groups: ReturnType<typeof seriesGroups>
  /** books in each series on the shelf */
  seriesSize: Map<string, number>
  /** series she has read every book of */
  readSeries: Set<string>
  /** the year's finishes before this card started (Same author twice counts the whole year, T-0017) */
  before: BingoFinish[]
}

/** The book that ticks a square from the finishes so far, or true when no single book did. */
type Tick = (win: BingoFinish[], shelf: Shelf) => Book | true | undefined

const findIn = (test: (b: Book, f: BingoFinish, shelf: Shelf) => boolean): Tick => (win, shelf) =>
  win.find((f) => test(f.book, f, shelf))?.book

/**
 * A book's pages for the page squares: its own page count, or for a book she
 * only listens to the shelf's estimate, a minute counting as a page (#140).
 */
export const pagesOf = (b: Book) => thicknessPages(b) ?? 0
/** The genre squares' tests; the bingo suggestions use them too (T-0017). */
export const GENRE_SQUARES = {
  romance: /romance/i,
  mystery: /myster|thriller|crime/i,
  nonfiction: /non-?fiction|biograph|memoir|self-help/i,
  scifi: /science fiction|dystop/i,
} as const
export const hasGenre = (b: Book, re: RegExp) => !!b.genres?.some((g) => re.test(g))
export const notFantasy = (b: Book) => !!b.genres?.length && !b.genres.some((g) => /fantas/i.test(g))
export const hasFormat = (b: Book, format: string) => formatsOf(b).some((f) => f === format)
const genre = (re: RegExp) => findIn((b) => hasGenre(b, re))
const has = (format: string) => findIn((b) => hasFormat(b, format))
export const authorKey = (a: string) => a.trim().toLowerCase()
export const pubYear = (b: Book) => b.year ?? (b.published ? Number(b.published.slice(0, 4)) || undefined : undefined)
/** A listen over 15 hours. */
export const longListen = (b: Book) => hasAudio(b) && (b.minutes ?? 0) > 15 * 60
/** In a series of 5 or more books on the shelf, or numbered 5 or higher. */
export const inLongSeries = (b: Book, s: Pick<Shelf, 'groups' | 'seriesSize'>) => {
  const g = s.groups.get(b.id)
  return !!g?.key && ((s.seriesSize.get(g.key) ?? 0) >= 5 || (g.index ?? 0) >= 5)
}
const dayNumber = (day: string) =>
  Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10))) / 86_400_000

/** The finish that makes `n` books in one calendar month. */
const inOneMonth =
  (n: number): Tick =>
  (win) => {
    const counts = new Map<string, number>()
    for (const f of win) {
      const month = f.day.slice(0, 7)
      const c = (counts.get(month) ?? 0) + 1
      counts.set(month, c)
      if (c === n) return f.book
    }
    return undefined
  }

/**
 * The day a read began: the earliest of its start days and its reading-log
 * days since the book was last finished before. A book that went straight
 * from want-to-read to read (read in a day, so the nightly sync saw no
 * "reading") has no start day, but its reading log shows when she read it.
 */
export function readStart(b: Book, finishDay: string): string | undefined {
  const before = (b.finished ?? []).filter((d) => d < finishDay).sort().at(-1) ?? ''
  const days = [
    ...(b.started ?? []),
    ...Object.entries(b.readingLog ?? {})
      .filter(([, amount]) => amount > 0)
      .map(([day]) => day),
  ].filter((d) => d > before && d <= finishDay)
  return days.sort()[0]
}

const startedWithin = (days: number) =>
  findIn((b, f) => {
    const start = readStart(b, f.day)
    return start !== undefined && dayNumber(f.day) - dayNumber(start) <= days
  })

export const SQUARES: Record<string, { label: string; tick: Tick }> = {
  // the squares the card has always had
  long: { label: 'Over 500 pages', tick: findIn((b) => pagesOf(b) > 500) },
  dutch: { label: 'A book in Dutch', tick: findIn((b) => b.language === 'nl') },
  audio: { label: 'An audiobook', tick: findIn((b) => hasAudio(b)) },
  series: {
    label: 'Finish a series',
    tick: findIn((b, _, s) => {
      const key = s.groups.get(b.id)?.key
      return !!key && s.readSeries.has(key)
    }),
  },
  five: { label: 'A 5-star read', tick: findIn((b) => cleanRating(b.rating) === 5) },
  short: { label: 'Under 200 pages', tick: findIn((b) => pagesOf(b) > 0 && pagesOf(b) < 200) },
  reread: { label: 'A re-read', tick: findIn((_, f) => f.reread) },
  week: { label: 'Started and finished in a week', tick: startedWithin(6) },
  author: {
    label: 'A new author',
    tick: findIn((b, f, s) => !f.reread && b.authors.some((a) => s.firstByAuthor.get(authorKey(a)) === f.day)),
  },
  three: { label: '3 books in one month', tick: inOneMonth(3) },
  genre: { label: 'Not fantasy', tick: findIn(notFantasy) },
  spicy: { label: 'A spicy read (4+ 🌶️)', tick: findIn((b) => (cleanSpice(b.spice) ?? 0) >= 4) },
  // new for #119
  huge: { label: 'Over 700 pages', tick: findIn((b) => pagesOf(b) > 700) },
  library: { label: 'From the library', tick: has('library') },
  borrowed: { label: 'A borrowed book', tick: has('borrowed') },
  hardcover: { label: 'A hardcover', tick: has('hardcover') },
  classic: { label: 'A classic (before 1950)', tick: findIn((b) => (pubYear(b) ?? 9999) < 1950) },
  brandnew: { label: 'Brand new (out this year)', tick: findIn((b, _, s) => pubYear(b) === s.year) },
  firstinseries: {
    label: 'Start a new series',
    tick: findIn((b, f, s) => !f.reread && !!s.groups.get(b.id)?.key && s.groups.get(b.id)?.index === 1),
  },
  longseries: {
    label: 'From a series of 5+',
    tick: findIn((b, _, s) => inLongSeries(b, s)),
  },
  longlisten: { label: 'A listen over 15 hours', tick: findIn(longListen) },
  fast: { label: 'Gone in 2 days', tick: startedWithin(1) },
  fivemonth: { label: '5 books in one month', tick: inOneMonth(5) },
  romance: { label: 'A romance', tick: genre(GENRE_SQUARES.romance) },
  mystery: { label: 'A mystery or thriller', tick: genre(GENRE_SQUARES.mystery) },
  nonfiction: { label: 'Not fiction', tick: genre(GENRE_SQUARES.nonfiction) },
  scifi: { label: 'Science fiction or dystopian', tick: genre(GENRE_SQUARES.scifi) },
  sameauthor: {
    label: 'Same author twice',
    // a finish on this card by an author she finished another book by earlier this year,
    // on this card or an older one (Hanna's decision, T-0017)
    tick: (win, shelf) => {
      const seen = new Map<string, Set<string>>()
      const add = (a: string, id: string) => seen.set(authorKey(a), (seen.get(authorKey(a)) ?? new Set<string>()).add(id))
      for (const f of shelf.before) for (const a of f.book.authors) add(a, f.book.id)
      for (const f of win)
        for (const a of f.book.authors) {
          const prev = seen.get(authorKey(a))
          if (prev && [...prev].some((id) => id !== f.book.id)) return f.book
          add(a, f.book.id)
        }
      return undefined
    },
  },
}

export const SQUARE_IDS = Object.keys(SQUARES)

/** The first card's squares in their old places; the four that were ticked by hand get new squares. */
const FIRST_CARD: Array<string | null> = [
  'long', 'dutch', 'audio', null,
  'series', 'five', 'short', null,
  'reread', 'week', 'author', null,
  'three', 'genre', 'spicy', null,
]
const NEW_SQUARES = SQUARE_IDS.filter((id) => !FIRST_CARD.includes(id))

export function shelfFacts(books: Book[], year: number): Shelf {
  const firstByAuthor = new Map<string, string>()
  for (const f of allFinishes(books))
    for (const a of f.book.authors) {
      const day = f.day ?? ''
      const prev = firstByAuthor.get(authorKey(a))
      if (prev === undefined || day < prev) firstByAuthor.set(authorKey(a), day)
    }
  const groups = seriesGroups(books)
  const seriesSize = new Map<string, number>()
  for (const g of groups.values()) if (g.key) seriesSize.set(g.key, (seriesSize.get(g.key) ?? 0) + 1)
  const readSeries = new Set<string>()
  for (const s of seriesProgress(books))
    if (s.total >= 2 && s.read === s.total) {
      const key = groups.get(s.books[0].id)?.key
      if (key) readSeries.add(key)
    }
  return { year, firstByAuthor, groups, seriesSize, readSeries, before: [] }
}

// ---- random but fixed ---------------------------------------------------------------

/** A small seeded random generator (mulberry32): the same seed always gives the same numbers. */
function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffled<T>(list: T[], seed: number): T[] {
  const out = [...list]
  const random = seeded(seed)
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** The squares a card starts with, and the ones waiting to be swapped in. */
export function cardSquares(year: number, card: number): { squares: string[]; spare: string[] } {
  if (card === 1) {
    const fresh = shuffled(NEW_SQUARES, year * 1000 + 1)
    let next = 0
    const squares = FIRST_CARD.map((id) => id ?? fresh[next++])
    return { squares, spare: fresh.slice(next) }
  }
  const all = shuffled(SQUARE_IDS, year * 1000 + card)
  return { squares: all.slice(0, CARD_SIZE), spare: all.slice(CARD_SIZE) }
}

// ---- playing a card -----------------------------------------------------------------

export interface BingoSquare {
  id: string
  label: string
  ticked: boolean
  /** the book that ticked it, when one did */
  book?: Book
}

const addDays = (day: string, n: number) => new Date((dayNumber(day) + n) * 86_400_000).toISOString().slice(0, 10)

/**
 * Plays one card through the finishes after it started, swapping squares that
 * stay open a month at a time, until the card is full or `until` is reached.
 */
function playCard(
  shelf: Shelf,
  finishes: BingoFinish[],
  start: { squares: string[]; spare: string[] },
  startDay: string,
  until: string,
): { squares: BingoSquare[]; fullAt?: BingoFinish } {
  const spare = [...start.spare]
  const win: BingoFinish[] = []
  const squares = start.squares.map((id) => ({ id, hit: undefined as Book | true | undefined }))
  const evaluate = (sq: (typeof squares)[number]) => {
    if (!sq.hit) sq.hit = SQUARES[sq.id]?.tick(win, shelf)
  }
  let swapDay = addDays(startDay > SWAPS_FROM ? startDay : SWAPS_FROM, SWAP_DAYS)
  const swapUntil = (day: string) => {
    while (swapDay <= day) {
      for (const sq of squares) {
        if (sq.hit || !spare.length) continue
        spare.push(sq.id)
        sq.id = spare.shift()!
        evaluate(sq)
      }
      swapDay = addDays(swapDay, SWAP_DAYS)
    }
  }
  const view = () =>
    squares.map(({ id, hit }) => ({
      id,
      label: SQUARES[id]?.label ?? id,
      ticked: !!hit,
      ...(hit && hit !== true && { book: hit }),
    }))

  for (const f of finishes) {
    if (f.day > until) break
    swapUntil(f.day)
    win.push(f)
    squares.forEach(evaluate)
    if (squares.every((s) => s.hit)) return { squares: view(), fullAt: f }
  }
  swapUntil(until)
  return { squares: view() }
}

// ---- a year of cards ----------------------------------------------------------------

export interface BingoYear {
  year: number
  /** cards filled this year, first first */
  finished: FinishedBingoCard[]
  /** the card being played now */
  card: number
  squares: BingoSquare[]
  /** cards just found full, to remember on the book that finished each (bookId) */
  toRemember: Array<{ bookId: string; card: FinishedBingoCard }>
}

/** A remembered card made safe: anything that doesn't look right is ignored. */
export function cleanFinishedCard(raw: unknown): FinishedBingoCard | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const c = raw as Record<string, unknown>
  if (!Number.isInteger(c.year) || !Number.isInteger(c.card) || (c.card as number) < 1) return undefined
  if (typeof c.endsAt !== 'string' || !/^\d{4}-\d{2}-\d{2}\|/.test(c.endsAt)) return undefined
  const squares = Array.isArray(c.squares) ? c.squares.filter((s): s is string => typeof s === 'string') : []
  const ticks =
    c.ticks && typeof c.ticks === 'object'
      ? Object.fromEntries(Object.entries(c.ticks).filter(([, v]) => typeof v === 'string'))
      : {}
  return { year: c.year as number, card: c.card as number, endsAt: c.endsAt, squares, ticks }
}

/** The cards remembered on the books for a year, one per card number. */
function rememberedCards(books: Book[], year: number): FinishedBingoCard[] {
  const byCard = new Map<number, FinishedBingoCard>()
  for (const b of books)
    for (const raw of b.bingoCards ?? []) {
      const c = cleanFinishedCard(raw)
      if (c && c.year === year && !byCard.has(c.card)) byCard.set(c.card, c)
    }
  return [...byCard.values()].sort((a, b) => a.card - b.card)
}

/** Every card of a year: the ones filled, and the one being played. */
export function bingoYear(books: Book[], year: number, today = localDay()): BingoYear {
  const shelf = shelfFacts(books, year)
  const finishes = yearFinishes(books, year)
  const until = today < `${year}-12-31` ? today : `${year}-12-31`
  const finished = rememberedCards(books, year)
  const toRemember: BingoYear['toRemember'] = []
  const last = finished.at(-1)
  let card = last ? last.card + 1 : 1
  let after = last?.endsAt ?? ''
  let startDay = last ? last.endsAt.slice(0, 10) : `${year}-01-01`

  for (;;) {
    const played = playCard(
      { ...shelf, before: finishes.filter((f) => f.key <= after) },
      finishes.filter((f) => f.key > after),
      cardSquares(year, card),
      startDay,
      until,
    )
    if (!played.fullAt) return { year, finished, card, squares: played.squares, toRemember }
    const done: FinishedBingoCard = {
      year,
      card,
      endsAt: played.fullAt.key,
      squares: played.squares.map((s) => s.id),
      ticks: Object.fromEntries(played.squares.map((s) => [s.id, s.book?.id ?? ''])),
    }
    finished.push(done)
    toRemember.push({ bookId: played.fullAt.book.id, card: done })
    after = done.endsAt
    startDay = played.fullAt.day
    card++
  }
}

/** The change that remembers a full card on the book that finished it. */
export function rememberCard(book: Book, card: FinishedBingoCard): Partial<Book> {
  const others = (book.bingoCards ?? []).filter((c) => !(c.year === card.year && c.card === card.card))
  return { bingoCards: [...others, card] }
}

/** Rows, columns and the two diagonals that are fully ticked. */
export function bingoLines(ticked: boolean[], size = 4): number {
  const at = (r: number, c: number) => ticked[r * size + c]
  let lines = 0
  for (let i = 0; i < size; i++) {
    if (Array.from({ length: size }, (_, j) => at(i, j)).every(Boolean)) lines++
    if (Array.from({ length: size }, (_, j) => at(j, i)).every(Boolean)) lines++
  }
  if (Array.from({ length: size }, (_, j) => at(j, j)).every(Boolean)) lines++
  if (Array.from({ length: size }, (_, j) => at(j, size - 1 - j)).every(Boolean)) lines++
  return lines
}
