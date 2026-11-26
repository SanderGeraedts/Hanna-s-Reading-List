import { UPGRADES } from './numbers'
import type { Upgrade } from './numbers'
import type { Away, Bookshop, Line } from './shop'

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
