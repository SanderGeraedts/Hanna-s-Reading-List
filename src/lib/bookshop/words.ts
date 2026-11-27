import { UPGRADES } from './numbers'
import type { Upgrade } from './numbers'
import type { Away, Bookshop, Line } from './shop'
import { mixedHash } from '../creatures/hash'

/**
 * The bookshop in her words (T-0113). Every sentence the block and the shop
 * say is made here, so they say the same thing and a test can read what she
 * will read. Plain English, no jargon, and never a number without a noun.
 */

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export const copiesWord = (n: number) => plural(n, 'copy', 'copies')
export const coinsWord = (n: number) => plural(n, 'coin')
export const titlesWord = (n: number) => plural(n, 'title')
export const daysWord = (n: number) => plural(n, 'day')

/** "3 × Babel" — one line of the shelf or of a day's sales. */
export const lineText = (line: Line) => `${line.copies} × ${line.book.title}`

/** "Babel, Piranesi and 3 more", for the one-line summary of a sale. */
export function titleList(lines: readonly Line[], most = 2): string {
  const names = lines.slice(0, most).map((l) => l.book.title)
  const rest = lines.length - names.length
  if (rest > 0) names.push(`${rest} more`)
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * What sold while she was away, in one sentence — "3 copies of Babel sold
 * while you were away", and the honest version when nobody came in.
 */
export function awaySentence(away: Away): string {
  if (away.copies === 0) return 'Nobody came in while you were away.'
  if (away.titles.length === 1) {
    const only = away.titles[0]
    return `${copiesWord(only.copies)} of ${only.book.title} sold while you were away.`
  }
  return `${copiesWord(away.copies)} sold while you were away: ${titleList(away.titles)}.`
}

/** "and 84 coins in the till for it" — what the trade brought in. */
export const awayCoins = (away: Away) => (away.coins > 0 ? `That is ${coinsWord(away.coins)}.` : '')

/** "over the last 6 days" / "today", for the heading of what she missed. */
export function awayWhen(away: Away): string {
  if (away.days <= 1) return 'today'
  return `over the last ${daysWord(away.days)}`
}

/** "118 copies on the shelves, of 37 titles" — or the bare-shop version. */
export function stockSentence(shop: Bookshop): string {
  if (shop.stock === 0) return shop.titles === 0 ? 'The shelves are empty — finish a book and it goes on sale.' : 'The shelves are bare. Read a little and they fill again.'
  return `${copiesWord(shop.stock)} on the shelves, of ${titlesWord(shop.shelf.length)}.`
}

/** "6 customers a day, 2 coins a copy." */
export const tradeSentence = (shop: Bookshop) =>
  `${plural(shop.trading.customers, 'customer')} a day, ${coinsWord(shop.trading.price)} a copy.`

/**
 * "Enough on the shelves for about 9 more days" — at today's rate, and only
 * ever "about": her reading restocks it, so it is a hint and not a deadline.
 */
export function lastsSentence(shop: Bookshop): string {
  if (shop.stock === 0) return 'Nothing left to sell.'
  const days = Math.floor(shop.stock / Math.max(1, shop.trading.customers))
  if (days < 1) return 'Enough on the shelves for the rest of today.'
  if (days >= 60) return 'Enough on the shelves for months.'
  return `Enough on the shelves for about ${daysWord(days)}.`
}

/** The cheapest thing she has not bought yet, or null when she has them all. */
export function nextUpgrade(shop: Bookshop): Upgrade | null {
  return UPGRADES.find((u) => !shop.owned.has(u.id)) ?? null
}

/** "A sign over the door costs 40 coins — 18 to go." */
export function savingSentence(shop: Bookshop): string {
  const next = nextUpgrade(shop)
  if (!next) return 'Everything is bought. The shop is as good as it gets.'
  const short = next.price - shop.coins
  if (short <= 0) return `You can afford ${next.name.toLowerCase()}.`
  return `${next.name} costs ${coinsWord(next.price)} — ${short} to go.`
}

/** What a thing she bought does, for its line in the shop: "+2 customers a day". */
export function upgradeEffect(u: Upgrade): string {
  const bits: string[] = []
  if (u.customers) bits.push(`+${plural(u.customers, 'customer')} a day`)
  if (u.coins) bits.push(`+${coinsWord(u.coins)} a copy`)
  return bits.join(', ')
}

/** The whole shop in one sentence, for a screen reader. */
export function shopSentence(shop: Bookshop): string {
  if (!shop.open) return 'The bookshop has not opened yet.'
  return `${coinsWord(shop.coins)} in the till. ${stockSentence(shop)} ${tradeSentence(shop)}`
}

// ---- customer notes (T-0123, D-0091) ------------------------------------------------------

/**
 * Little cards from made-up customers about books that sold this week. Always kind, also about
 * a book she rated low ("not for everyone, but…"): the shop is a cosy place. Worked out from the
 * day and the book, so every device shows the same three notes all day, and nothing is stored.
 */
export interface CustomerNote {
  id: string
  title: string
  text: string
  by: string
}

const NAMES = ['Mira', 'Joost', 'Ada', 'Ilse', 'Tomas', 'Noor', 'Femke', 'Rafael', 'Lotte', 'Sami', 'Greta', 'Bram', 'Yara', 'Owen', 'Liv', 'Kees']

const GENERAL = [
  (t: string) => `Picked up ${t} on a whim. No regrets.`,
  (t: string) => `Came in for something else, left with ${t}.`,
  (t: string) => `${t} kept me up far too late.`,
  (t: string) => `Bought ${t} for my sister. Reading it first.`,
  (t: string) => `Started ${t} on the tram home and missed my stop.`,
]
const LOVED = [(t: string) => `The staff were right about ${t}.`, (t: string) => `${t}. That's it, that's the note. Read it.`]
const SOFT = [(t: string) => `${t} is not for everyone, but I couldn't put it down.`, (t: string) => `Everyone argues about ${t}. I loved it.`]
const BY_GENRE: Array<[RegExp, Array<(t: string) => string>]> = [
  [/fantasy|magic|dragon/i, [(t) => `${t}: I want to live in that world.`, (t) => `Finished ${t} and checked the wardrobe for a door.`]],
  [/romance|love/i, [(t) => `${t} made me cry on the bus. Happy tears.`, (t) => `Swooned at ${t}. Twice.`]],
  [/mystery|thriller|crime|detective/i, [(t) => `Guessed wrong all the way through ${t}.`, (t) => `${t}: read it in one sitting, lights on.`]],
  [/science fiction|sci-fi|space/i, [(t) => `${t} made the night sky feel bigger.`, (t) => `Can't stop thinking about the ending of ${t}.`]],
  [/histor/i, [(t) => `${t} smelled of old letters and rain.`, (t) => `Learned more from ${t} than from school.`]],
]

function linesFor(book: { title: string; genres?: string[]; rating?: number }) {
  const genre = (book.genres ?? []).join(' ')
  const own = BY_GENRE.find(([re]) => re.test(genre))?.[1] ?? []
  const r = book.rating
  // a low rating gets the kind "different taste" lines: customers may love what she didn't
  const mood = typeof r === 'number' ? (r >= 4.5 ? LOVED : r <= 2.5 ? SOFT : []) : []
  return [...own, ...mood, ...GENERAL]
}

/** A note about one book on one day: the same on every device, for ever. */
function noteFor(line: Line, day: string, i: number): CustomerNote & { day: string } {
  const h = mixedHash(`shop-note:${day}:${line.id}`)
  const lines = linesFor(line.book)
  return { id: `${day}:${line.id}`, day, title: line.book.title, text: lines[h % lines.length](line.book.title), by: NAMES[((h >>> 8) + i) % NAMES.length] }
}

/**
 * The magnetic board (T-0123): every note the shop's customers ever left, newest first. Each
 * day something sold leaves a note about each of its (up to three) best sellers, and they stay.
 * Nothing is saved: the board is written again from the shop's own history every time.
 */
export function noteBoard(shop: Bookshop, perDay = 3): Array<CustomerNote & { day: string }> {
  const out: Array<CustomerNote & { day: string }> = []
  for (let d = shop.sales.length - 1; d >= 0; d--) {
    const { day, titles } = shop.sales[d]
    titles.slice(0, perDay).forEach((line, i) => out.push(noteFor(line, day, i)))
  }
  return out
}

/** The newest notes on the board, for the block and the top of the board. */
export const customerNotes = (shop: Bookshop, count = 3) => noteBoard(shop).slice(0, count)

/** "Babel — 14 sold this week", for the book of the week. */
export const weekBestSentence = (shop: Bookshop) =>
  shop.weekBest ? `${shop.weekBest.book.title}, ${copiesWord(shop.weekBest.copies)} this week` : 'No book of the week yet.'
