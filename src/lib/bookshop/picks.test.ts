import { describe, expect, it } from 'vitest'
import type { Book } from '../library'
import type { ChoiceEvent } from '../creatures/choices'
import { addDays } from '../creatures/days'
import { MAX_PICKS, PICK_BONUS, SHOP_START } from './numbers'
import { currentPicks, pickBook, pickEvent, pickKey, pickedOn, picksFrom, unpickEvent } from './picks'
import { deriveBookshop } from './shop'

/**
 * Staff picks and best sellers (T-0123, D-0091). Picks sell like any other book and bring one
 * coin more each; a sold-out pick leaves the window by itself; changing her picks never takes
 * back a coin the shop already earned.
 */

const S = SHOP_START
const day = (n: number) => addDays(S, n)
const midnight = (n: number) => {
  const d = day(n)
  return new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10))).getTime()
}

let seq = 0
const ev = (e: Record<string, unknown>, at: number): ChoiceEvent => ({ id: `e${seq++}`, at, ...e }) as unknown as ChoiceEvent
const book = (id: string, title: string, pages = 60, on = 0): Book =>
  ({ id, title, authors: [], color: '#333', status: 'read', addedAt: 0, pages, finished: [day(on)], readingLog: { [day(on)]: 1 } }) as Book

describe('the picks in the choice log', () => {
  it('reads each book’s newest event, with its first day and the day it came out', () => {
    const log = [
      ev(pickEvent('a', day(0), [])!, 1),
      ev(pickEvent('b', day(1), [])!, 2),
      ev(unpickEvent({ id: 'a', since: day(0), at: 1 }, day(3)), 3),
    ]
    const picks = picksFrom(log)
    expect(picks.map((p) => [p.id, p.since, p.until])).toEqual([
      ['b', day(1), undefined],
      ['a', day(0), day(3)],
    ])
    expect(currentPicks(picks).map((p) => p.id)).toEqual(['b'])
    expect(pickedOn(picks, 'a', day(2))).toBe(true)
    // the day it came out does not count any more
    expect(pickedOn(picks, 'a', day(3))).toBe(false)
    expect(pickedOn(picks, 'b', day(0))).toBe(false)
  })

  it('ignores anything that is not a pick, or not a sensible one', () => {
    const log = [
      ev({ kind: 'place', key: 's:up:sign', item: 'sign', price: 30 }, 1),
      ev({ kind: 'place', key: pickKey('x'), item: 'on', book: 'y', since: day(0) }, 2),
      ev({ kind: 'place', key: pickKey('z'), item: 'on', book: 'z', since: 'soon' }, 3),
      ev({ kind: 'place', key: pickKey('w'), item: 'off', book: 'w', since: day(0) }, 4),
      ev({ kind: 'buy', key: pickKey('v'), item: 'on', book: 'v', since: day(0) }, 5),
    ]
    expect(picksFrom(log)).toEqual([])
  })

  it('a book picked again keeps its first day, so nothing it earned is taken back', () => {
    const first = picksFrom([ev(pickEvent('a', day(0), [])!, 1), ev(unpickEvent({ id: 'a', since: day(0), at: 1 }, day(2)), 2)])
    expect(pickEvent('a', day(5), first)!.since).toBe(day(0))
  })

  it(`allows ${MAX_PICKS} in the window, and a sold-out pick's place is free`, () => {
    const picks = picksFrom([ev(pickEvent('a', day(0), [])!, 1), ev(pickEvent('b', day(0), [])!, 2), ev(pickEvent('c', day(0), [])!, 3)])
    expect(pickBook('d', day(4), picks, ['a', 'b', 'c'])).toEqual({ ok: false, why: 'full' })
    expect(pickBook('a', day(4), picks, ['a', 'b', 'c'])).toEqual({ ok: false, why: 'picked' })
    // b sold out: d takes its place, and b leaves the list in the same go
    const r = pickBook('d', day(4), picks, ['a', 'c'])
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.events.map((e) => [e.book, e.item])).toEqual([
        ['b', 'off'],
        ['d', 'on'],
      ])
    }
    expect(pickBook('x'.repeat(61), day(4), [], [])).toEqual({ ok: false, why: 'long' })
  })
})

describe('picks in the shop', () => {
  const books = [book('babel', 'Babel', 600), book('circe', 'Circe', 600)]

  it('picks sell like any other book, one coin more each', () => {
    const plain = deriveBookshop(books, [], midnight(5))
    const picked = deriveBookshop(books, [ev(pickEvent('babel', day(0), [])!, midnight(0))], midnight(5))
    // the same copies sell: picks are not sold first
    expect(picked.sold).toBe(plain.sold)
    const babelSold = picked.bestsellers.find((l) => l.id === 'babel')!.copies
    expect(picked.earned - plain.earned).toBe(babelSold * PICK_BONUS)
  })

  it('taking a pick out never takes a coin back', () => {
    const on = ev(pickEvent('babel', day(0), [])!, midnight(0))
    const kept = deriveBookshop(books, [on], midnight(3))
    const off = ev(unpickEvent({ id: 'babel', since: day(0), at: on.at }, day(3)), midnight(3))
    const later = deriveBookshop(books, [on, off], midnight(3))
    expect(later.earned).toBe(kept.earned)
  })

  it('shows picks with copies left in the window, and a sold-out pick leaves it by itself', () => {
    // Slim: twenty copies on opening day. Babel: finished on day 8, a big pile from then on
    const tiny = [book('babel', 'Babel', 600, 8), { ...book('slim', 'Slim', 1), readingLog: {} } as Book]
    const log = [ev(pickEvent('slim', day(0), [])!, midnight(0)), ev(pickEvent('babel', day(0), [])!, midnight(0) + 1)]
    // Babel is picked but not on sale yet: only Slim stands in the window
    expect(deriveBookshop(tiny, log, midnight(1)).window.map((l) => l.id)).toEqual(['slim'])
    // six customers a day empty Slim in four days; Babel is on sale by day 10
    const later = deriveBookshop(tiny, log, midnight(10))
    expect(later.window.map((l) => l.id)).toEqual(['babel'])
    expect(currentPicks(later.picks).map((p) => p.id)).toEqual(['slim', 'babel'])
  })

  it('names her best sellers and the book of the week from what really sold', () => {
    const shop = deriveBookshop(books, [], midnight(9))
    expect(shop.bestsellers.length).toBeGreaterThan(0)
    expect(shop.bestsellers.length).toBeLessThanOrEqual(3)
    const total = shop.bestsellers.reduce((n, l) => n + l.copies, 0)
    expect(total).toBe(shop.sold)
    expect(shop.weekBest?.id).toBe(shop.bestsellers[0].id)
    // before anything sold: nothing to name
    const fresh = deriveBookshop(books, [], midnight(0))
    expect(fresh.bestsellers).toEqual([])
    expect(fresh.weekBest).toBeNull()
  })
})
