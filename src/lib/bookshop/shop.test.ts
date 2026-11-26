import { describe, expect, it } from 'vitest'
import type { Book } from '../library'
import type { ChoiceEvent } from '../creatures/choices'
import { addDays } from '../creatures/days'
import { BASE_CUSTOMERS, BASE_PRICE, FINISH_COPIES, SHOP_START, UPGRADES } from './numbers'
import { deriveBookshop, tradeSince } from './shop'
import { buyUpgradeEvent } from './upgrades'
import { awaySentence } from './words'

/**
 * The shop trading while she is away (T-0113, D-0084 §2, §3). The shop is a
 * pure function of her books, her choices and the clock, so every rule she was
 * promised can be read straight off a test: a week away is a week of trade, a
 * bare shop trickles, nothing is ever lost, and nothing has to be collected.
 */

const S = SHOP_START
const day = (n: number) => addDays(S, n)

/** Midnight at the start of day `n`, local time: nothing of that day has traded yet. */
function midnight(n: number): number {
  const d = day(n)
  return new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10))).getTime()
}

let next = 0
function book(over: Partial<Book> = {}): Book {
  return { id: `b${next++}`, title: 'A book', authors: [], color: '#333', status: 'reading', addedAt: 0, ...over }
}

/** A book she had already read when the shop opened: one copy on the shelf. */
const backlist = (title = 'An old favourite') => book({ title, status: 'read', finished: ['2020-01-01'] })

/** A book finished on opening day with a big print run: 60 pages = 90 minutes = 15 copies, plus 20 for the finish. */
const fresh = (title: string, pages = 60, on = 0) =>
  book({ title, status: 'read', pages, finished: [day(on)], readingLog: { [day(on)]: 1 } })

const shopAt = (books: Book[], n: number, log: ChoiceEvent[] = []) => deriveBookshop(books, log, midnight(n))

describe('the shop opens', () => {
  it('has not opened before its first day', () => {
    const shop = deriveBookshop([backlist()], [], new Date(2026, 0, 1).getTime())
    expect(shop.open).toBe(false)
    expect(shop.coins).toBe(0)
    expect(shop.stock).toBe(0)
  })

  it('opens stocked with one copy of every book she has ever read', () => {
    const books = [backlist('Babel'), backlist('Piranesi'), backlist('Circe')]
    const shop = shopAt(books, 0)
    expect(shop.titles).toBe(3)
    expect(shop.stock).toBe(3)
    // nothing has traded yet at midnight on opening day
    expect(shop.sold).toBe(0)
    expect(shop.coins).toBe(0)
  })

  it('takes six customers a day at two coins a copy until she buys something', () => {
    expect(shopAt([fresh('Babel')], 1).trading).toEqual({ customers: BASE_CUSTOMERS, price: BASE_PRICE })
  })
})

describe('it trades while she is away', () => {
  it('gives her a week of trade when she has been away a week', () => {
    const books = [fresh('Babel', 400)] // 600 minutes = 100 copies + 20 = 120
    const week = shopAt(books, 7)
    expect(week.sold).toBe(BASE_CUSTOMERS * 7)
    expect(week.earned).toBe(BASE_CUSTOMERS * 7 * BASE_PRICE)
    expect(week.stock).toBe(120 - BASE_CUSTOMERS * 7)
  })

  it('caps nothing: a month away is a month of trade, as far as the stock lasted', () => {
    const books = [fresh('Babel', 4000)] // 6000 minutes = 1000 copies + 20
    const month = shopAt(books, 30)
    expect(month.sold).toBe(BASE_CUSTOMERS * 30)
  })

  it('never asks her to collect anything: opening the app changes nothing', () => {
    const books = [fresh('Babel', 400)]
    const once = shopAt(books, 5)
    const twice = shopAt(books, 5)
    expect(twice).toEqual(once)
  })

  it('works the same out of the same moment, however often it is asked', () => {
    const books = [backlist('Babel'), fresh('Piranesi', 200, 2)]
    const now = midnight(9) + 37 * 60 * 1000
    expect(deriveBookshop(books, [], now)).toEqual(deriveBookshop(books, [], now))
  })
})

describe('the stock is the limiter, never a clock', () => {
  it('lets a full shop trade for days and a bare one trickle', () => {
    // one copy on the shelf: the first customer buys it and everyone after that leaves
    const shop = shopAt([backlist('Babel')], 7)
    expect(shop.sold).toBe(1)
    expect(shop.stock).toBe(0)
    expect(shop.earned).toBe(BASE_PRICE)
  })

  it('never sells a copy that is not there, however long she stays away', () => {
    const shop = shopAt([backlist(), backlist(), backlist()], 365)
    expect(shop.sold).toBe(3)
    expect(shop.stock).toBe(0)
  })

  it('does not save up the customers who found the shelves bare', () => {
    // bare for five days, then a book is finished: only that day's customers buy
    const books = [fresh('Babel', 60, 5)] // 15 + 20 = 35 copies on day 5
    const shop = shopAt(books, 6)
    expect(shop.sold).toBe(BASE_CUSTOMERS)
    expect(shop.stock).toBe(35 - BASE_CUSTOMERS)
  })

  it('shares a day’s customers over the titles that have copies', () => {
    const shop = shopAt([fresh('Babel', 400), fresh('Piranesi', 400)], 3)
    expect(shop.sold).toBe(BASE_CUSTOMERS * 3)
    expect(shop.shelf).toHaveLength(2)
    // both sold, neither sold out
    for (const line of shop.shelf) expect(line.copies).toBeLessThan(120)
  })
})

