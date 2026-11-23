import { describe, expect, it } from 'vitest'
import type { Book } from '../library'
import { cleanRoom, DEFAULT_ROOM, shownDecor } from '../room'
import { cleanEvent, mergeLogs } from './choices'
import type { ChoiceEvent } from './choices'
import { deriveCreatures, isShinyEgg } from './creature'
import { addDays } from './days'
import { eggSpecies } from './eggs'
import { CREATURES_START, EGG_PRICE, FOOD_GROWTH, SHOP } from './numbers'
import {
  CATEGORIES,
  OUTFIT_SLOTS,
  SHOP_ITEMS,
  buyEvent,
  deriveShop,
  eggItem,
  habitatEvent,
  itemsIn,
  ownedDecor,
  placeEvent,
  splitWearKey,
  wearEvent,
  wearKey,
} from './shop'
import { speciesById } from './species'
import { skyAt, weatherAt } from './weather'
import { eggReason } from './words'

/**
 * The creature shop (T-0031 Done when 1): prices, the balance after buying,
 * refusals, once-only items, outfits per slot, bought eggs, bought room
 * decorations and that a later price change never changes what she paid.
 */

const TODAY = addDays(CREATURES_START, 3)
const NOW = new Date(`${TODAY}T19:00:00`)
const at = (time: string, day = TODAY) => new Date(`${day}T${time}:00`).getTime()
// 0.36 of 1,000 pages = 360 pages = 540 minutes = 108 cookies today (under 10 hours: no hour egg)
const BOOKS: Book[] = [{ id: 'big', title: 'A Big Book', authors: ['A. Writer'], color: '#333', status: 'reading', addedAt: 0, pages: 1000, readingLog: { [TODAY]: 0.36 } }]
let n = 0
const ev = (e: Record<string, string | number>, time = '10:00'): ChoiceEvent => ({ id: `e-${n++}`, at: at(time), ...e }) as ChoiceEvent
const WELCOME = [ev({ kind: 'hatch', egg: 'welcome', species: 'cat' }, '08:00')]
const buy = (item: string, price = SHOP[item], extra: Record<string, string> = {}, time = '10:00') => ev({ kind: 'buy', item, price, ...extra }, time)
const derive = (log: ChoiceEvent[]) => deriveCreatures(BOOKS, log, NOW)

describe('the shop list (Design §2)', () => {
  it('sells 41 items in seven categories, each with a price in SHOP', () => {
    expect(SHOP_ITEMS.length).toBe(41)
    expect(CATEGORIES.map((c) => c.id)).toEqual(['food', 'outfits', 'home', 'eggs', 'toys', 'habitats', 'room'])
    const count = (c: string) => SHOP_ITEMS.filter((i) => i.category === c).length
    expect([count('food'), count('outfits'), count('home'), count('eggs'), count('toys'), count('habitats'), count('room')]).toEqual([3, 12, 9, 6, 3, 4, 4])
    expect(Object.keys(SHOP).sort()).toEqual(SHOP_ITEMS.map((i) => i.id).sort())
    // the Cosy den comes first among the habitats, free and not for sale
    expect(itemsIn('habitats')[0].id).toBe('cosy')
    expect(SHOP.cosy).toBeUndefined()
  })

  it("keeps every price in its category's range (Goal 2), eggs at D-0033's prices", () => {
    const range: Record<string, [number, number]> = { food: [5, 25], outfits: [20, 60], home: [30, 80], toys: [25, 50], habitats: [80, 150], room: [60, 120] }
    for (const i of SHOP_ITEMS) {
      if (i.category === 'eggs') expect(SHOP[i.id], i.id).toBe(EGG_PRICE[i.tier!])
      else {
        expect(SHOP[i.id], i.id).toBeGreaterThanOrEqual(range[i.category][0])
        expect(SHOP[i.id], i.id).toBeLessThanOrEqual(range[i.category][1])
      }
    }
    expect(eggItem('very rare')).toBe('egg-very-rare')
    // everything once ≈ half a year: 1,730 🍪 (Design §1)
    const once = SHOP_ITEMS.filter((i) => i.category !== 'food' && i.category !== 'eggs').reduce((s, i) => s + SHOP[i.id], 0)
    expect(once).toBe(1730)
  })

  it('gives more growth per cookie for the bigger food than Feed (5 🍪 = 5)', () => {
    expect(FOOD_GROWTH['berry-snack'] / SHOP['berry-snack']).toBeGreaterThan(1)
    expect(FOOD_GROWTH['honey-cake'] / SHOP['honey-cake']).toBeGreaterThan(FOOD_GROWTH['berry-snack'] / SHOP['berry-snack'])
    expect(FOOD_GROWTH['picnic-feast'] / SHOP['picnic-feast']).toBeGreaterThan(FOOD_GROWTH['honey-cake'] / SHOP['honey-cake'])
  })
})

