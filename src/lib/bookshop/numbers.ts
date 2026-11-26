/**
 * Every number of the bookshop in one place (T-0113, D-0084 §6). Change a
 * number here and the whole shop changes with it — nothing is stored, so there
 * is never an old balance left behind to fix up. The *rules* around these
 * numbers (that reading is the only thing that stocks the shelves, that the
 * stock is the limiter and not a timer, that nothing is ever lost by not
 * opening it) are D-0084's and need a decision to change.
 *
 * How the first numbers were chosen, so they can be judged after she has lived
 * with the shop for a week:
 *
 * - A normal week for Hanna is roughly 300 minutes of reading and one or two
 *   books finished. At 6 minutes a copy that prints 50 copies, and the finishes
 *   add 20 copies each: about 80 copies a week, say 11 a day.
 * - A shop with nothing bought yet serves 6 customers a day, so a normal week
 *   of reading keeps it comfortably full and it trades right through a holiday.
 * - A shop with all eight things bought serves 18 a day at 6 coins a copy, so
 *   it eats a busy week's stock in four or five days and then trickles. That is
 *   on purpose: the shelves are the limiter, never a clock (D-0084 §2).
 * - All eight things together cost 3600 coins. At the opening rate (6 × 2 = 12
 *   coins a day) the first one is a few days away, and the last one is months
 *   of reading away — an idle game should still have something left to want.
 */

/** The day the shop opened its door. Nothing before it was ever sold, and no coin was earned. */
export const SHOP_START = '2026-11-26'

// ---- what reading puts on the shelves (D-0084 §1) -------------------------------------------

/** Minutes of reading that print one copy of the book she is reading. */
export const MINUTES_PER_COPY = 6

/** Extra copies printed the day she finishes a book (a re-read prints them again). */
export const FINISH_COPIES = 20

/**
 * Copies of each book she had already read when the shop opened. One each: her
 * back catalogue is the shop's opening stock, so the door opens on a full shop
 * instead of an empty one, without years of trade appearing out of nowhere.
 */
export const OPENING_COPIES = 1

// ---- what the shop does with them (D-0084 §2) -----------------------------------------------

/** Customers through the door on a day, with nothing bought yet. */
export const BASE_CUSTOMERS = 6

/** Coins a customer leaves for one copy, with nothing bought yet. */
export const BASE_PRICE = 2

/**
 * A customer who finds the shelves bare leaves again; the sale is not saved up
 * for tomorrow. This is what makes a bare shop trickle rather than owe her a
 * backlog, and it is why nothing has to be collected (D-0084 §2, §3).
 */
export const UNSERVED_CUSTOMERS_LEAVE = true

/** Days of trade the block and the shop remember day by day, for "while you were away". */
export const RECENT_DAYS = 30

/**
 * The most days the shop will ever trade through in one go. A device whose
 * clock has run away to 2099 gets ten years of trade and no more, instead of
 * freezing the dashboard while it counts out seventy.
 */
export const MAX_TRADING_DAYS = 3650

// ---- the things coins buy (D-0084 §4) -------------------------------------------------------

export type UpgradeId = 'sign' | 'till' | 'shelf' | 'chair' | 'window' | 'cat' | 'lamp' | 'tea'

export interface Upgrade {
  readonly id: UpgradeId
  readonly name: string
  /** what it costs in coins, today; what she paid is kept with her purchase */
  readonly price: number
  /** extra customers a day */
  readonly customers: number
  /** extra coins a copy */
  readonly coins: number
  /** one line, in her words, for the shop's list */
  readonly says: string
}

/**
 * The eight things coins buy, cheapest first. Every one of them changes both
 * the numbers and the picture (D-0084 §4): there is nothing to buy here that
 * she cannot see standing in her shop afterwards.
 */
export const UPGRADES: readonly Upgrade[] = [
  { id: 'sign', name: 'A sign over the door', price: 40, customers: 2, coins: 0, says: 'People walking past can finally tell it is a bookshop.' },
  { id: 'till', name: 'A proper till', price: 90, customers: 0, coins: 1, says: 'No more counting coins into a biscuit tin.' },
  { id: 'shelf', name: 'A second shelf', price: 160, customers: 2, coins: 0, says: 'Twice as much to browse, so more people come in.' },
  { id: 'chair', name: 'A reading chair', price: 260, customers: 2, coins: 0, says: 'People sit down, read a chapter, and then buy the book.' },
  { id: 'window', name: 'A window display', price: 400, customers: 0, coins: 1, says: 'The good ones face the street, and nobody haggles.' },
  { id: 'cat', name: 'A shop cat', price: 600, customers: 3, coins: 0, says: 'Half the town comes in for the cat. They leave with a book.' },
  { id: 'lamp', name: 'A warm lamp', price: 850, customers: 0, coins: 1, says: 'The shop glows, and people linger instead of leaving.' },
  { id: 'tea', name: 'A tea counter', price: 1200, customers: 3, coins: 1, says: 'Tea, a book, an afternoon gone. Her favourite kind of customer.' },
]

const BY_ID = new Map(UPGRADES.map((u) => [u.id, u]))

export const upgrade = (id: string): Upgrade | undefined => BY_ID.get(id as UpgradeId)
export const isUpgradeId = (id: unknown): id is UpgradeId => typeof id === 'string' && BY_ID.has(id as UpgradeId)

/** What all eight together would cost, for the "everything bought" line. */
export const ALL_UPGRADES_COST = UPGRADES.reduce((n, u) => n + u.price, 0)