describe('what sold while she was away', () => {
  it('can say “3 copies of Babel sold while you were away”', () => {
    const shop = shopAt([fresh('Babel', 400)], 3)
    const away = tradeSince(shop, day(2))
    expect(away.titles[0].book.title).toBe('Babel')
    expect(away.copies).toBe(BASE_CUSTOMERS)
    expect(awaySentence(away)).toBe('6 copies of Babel sold while you were away.')
  })

  it('says so plainly when nobody came in', () => {
    const shop = shopAt([], 3)
    expect(awaySentence(tradeSince(shop, day(2)))).toBe('Nobody came in while you were away.')
  })

  it('counts every day she was away, not only the last one', () => {
    const shop = shopAt([fresh('Babel', 400)], 6)
    const away = tradeSince(shop, day(3))
    expect(away.copies).toBe(BASE_CUSTOMERS * 3)
    expect(away.days).toBe(4)
  })

  it('still adds up the coins when she was away longer than the shop remembers', () => {
    const shop = shopAt([fresh('Babel', 4000)], 60)
    const away = tradeSince(shop, day(1))
    expect(away.capped).toBe(true)
    expect(shop.earned).toBe(BASE_CUSTOMERS * 60 * BASE_PRICE)
  })
})

describe('what coins buy', () => {
  const buy = (id: string, price: number, at: number): ChoiceEvent =>
    ({ id: `buy-${id}`, at, ...buyUpgradeEvent(id as never, price) }) as unknown as ChoiceEvent

  it('takes the price out of the till and leaves the rest', () => {
    const books = [fresh('Babel', 4000)]
    const log = [buy('sign', 40, midnight(10))]
    const shop = shopAt(books, 12, log)
    expect(shop.spent).toBe(40)
    expect(shop.coins).toBe(shop.earned - 40)
    expect(shop.owned.has('sign')).toBe(true)
  })

  it('draws more customers from the day she bought it', () => {
    const books = [fresh('Babel', 4000)]
    const plain = shopAt(books, 12)
    const withSign = shopAt(books, 12, [buy('sign', 40, midnight(10))])
    // two extra customers a day for day 10 and day 11
    expect(withSign.sold).toBe(plain.sold + 2 * 2)
    expect(withSign.trading.customers).toBe(BASE_CUSTOMERS + 2)
  })

  it('changes the numbers for every single thing in the shop', () => {
    const books = [fresh('Babel', 40000)]
    const plain = shopAt(books, 3)
    for (const u of UPGRADES) {
      const one = shopAt(books, 3, [buy(u.id, u.price, midnight(0))])
      expect(one.earned, u.name).toBeGreaterThan(plain.earned)
    }
  })
})

describe('a device whose clock is wrong', () => {
  it('never loses coins or stock when the clock jumps backwards', () => {
    const books = [fresh('Babel', 400)]
    const far = shopAt(books, 10)
    const back = deriveBookshop(books, [], midnight(3), { floorDay: far.today })
    // the shop stands still at worst; it never walks back to a poorer day
    expect(back.today).toBe(far.today)
    expect(back.coins).toBeGreaterThanOrEqual(far.coins)
    expect(back.sold).toBeGreaterThanOrEqual(far.sold)
    expect(back.stock).toBeLessThanOrEqual(far.stock)
  })

  it('carries on normally once the clock catches up again', () => {
    const books = [fresh('Babel', 400)]
    const later = deriveBookshop(books, [], midnight(12), { floorDay: day(10) })
    expect(later.today).toBe(day(12))
    expect(later.sold).toBe(BASE_CUSTOMERS * 12)
  })

  it('stops after ten years rather than freezing on a clock set to the next century', () => {
    const books = [fresh('Babel', 400)]
    const mad = deriveBookshop(books, [], new Date(2199, 0, 1).getTime())
    expect(mad.open).toBe(true)
    expect(mad.sold).toBe(120)
  })
})

describe('it keeps itself to itself', () => {
  it('reads her books and never writes to them', () => {
    const books = [fresh('Babel', 400), backlist('Piranesi')]
    const before = JSON.stringify(books)
    deriveBookshop(books, [], midnight(9))
    expect(JSON.stringify(books)).toBe(before)
  })

  it('leaves the choice log exactly as it found it', () => {
    const log = [{ id: 'x', at: 1, kind: 'place', key: 's:up:sign', item: 'sign', price: 40 }] as unknown as ChoiceEvent[]
    const before = JSON.stringify(log)
    deriveBookshop([fresh('Babel')], log, midnight(4))
    expect(JSON.stringify(log)).toBe(before)
  })

  it('counts a finish as twenty copies, so a reading week makes a busy shop', () => {
    // 300 minutes of reading and two books finished in a week
    const books = [
      book({ title: 'One', status: 'read', pages: 100, finished: [day(3)], readingLog: { [day(1)]: 0.5, [day(3)]: 0.5 } }),
      book({ title: 'Two', status: 'read', pages: 100, finished: [day(6)], readingLog: { [day(4)]: 0.5, [day(6)]: 0.5 } }),
    ]
    const shop = shopAt(books, 7)
    expect(shop.sold + shop.stock).toBe(2 * (150 / 6 + FINISH_COPIES))
    // a week of trade did not empty it
    expect(shop.stock).toBeGreaterThan(0)
  })
})