describe('buying', () => {
  it('the balance after buying is earned − paid', () => {
    const before = derive(WELCOME)
    expect(before.earned).toBe(108)
    expect(before.balance).toBe(108)
    const after = derive([...WELCOME, buy('bobble-hat'), buy('egg-common')])
    expect(after.spent).toBe(30 + 60)
    expect(after.balance).toBe(108 - 90)
    // feeding and buying both count
    expect(derive([...WELCOME, buy('bobble-hat'), ev({ kind: 'feed', pet: 'welcome', amount: 5 })]).balance).toBe(73)
  })

  it('refuses a buy when the balance is too low, at exactly the price it buys', () => {
    const shop = deriveShop([])
    expect(buyEvent(shop, 29, 'bobble-hat')).toEqual({ ok: false, why: 'balance' })
    expect(buyEvent(shop, 30, 'bobble-hat')).toEqual({ ok: true, event: { kind: 'buy', item: 'bobble-hat', price: 30 } })
    expect(buyEvent(shop, 31, 'bobble-hat').ok).toBe(true)
  })

  it('refuses every buy below zero (after a fix to a past day), food too', () => {
    const shop = deriveShop([])
    expect(buyEvent(shop, -4, 'berry-snack', { pet: 'welcome' })).toEqual({ ok: false, why: 'balance' })
    expect(buyEvent(shop, 0, 'berry-snack', { pet: 'welcome' })).toEqual({ ok: false, why: 'balance' })
    expect(buyEvent(shop, -4, 'egg-common')).toEqual({ ok: false, why: 'balance' })
  })

  it('refuses something not sold, and food without a pet of hers', () => {
    const shop = deriveShop([])
    expect(buyEvent(shop, 999, 'golden-throne')).toEqual({ ok: false, why: 'unknown' })
    expect(buyEvent(shop, 999, 'cosy')).toEqual({ ok: false, why: 'unknown' })
    expect(buyEvent(shop, 999, 'honey-cake')).toEqual({ ok: false, why: 'pet' })
    expect(buyEvent(shop, 999, 'honey-cake', { pet: 'gone', pets: ['welcome'] })).toEqual({ ok: false, why: 'pet' })
    expect(buyEvent(shop, 999, 'honey-cake', { pet: 'welcome', pets: ['welcome'] })).toEqual({
      ok: true,
      event: { kind: 'buy', item: 'honey-cake', price: 12, pet: 'welcome' },
    })
  })

  it('buys an outfit, home item, toy, habitat or decoration once; food and eggs again and again', () => {
    const owned = deriveShop([buy('bobble-hat'), buy('forest'), buy('snow-globe'), buy('slide')])
    for (const id of ['bobble-hat', 'forest', 'snow-globe', 'slide']) expect(buyEvent(owned, 999, id)).toEqual({ ok: false, why: 'owned' })
    expect(buyEvent(owned, 999, 'egg-rare').ok).toBe(true)
    expect(buyEvent(owned, 999, 'berry-snack', { pet: 'welcome' }).ok).toBe(true)
    // two devices that both bought the hat (or two taps that got through): paid once
    const twice = derive([...WELCOME, buy('bobble-hat', 30, {}, '10:00'), buy('bobble-hat', 30, {}, '10:00')])
    expect(twice.spent).toBe(30)
    expect(twice.shop.purchases.length).toBe(1)
    // two eggs and two snacks: each counts
    const repeat = derive([...WELCOME, buy('egg-common'), buy('egg-common'), buy('berry-snack', 5, { pet: 'welcome' }), buy('berry-snack', 5, { pet: 'welcome' })])
    expect(repeat.spent).toBe(130)
    expect(repeat.shop.eggs.length).toBe(2)
  })

  it('a price changed later never changes what she paid (Goal 3)', () => {
    // she paid 30 for the hat; the shop sells it for 45 now
    const log = [...WELCOME, buy('bobble-hat', 30)]
    expect(SHOP['bobble-hat']).toBe(30)
    const was = SHOP['bobble-hat']
    SHOP['bobble-hat'] = 45
    try {
      expect(derive(log).spent).toBe(30)
      expect(derive(log).balance).toBe(78)
      expect(buyEvent(deriveShop([]), 40, 'bobble-hat')).toEqual({ ok: false, why: 'balance' })
    } finally {
      SHOP['bobble-hat'] = was
    }
  })

  it('keeps an item no longer sold: still hers, still paid', () => {
    const c = derive([...WELCOME, ev({ kind: 'buy', item: 'old-hat', price: 33 })])
    expect(c.shop.owned.has('old-hat')).toBe(true)
    expect(c.spent).toBe(33)
  })

  it('ignores a buy without a sensible price', () => {
    expect(deriveShop([ev({ kind: 'buy', item: 'ball', price: -5 }), ev({ kind: 'buy', item: 'yarn', price: 'free' as unknown as number })]).spent).toBe(0)
  })

  it('food grows the pet it was given to by its own amount', () => {
    const plain = derive(WELCOME).pets[0]
    const fed = derive([...WELCOME, buy('honey-cake', 12, { pet: 'welcome' })]).pets[0]
    expect(fed.growth - plain.growth).toBe(FOOD_GROWTH['honey-cake'])
    expect(fed.fed).toBe(plain.fed)
  })
})

