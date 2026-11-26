import type { Book } from '../library'
import { localDay } from '../library'
import type { ChoiceEvent } from '../creatures/choices'
import { addDays, daysBetween } from '../creatures/days'
import { MAX_TRADING_DAYS, RECENT_DAYS, SHOP_START } from './numbers'
import type { UpgradeId } from './numbers'
import { stocking } from './stock'
import type { Title } from './stock'
import { boughtUpgrades, tradingWith } from './upgrades'
import type { Bought, Trading } from './upgrades'

/**
 * The bookshop that trades while she is away (T-0113, D-0084).
 *
 * The whole shop is one pure function of her books, her choice log and the
 * clock. Nothing about it is stored anywhere: not the coins, not the stock,
 * not a "last seen" time on the server. Open the app twice at the same moment
 * and the same shop comes back both times — that is the point of working it
 * out instead of ticking it along (D-0084 §3).
 *
 * How a day in the shop goes, from the day it opened to today:
 *
 * 1. The copies her reading printed that day arrive on the shelves.
 * 2. As many customers come through the door as the shop can draw, and each
 *    one buys a copy and leaves coins for it.
 * 3. A customer who finds the shelves bare leaves without buying. Nothing is
 *    saved up, nothing is owed, nothing has to be collected: a full shop trades
 *    for days and a bare one trickles, and the shelves are the limiter, never a
 *    clock (D-0084 §2).
 *
 * Away a week? Seven of those days run when she next opens the app, as far as
 * the stock lasted. There is no offline cap, no collect button, no streak and
 * no reward for logging in.
 *
 * **The clock never goes backwards.** A device whose clock jumps back would
 * otherwise undo days of trade. `floorDay` is the furthest day this device has
 * already seen the shop reach; the shop trades through at least that day, so
 * stock and coins can only ever stand still, never fall. The caller keeps that
 * day (it is a note about this device, not about her shop), which leaves the
 * shop itself a pure function of what it is handed.
 */

/** Copies of one title, on the shelf or sold. */
export interface Line {
  id: string
  book: Book
  copies: number
}

/** One day of trade. */
export interface DayTrade {
  day: string
  /** copies sold that day */
  copies: number
  coins: number
  /** which titles they were, most sold first */
  titles: Line[]
}

export interface Bookshop {
  /** the day the shop opened */
  start: string
  /** false before opening day: nothing has happened yet */
  open: boolean
  /** the day the shop has traded through */
  today: string
  /** how much of that last day has been traded, 0..1 */
  todayShare: number
  /** how many books she has read that the shop sells */
  titles: number
  /** titles with copies left, most copies first */
  shelf: Line[]
  /** copies on the shelves in all */
  stock: number
  /** coins taken since opening day */
  earned: number
  /** coins spent on the shop itself */
  spent: number
  /** coins in the till now (earned minus spent) */
  coins: number
  /** copies sold since opening day */
  sold: number
  /** what she has bought for the shop, oldest first */
  bought: Bought[]
  owned: Set<UpgradeId>
  /** what the shop draws and charges today */
  trading: Trading
  /** the last 30 days, oldest first; a day with no sale at all is left out */
  recent: DayTrade[]
  /** the oldest day `recent` could reach back to, sale or no sale */
  recentFrom: string
}

export interface DeriveOptions {
  /** the day the shop opened; only tests move it */
  start?: string
  /** the furthest day this device has already seen: the shop never trades backwards */
  floorDay?: string
}

/** How much of the local day has gone at this moment, 0..1. */
function dayShare(at: Date): number {
  const seconds = at.getHours() * 3600 + at.getMinutes() * 60 + at.getSeconds()
  return Math.min(1, Math.max(0, seconds / 86_400))
}

const empty = (start: string, today: string, bought: Bought[], spent: number): Bookshop => ({
  start,
  open: false,
  today,
  todayShare: 0,
  titles: 0,
  shelf: [],
  stock: 0,
  earned: 0,
  spent,
  coins: 0 - spent,
  sold: 0,
  bought,
  owned: new Set(bought.map((b) => b.id)),
  trading: tradingWith(bought.map((b) => b.id)),
  recent: [],
  recentFrom: today,
})

/**
 * `sold` copies shared out over the titles that have copies, by how many each
 * has: everyone takes their share rounded down, and the copies left over go to
 * whoever was closest to one more. Deterministic to the last copy, so two
 * devices showing the same shop show the same sale.
 */
function shareOut(sold: number, entries: Array<{ id: string; copies: number }>, total: number): Map<string, number> {
  const out = new Map<string, number>()
  if (sold <= 0) return out
  const parts = entries.map((e) => {
    const exact = (sold * e.copies) / total
    const whole = Math.min(e.copies, Math.floor(exact))
    return { id: e.id, copies: e.copies, whole, rest: exact - whole }
  })
  let left = sold - parts.reduce((n, p) => n + p.whole, 0)
  // the entries already come in a settled order, so ties fall the same way everywhere
  const queue = [...parts].sort((a, b) => b.rest - a.rest)
  for (const p of queue) {
    if (left <= 0) break
    if (p.whole >= p.copies) continue
    p.whole++
    left--
  }
  // a rounding corner (every title already full): hand the rest out one at a time
  for (let round = 0; left > 0 && round < parts.length; round++) {
    for (const p of parts) {
      if (left <= 0) break
      if (p.whole >= p.copies) continue
      p.whole++
      left--
    }
  }
  for (const p of parts) if (p.whole > 0) out.set(p.id, p.whole)
  return out
}

