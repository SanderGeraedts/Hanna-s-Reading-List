import type { ChoiceEvent } from '../creatures/choices'
import { BASE_CUSTOMERS, BASE_PRICE, isUpgradeId, upgrade } from './numbers'
import type { Upgrade, UpgradeId } from './numbers'

/**
 * What she has bought for the shop (T-0113, D-0084 §5).
 *
 * Nothing new is saved on the server. A thing she buys rides in the creatures
 * choice log (D-0034) as a `place` event with the key `s:up:<thing>`, through
 * the route that is already live — the same trick the bingo swap uses with its
 * `b:` keys (D-0067) and the garden with its `g:` keys (D-0052). So: no change
 * in `deploy/nas/`, no new field on `Book`, and nothing waiting for Sander.
 *
 * `place` is a *setting* kind: `mergeLogs` keeps only the newest event per key,
 * so the log can never grow past one event per thing in the shop — eight keys,
 * for ever. That is why buying is a `place` and not a `buy`: a `buy` is counted
 * every time it appears and, worse, the creature shop reads every `buy` in the
 * log as cookies spent. Coins and cookies stay apart (D-0084 §5), so the
 * bookshop never writes a `buy` at all.
 *
 * The price she paid rides along in the event, so changing a price in
 * `numbers.ts` later never changes what the shop already cost her.
 */

/** Keys the bookshop reads and writes. The den's are `home:`, bingo's `b:`, the garden's `g:`. */
export const SHOP_KEY_PREFIX = 's:'
export const UPGRADE_KEY_PREFIX = 's:up:'

export const upgradeKey = (id: UpgradeId) => `${UPGRADE_KEY_PREFIX}${id}`

/** The `place` event for buying one thing (the caller adds the id and the time). */
export const buyUpgradeEvent = (id: UpgradeId, price: number) =>
  ({ kind: 'place', key: upgradeKey(id), item: id, price: Math.max(0, Math.round(price)) }) as const

/** One thing she owns: when she bought it, and what she paid for it then. */
export interface Bought {
  id: UpgradeId
  spec: Upgrade
  at: number
  price: number
}

const newer = (a: ChoiceEvent, b: ChoiceEvent) => a.at > b.at || (a.at === b.at && a.id > b.id)

/**
 * Everything she has bought for the shop, oldest first. The newest `place`
 * event per `s:up:` key wins, exactly as the server and every device read it
 * (D-0034 §1). Keys that aren't the shop's, things that are no longer sold and
 * prices that aren't a sensible number are ignored.
 */
export function boughtUpgrades(log: readonly ChoiceEvent[]): Bought[] {
  const best = new Map<UpgradeId, ChoiceEvent>()
  for (const e of log) {
    // a log read from storage, or sent by a newer device, can hold anything at all
    if (!e || typeof e !== 'object' || e.kind !== 'place') continue
    const key = (e as { key?: unknown }).key
    if (typeof key !== 'string' || !key.startsWith(UPGRADE_KEY_PREFIX)) continue
    const id = key.slice(UPGRADE_KEY_PREFIX.length)
    if (!isUpgradeId(id)) continue
    const item = (e as { item?: unknown }).item
    if (item !== id) continue
    const price = (e as { price?: unknown }).price
    if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) continue
    const had = best.get(id)
    if (!had || newer(e, had)) best.set(id, e)
  }
  return [...best]
    .map(([id, e]) => ({ id, spec: upgrade(id)!, at: e.at, price: (e as unknown as { price: number }).price }))
    .sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1))
}

/** How the shop trades with a given set of things in it. */
export interface Trading {
  /** customers through the door on a whole day */
  customers: number
  /** coins a customer leaves for one copy */
  price: number
}

/** What a set of things adds up to: the opening numbers plus what each one gives. */
export function tradingWith(owned: Iterable<UpgradeId>): Trading {
  let customers = BASE_CUSTOMERS
  let price = BASE_PRICE
  for (const id of owned) {
    const u = upgrade(id)
    if (!u) continue
    customers += u.customers
    price += u.coins
  }
  return { customers, price }
}

export type BuyRefusal = 'unknown' | 'owned' | 'coins'

/**
 * Buying one thing, or why not: it isn't sold, she has it already, or she
 * hasn't the coins. Checked before anything is written, so the log never holds
 * a purchase she couldn't afford.
 */
export function buyUpgrade(
  owned: ReadonlySet<string>,
  coins: number,
  id: string,
): { ok: true; event: ReturnType<typeof buyUpgradeEvent> } | { ok: false; why: BuyRefusal } {
  const u = upgrade(id)
  if (!u) return { ok: false, why: 'unknown' }
  if (owned.has(u.id)) return { ok: false, why: 'owned' }
  if (!(coins >= u.price) || coins <= 0) return { ok: false, why: 'coins' }
  return { ok: true, event: buyUpgradeEvent(u.id, u.price) }
}