describe('dressing (Design §7)', () => {
  it('puts on only owned outfits, one per slot, in their own slot', () => {
    const none = deriveShop([])
    expect(wearEvent(none, 'welcome', 'head', 'bobble-hat')).toEqual({ ok: false, why: 'owned' })
    const shop = deriveShop([buy('bobble-hat'), buy('big-bow'), buy('reading-glasses')])
    expect(wearEvent(shop, 'welcome', 'face', 'bobble-hat')).toEqual({ ok: false, why: 'slot' })
    expect(wearEvent(shop, 'welcome', 'head', 'forest')).toEqual({ ok: false, why: 'unknown' })
    expect(wearEvent(shop, 'welcome', 'head', 'bobble-hat')).toEqual({ ok: true, event: { kind: 'wear', key: 'welcome:head', item: 'bobble-hat' } })
    // the newest wear per slot wins: the bow replaces the hat
    const log = [buy('bobble-hat'), buy('big-bow'), buy('reading-glasses'), ev({ kind: 'wear', key: 'welcome:head', item: 'bobble-hat' }, '11:00'), ev({ kind: 'wear', key: 'welcome:head', item: 'big-bow' }, '11:01'), ev({ kind: 'wear', key: 'welcome:face', item: 'reading-glasses' }, '11:02')]
    expect(deriveShop(log).worn.get('welcome')).toEqual({ head: 'big-bow', face: 'reading-glasses' })
    expect(deriveShop(mergeLogs(log)).worn.get('welcome')).toEqual({ head: 'big-bow', face: 'reading-glasses' })
    // take off
    const off = [...log, ev({ kind: 'wear', key: 'welcome:head', item: 'none' }, '11:03')]
    expect(deriveShop(off).worn.get('welcome')).toEqual({ face: 'reading-glasses' })
  })

  it('takes the slot after the last colon: pet ids may hold colons', () => {
    expect(splitWearKey('m:books-5:head')).toEqual({ pet: 'm:books-5', slot: 'head' })
    expect(splitWearKey('shop:buy-abc-123:back')).toEqual({ pet: 'shop:buy-abc-123', slot: 'back' })
    expect(splitWearKey('welcome')).toBeNull()
    expect(wearKey('m:books-5', 'neck')).toBe('m:books-5:neck')
    const shop = deriveShop([buy('bow-tie'), ev({ kind: 'wear', key: 'm:books-5:neck', item: 'bow-tie' }, '11:00')])
    expect(shop.worn.get('m:books-5')).toEqual({ neck: 'bow-tie' })
    // a whole wear event fits the route's limits
    expect(cleanEvent({ id: 'wear-x-1', at: 1, kind: 'wear', key: 'shop:buy-mig5w3k0-a1b2c3:head', item: 'little-crown' })).not.toBeNull()
  })

  it('one outfit can be worn by several pets at once', () => {
    const shop = deriveShop([buy('bobble-hat'), ev({ kind: 'wear', key: 'welcome:head', item: 'bobble-hat' }, '11:00'), ev({ kind: 'wear', key: 'm:books-5:head', item: 'bobble-hat' }, '11:01')])
    expect(shop.worn.get('welcome')?.head).toBe('bobble-hat')
    expect(shop.worn.get('m:books-5')?.head).toBe('bobble-hat')
  })

  it('ignores a wear of an item not owned yet, until its buy arrives', () => {
    const wear = ev({ kind: 'wear', key: 'welcome:head', item: 'little-crown' }, '11:00')
    expect(deriveShop([wear]).worn.get('welcome')).toBeUndefined()
    expect(deriveShop([wear, buy('little-crown', 60, {}, '12:00')]).worn.get('welcome')).toEqual({ head: 'little-crown' })
  })
})