/** The shop as it stands at `now`. */
export function deriveBookshop(
  books: readonly Book[],
  log: readonly ChoiceEvent[],
  now: number,
  opts: DeriveOptions = {},
): Bookshop {
  const start = opts.start ?? SHOP_START
  const bought = boughtUpgrades(log)
  const spent = bought.reduce((n, b) => n + b.price, 0)

  const at = new Date(now)
  const clockDay = localDay(at)
  // the clock never goes backwards: a device that has already seen a later day keeps it
  let today = opts.floorDay && opts.floorDay > clockDay ? opts.floorDay : clockDay
  let todayShare = today === clockDay ? dayShare(at) : 1
  if (today < start) return empty(start, today, bought, spent)
  if (daysBetween(start, today) > MAX_TRADING_DAYS) {
    today = addDays(start, MAX_TRADING_DAYS)
    todayShare = 1
  }

  const plan = stocking(books, start)
  const byDay = new Map<string, Array<{ id: string; copies: number }>>()
  for (const p of plan.prints) {
    if (p.day > today) continue
    const list = byDay.get(p.day)
    if (list) list.push(p)
    else byDay.set(p.day, [p])
  }
  const titleOf = new Map<string, Title>(plan.titles.map((t) => [t.id, t]))

  // when each thing she bought starts drawing customers: the day she bought it
  const starts = bought
    .map((b) => ({ id: b.id, day: localDay(new Date(b.at)) }))
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : a.id < b.id ? -1 : 1))

  const stock = new Map<string, number>()
  let total = 0
  let earned = 0
  let sold = 0
  /** the part of a customer who has not come through the door yet, always below 1 */
  let carry = 0
  let next = 0
  const live: UpgradeId[] = []
  let trading = tradingWith(live)
  const recent: DayTrade[] = []
  const window = addDays(today, -(RECENT_DAYS - 1))
  const firstRecent = window < start ? start : window

  for (let day = start; day <= today; day = addDays(day, 1)) {
    for (const p of byDay.get(day) ?? []) {
      stock.set(p.id, (stock.get(p.id) ?? 0) + p.copies)
      total += p.copies
    }
    while (next < starts.length && starts[next].day <= day) {
      live.push(starts[next].id)
      next++
      trading = tradingWith(live)
    }

    carry += trading.customers * (day === today ? todayShare : 1)
    const want = Math.floor(carry + 1e-9)
    carry -= want
    const took = Math.min(want, total)
    if (took > 0) {
      const entries = [...stock]
        .filter(([, copies]) => copies > 0)
        .map(([id, copies]) => ({ id, copies }))
        // most copies first, then the title that opened first: a settled order
        .sort((a, b) => b.copies - a.copies || cmpTitle(titleOf, a.id, b.id))
      const part = shareOut(took, entries, total)
      for (const [id, n] of part) stock.set(id, (stock.get(id) ?? 0) - n)
      total -= took
      sold += took
      earned += took * trading.price
      if (day >= firstRecent) {
        const titles = [...part]
          .map(([id, copies]) => ({ id, book: titleOf.get(id)!.book, copies }))
          .sort((a, b) => b.copies - a.copies || cmpTitle(titleOf, a.id, b.id))
        recent.push({ day, copies: took, coins: took * trading.price, titles })
      }
    }
  }

  const shelf = [...stock]
    .filter(([, copies]) => copies > 0)
    .map(([id, copies]) => ({ id, book: titleOf.get(id)!.book, copies }))
    .sort((a, b) => b.copies - a.copies || cmpTitle(titleOf, a.id, b.id))

  return {
    start,
    open: true,
    today,
    todayShare,
    titles: plan.titles.filter((t) => t.openDay <= today).length,
    shelf,
    stock: total,
    earned,
    spent,
    coins: earned - spent,
    sold,
    bought,
    owned: new Set(bought.map((b) => b.id)),
    trading,
    recent,
    recentFrom: firstRecent,
  }
}

/** The settled order of two titles: the one that opened first, then by id. */
function cmpTitle(titles: Map<string, Title>, a: string, b: string): number {
  const ta = titles.get(a)
  const tb = titles.get(b)
  const da = ta?.openDay ?? ''
  const db = tb?.openDay ?? ''
  return da < db ? -1 : da > db ? 1 : a < b ? -1 : a > b ? 1 : 0
}

/** What sold on and after `since`: the trade she missed while she was away. */
export interface Away {
  /** the first day counted (never further back than the 30 days the shop remembers) */
  from: string
  /** calendar days counted, `from` and today included */
  days: number
  copies: number
  coins: number
  /** which titles, most sold first */
  titles: Line[]
  /** she was away longer than the shop remembers day by day */
  capped: boolean
}

/**
 * The trade since the day `since`, out of the thirty days the shop keeps day by
 * day. Away for longer than that and the lines only go back thirty days — the
 * coins themselves are never lost, they are simply in the till already.
 */
export function tradeSince(shop: Bookshop, since: string): Away {
  const oldest = shop.recentFrom
  const from = since < oldest ? oldest : since > shop.today ? shop.today : since
  const traded = shop.recent.filter((d) => d.day >= from)
  const copies = new Map<string, Line>()
  for (const d of traded)
    for (const t of d.titles) {
      const had = copies.get(t.id)
      if (had) had.copies += t.copies
      else copies.set(t.id, { ...t })
    }
  return {
    from,
    days: Math.max(1, daysBetween(from, shop.today) + 1),
    copies: traded.reduce((n, d) => n + d.copies, 0),
    coins: traded.reduce((n, d) => n + d.coins, 0),
    titles: [...copies.values()].sort((a, b) => b.copies - a.copies || (a.id < b.id ? -1 : 1)),
    capped: since < oldest,
  }
}
