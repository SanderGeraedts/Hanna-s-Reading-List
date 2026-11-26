import { describe, expect, it } from 'vitest'
import type { ChoiceEvent } from '../creatures/choices'
import { cleanEvent, mergeLogs } from '../creatures/choices'
import { deriveShop } from '../creatures/shop'
import { bingoSwaps } from '../bingoSwap'
import { savedItems } from '../garden/spots'
import { BASE_CUSTOMERS, BASE_PRICE, UPGRADES } from './numbers'
import { UPGRADE_KEY_PREFIX, boughtUpgrades, buyUpgrade, buyUpgradeEvent, tradingWith, upgradeKey } from './upgrades'

/**
 * What she buys for the shop (T-0113, D-0084 §5). The shop saves nothing of
 * its own: a thing she buys rides in the creatures choice log that is already
 * live. These tests hold the shop to its promise that it never disturbs the
 * creatures, the garden or bingo while it does so.
 */

let n = 0
const event = (body: Record<string, string | number>, at = 1000): ChoiceEvent =>
  ({ id: `e${n++}`, at, ...body }) as unknown as ChoiceEvent

const bought = (id: string, price: number, at = 1000) => event(buyUpgradeEvent(id as never, price), at)

describe('buying rides in the log that is already there', () => {
  it('saves a purchase under a key of its own, so it can never be another game’s', () => {
    expect(upgradeKey('cat')).toBe('s:up:cat')
    expect(UPGRADE_KEY_PREFIX.startsWith('s:')).toBe(true)
    for (const u of UPGRADES) {
      const key = upgradeKey(u.id)
      expect(key.startsWith('home:')).toBe(false)
      expect(key.startsWith('g:')).toBe(false)
      expect(key.startsWith('b:')).toBe(false)
      expect(key.startsWith('f:')).toBe(false)
      expect(key.startsWith('c:')).toBe(false)
    }
  })

  it('is a place, never a buy — so the creature shop never sees a cookie spent', () => {
    const log = UPGRADES.map((u) => bought(u.id, u.price))
    expect(log.every((e) => e.kind === 'place')).toBe(true)
    const creatures = deriveShop(log)
    expect(creatures.spent).toBe(0)
    expect(creatures.owned.size).toBe(0)
    expect(creatures.purchases).toEqual([])
    expect(creatures.placed).toEqual({})
  })

  it('is invisible to the garden and to bingo', () => {
    const log = UPGRADES.map((u) => bought(u.id, u.price))
    expect(savedItems(log).size).toBe(0)
    expect(bingoSwaps(log).size).toBe(0)
  })

  it('passes the server’s own check on what an event may look like', () => {
    for (const u of UPGRADES) expect(cleanEvent(bought(u.id, u.price))).not.toBeNull()
  })

  it('never lets the log grow: one event per thing, however often it is saved', () => {
    const log = mergeLogs([bought('cat', 600, 1000)], [bought('cat', 600, 2000)], [bought('cat', 600, 3000)])
    expect(log.filter((e) => (e as { key?: string }).key === 's:up:cat')).toHaveLength(1)
  })
})

describe('what she owns', () => {
  it('counts a thing once when two devices both bought it', () => {
    const owned = boughtUpgrades([bought('sign', 40, 1000), bought('sign', 40, 2000)])
    expect(owned.map((b) => b.id)).toEqual(['sign'])
  })

  it('keeps what she paid, even after the price in the shop changes', () => {
    const owned = boughtUpgrades([bought('till', 25)])
    expect(owned[0].price).toBe(25)
  })

  it('ignores a key that is not the shop’s, a thing that is not sold and a price that is not a number', () => {
    const log = [
      event({ kind: 'place', key: 'home:bed', item: 'basket-bed' }),
      event({ kind: 'place', key: 's:up:spaceship', item: 'spaceship', price: 1 }),
      event({ kind: 'place', key: 's:up:cat', item: 'cat' }),
      event({ kind: 'place', key: 's:up:lamp', item: 'sign', price: 10 }),
    ]
    expect(boughtUpgrades(log)).toEqual([])
  })

  it('lists them in the order she bought them', () => {
    const owned = boughtUpgrades([bought('cat', 600, 3000), bought('sign', 40, 1000), bought('till', 90, 2000)])
    expect(owned.map((b) => b.id)).toEqual(['sign', 'till', 'cat'])
  })
})

describe('what the shop draws', () => {
  it('opens with six customers a day at two coins a copy', () => {
    expect(tradingWith([])).toEqual({ customers: BASE_CUSTOMERS, price: BASE_PRICE })
  })

  it('counts every thing she has bought', () => {
    const all = tradingWith(UPGRADES.map((u) => u.id))
    expect(all.customers).toBe(BASE_CUSTOMERS + UPGRADES.reduce((n, u) => n + u.customers, 0))
    expect(all.price).toBe(BASE_PRICE + UPGRADES.reduce((n, u) => n + u.coins, 0))
  })

  it('gives every thing in the shop something to do', () => {
    for (const u of UPGRADES) expect(u.customers + u.coins).toBeGreaterThan(0)
  })
})

describe('buying, before anything is written', () => {
  const none = new Set<string>()

  it('refuses what she cannot afford, and says why', () => {
    expect(buyUpgrade(none, 39, 'sign')).toEqual({ ok: false, why: 'coins' })
  })

  it('refuses a thing she has already', () => {
    expect(buyUpgrade(new Set(['sign']), 500, 'sign')).toEqual({ ok: false, why: 'owned' })
  })

  it('refuses something the shop does not sell', () => {
    expect(buyUpgrade(none, 9999, 'spaceship')).toEqual({ ok: false, why: 'unknown' })
  })

  it('lets her buy when she has exactly enough', () => {
    const r = buyUpgrade(none, 40, 'sign')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.event).toEqual({ kind: 'place', key: 's:up:sign', item: 'sign', price: 40 })
  })

  it('never lets her buy with nothing in the till', () => {
    expect(buyUpgrade(none, 0, 'sign')).toEqual({ ok: false, why: 'coins' })
  })
})