describe('the den (Design §8, §9)', () => {
  it('places only owned home items and toys in their own spot; Put away brings back the defaults', () => {
    expect(placeEvent(deriveShop([]), 'right', 'reading-lamp')).toEqual({ ok: false, why: 'owned' })
    const shop = deriveShop([buy('reading-lamp'), buy('ball'), buy('slide')])
    expect(placeEvent(shop, 'left', 'reading-lamp')).toEqual({ ok: false, why: 'slot' })
    expect(placeEvent(shop, 'toy', 'slide')).toEqual({ ok: true, event: { kind: 'place', key: 'home:toy', item: 'slide' } })
    const log = [buy('reading-lamp'), buy('ball'), buy('slide'), ev({ kind: 'place', key: 'home:toy', item: 'ball' }, '11:00'), ev({ kind: 'place', key: 'home:toy', item: 'slide' }, '11:01'), ev({ kind: 'place', key: 'home:right', item: 'reading-lamp' }, '11:02')]
    expect(deriveShop(log).placed).toEqual({ toy: 'slide', right: 'reading-lamp' })
    expect(deriveShop([...log, ev({ kind: 'place', key: 'home:right', item: 'none' }, '11:03')]).placed).toEqual({ toy: 'slide' })
  })

  it('uses the Cosy den or an owned habitat', () => {
    expect(deriveShop([]).habitat).toBe('cosy')
    expect(habitatEvent(deriveShop([]), 'forest')).toEqual({ ok: false, why: 'owned' })
    expect(habitatEvent(deriveShop([]), 'cosy').ok).toBe(true)
    const log = [buy('forest'), ev({ kind: 'habitat', key: 'den', item: 'forest' }, '11:00')]
    expect(deriveShop(log).habitat).toBe('forest')
    expect(deriveShop([...log, ev({ kind: 'habitat', key: 'den', item: 'cosy' }, '11:01')]).habitat).toBe('cosy')
    // a habitat she doesn't own (yet) is ignored
    expect(deriveShop([ev({ kind: 'habitat', key: 'den', item: 'ice' })]).habitat).toBe('cosy')
  })
})

describe('bought eggs (Design §6, D-0033 §7)', () => {
  it('waits with the other eggs as `shop:<purchase id>`, of its tier, from the shop', () => {
    const b = buy('egg-rare')
    const c = derive([...WELCOME, b])
    expect(c.eggs.map((e) => [e.id, e.tier, e.kind])).toEqual([[`shop:${b.id}`, 'rare', 'shop']])
    expect(eggReason(c.eggs[0])).toBe('From the shop')
  })

  it('hatches like a milestone egg of its tier: the same seeded species and shiny on every device', () => {
    const b = buy('egg-rare')
    const egg = `shop:${b.id}`
    const c = derive([...WELCOME, b, ev({ kind: 'hatch', egg }, '12:00')])
    expect(c.eggs).toEqual([])
    const pet = c.pets.find((p) => p.id === egg)!
    expect(pet.tier).toBe('rare')
    expect(pet.species).toBe(eggSpecies(egg, 'rare'))
    expect(speciesById(pet.species).tier).toBe('rare')
    expect(pet.shiny).toBe(isShinyEgg(egg))
    // a duplicate of a species she has is a choice, as for a milestone egg
    const again = buy('egg-common', 60, {}, '13:00')
    const egg2 = `shop:${again.id}`
    const d = deriveCreatures(BOOKS, [...WELCOME, b, again, ev({ kind: 'hatch', egg: egg2 }, '14:00')], NOW, { forceDuplicate: true })
    expect(d.duplicates.map((x) => x.egg)).toContain(egg2)
  })

  it('lists bought and milestone eggs oldest first', () => {
    // five books finished on the start day (an egg), an egg bought today
    const books: Book[] = [...BOOKS, ...[1, 2, 3, 4, 5].map((i) => ({ id: `s${i}`, title: `S${i}`, authors: ['A'], color: '#333', status: 'read' as const, addedAt: 0, pages: 10, finished: [CREATURES_START] }))]
    const c = deriveCreatures(books, [...WELCOME, buy('egg-epic')], NOW)
    expect(c.eggs.map((e) => e.kind)).toEqual(['books', 'shop'])
  })
})

describe('room decorations (Design §11)', () => {
  it('a bought decoration joins the room panel list at the end, switched on; one not bought is nowhere', () => {
    const owned = ownedDecor([buy('snow-globe')])
    expect(owned).toEqual(['snow-globe'])
    const room = cleanRoom(null, owned)
    expect(room.decor.at(-1)).toEqual({ kind: 'snow-globe', on: true })
    expect(room.decor.map((d) => d.kind)).not.toContain('pennant')
    expect(shownDecor(room)).toContain('snow-globe')
    // without the purchase (another account, or not synced yet): not in the list at all
    expect(cleanRoom({ decor: [{ kind: 'snow-globe', on: true }] }).decor.map((d) => d.kind)).not.toContain('snow-globe')
  })

  it('keeps it hidden on this device once she hid it, and an older saved room still loads', () => {
    const owned = ownedDecor([buy('snow-globe'), buy('pennant')])
    const saved = { wood: 'cherry', decor: [{ kind: 'snow-globe', on: false }, { kind: 'koala', on: true }] }
    const room = cleanRoom(saved, owned)
    expect(room.wood).toBe('cherry')
    expect(room.decor[0]).toEqual({ kind: 'snow-globe', on: false })
    expect(room.decor.at(-1)).toEqual({ kind: 'pennant', on: true })
    expect(room.decor.length).toBe(DEFAULT_ROOM.decor.length + 2)
    // Reset switches owned decorations on again and keeps them
    expect(cleanRoom(DEFAULT_ROOM, owned).decor.slice(-2)).toEqual([
      { kind: 'pennant', on: true },
      { kind: 'snow-globe', on: true },
    ])
  })
})

describe('the window (Design §8)', () => {
  const d = (s: string) => new Date(s)
  it('follows the clock: dawn, day, dusk, night', () => {
    expect(skyAt(d('2026-12-01T04:59:00'))).toBe('night')
    expect(skyAt(d('2026-12-01T05:00:00'))).toBe('dawn')
    expect(skyAt(d('2026-12-01T07:00:00'))).toBe('day')
    expect(skyAt(d('2026-12-01T17:59:00'))).toBe('day')
    expect(skyAt(d('2026-12-01T18:00:00'))).toBe('dusk')
    expect(skyAt(d('2026-12-01T20:00:00'))).toBe('night')
  })
  it('follows the month: snow in winter, rain in spring and autumn, sun in summer', () => {
    const months = Array.from({ length: 12 }, (_, m) => weatherAt(new Date(2026, m, 15, 12)))
    expect(months).toEqual(['snow', 'snow', 'rain', 'rain', 'sun', 'sun', 'sun', 'sun', 'sun', 'rain', 'rain', 'snow'])
  })
})

it('has four outfit slots, in the order of the strip', () => {
  expect(OUTFIT_SLOTS).toEqual(['head', 'face', 'neck', 'back'])
})
