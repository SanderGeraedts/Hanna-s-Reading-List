import { describe, expect, it } from 'vitest'
import type { Book } from '#/lib/library'
import { mergeLogs } from '../creatures/choices'
import type { ChoiceEvent } from '../creatures/choices'
import { addDays } from '../creatures/days'
import { deriveGarden, yearOf } from './garden'
import { SPOTS_PER_BED } from './numbers'
import { itemKey, plantKey } from './spots'

/**
 * The gaps the tester went looking for (T-0065 Test): a book finished and then
 * deleted, two devices that disagree, choices left over from books that are
 * gone, a book with no length and no genre, a garden with a hundred plants on
 * one day, and the year of a finish at midnight on New Year's Eve.
 */

let next = 0
const book = (over: Partial<Book> = {}): Book => ({
  id: `b${next++}`,
  title: `Book ${next}`,
  authors: [],
  color: '#333',
  status: 'read',
  addedAt: next,
  ...over,
})
const finished = (day: string, over: Partial<Book> = {}): Book => book({ finished: [day], readingLog: { [day]: 0.4 }, ...over })
const log = (...events: Array<Record<string, unknown>>) =>
  events.map((e, i) => ({ id: `e${i}`, at: 1000 + i, kind: 'place', ...e })) as unknown as ChoiceEvent[]
const TODAY = '2026-11-23'

describe('choices left over from books that are gone', () => {
  it('ignores the saved spot of a book that is no longer on the shelf, and gives nobody a worse spot for it', () => {
    const left = finished('2026-01-01')
    const stays = finished('2026-01-02')
    const withBoth = deriveGarden([left, stays], log({ key: plantKey(left.id), bed: 0, spot: 6 }), { today: TODAY })
    expect(withBoth.years[0].plants).toHaveLength(2)
    // the book is removed; its choice stays in the log for ever (a log only grows, D-0034)
    const after = deriveGarden([stays], log({ key: plantKey(left.id), bed: 0, spot: 6 }), { today: TODAY })
    expect(after.plants).toBe(1)
    expect(after.years[0].plants[0]).toMatchObject({ id: stays.id, bed: 0, spot: 0 })
    expect(after.years[0].beds).toBe(1)
  })

  it('ignores an item placed in a year garden that no longer exists', () => {
    const g = deriveGarden([finished('2026-05-05')], log({ key: itemKey(2019, 'bench'), slot: 1 }), { today: TODAY })
    expect(g.years.map((y) => y.year)).toEqual([2026])
    expect(g.years[0].items.size).toBe(0)
  })

  it('does not fall over on a choice for a plant that was never there', () => {
    const g = deriveGarden([finished('2026-05-05')], log({ key: plantKey('nobody'), bed: 3, spot: 3 }), { today: TODAY })
    expect(g.plants).toBe(1)
    expect(g.years[0].beds).toBe(1)
  })
})

describe('two devices', () => {
  it('lets the newest spot win for a plant, whichever order the logs meet in', () => {
    const b = finished('2026-02-02')
    const phone = log({ key: plantKey(b.id), bed: 0, spot: 1 })
    const computer = [{ id: 'c1', at: 5000, kind: 'place', key: plantKey(b.id), bed: 0, spot: 9 }] as unknown as ChoiceEvent[]
    for (const merged of [mergeLogs(phone, computer), mergeLogs(computer, phone)])
      expect(deriveGarden([b], merged, { today: TODAY }).years[0].plants[0].spot).toBe(9)
  })

  it('keeps both plants’ spots when each device moved a different plant', () => {
    const a = finished('2026-02-02')
    const c = finished('2026-02-03')
    const phone = log({ key: plantKey(a.id), bed: 0, spot: 5 })
    const computer = [{ id: 'c1', at: 5000, kind: 'place', key: plantKey(c.id), bed: 0, spot: 8 }] as unknown as ChoiceEvent[]
    const year = yearOf(deriveGarden([a, c], mergeLogs(phone, computer), { today: TODAY }), 2026)!
    expect(year.plants.find((p) => p.id === a.id)!.spot).toBe(5)
    expect(year.plants.find((p) => p.id === c.id)!.spot).toBe(8)
  })
})

describe('odd books', () => {
  it('gives a book with no length, no genre and no reading log a grown plant', () => {
    const g = deriveGarden([book({ status: 'read', readCount: 1, finished: ['2026-04-04'] })], [], { today: TODAY })
    const plant = g.years[0].plants[0]
    expect(plant.kind.id).toBe('fern')
    expect(plant.growth).toBe(1)
    expect(plant.stage).toBe('grown')
  })

  it('counts a book finished on 31 December in that year, and one on 1 January in the next', () => {
    const g = deriveGarden([finished('2025-12-31'), finished('2026-01-01')], [], { today: TODAY })
    expect(g.years.map((y) => y.year)).toEqual([2026, 2025])
  })

  it('handles a hundred books finished on one day without two plants on one spot', () => {
    const same = Array.from({ length: 100 }, () => finished('2026-06-06'))
    const year = yearOf(deriveGarden(same, [], { today: TODAY }), 2026)!
    expect(year.plants).toHaveLength(100)
    expect(new Set(year.plants.map((p) => `${p.bed}:${p.spot}`)).size).toBe(100)
    expect(year.beds).toBe(Math.ceil(100 / SPOTS_PER_BED))
  })

  it('keeps a plant for a book finished in a leap year on 29 February', () => {
    const g = deriveGarden([finished('2028-02-29')], [], { today: '2028-03-01' })
    expect(g.years[0].year).toBe(2028)
    expect(g.season).toBe('spring')
  })

  it('still works when the day the device reports is not a real day', () => {
    const g = deriveGarden([finished('2026-05-05')], [], { today: 'not-a-day' })
    // the season falls back rather than throwing; the plants are still there
    expect(g.plants).toBe(1)
    expect(g.season).toBe('winter')
  })
})

describe('the same garden twice', () => {
  it('gives the same answer for the same shelf and log (every device agrees)', () => {
    const books = Array.from({ length: 20 }, (_, i) => finished(addDays('2026-01-01', i * 3), { genres: ['Fantasy'], pages: 400 }))
    const choices = log({ key: plantKey(books[2].id), bed: 1, spot: 1 }, { key: itemKey(2026, 'bench'), slot: 0 })
    const a = deriveGarden(books, choices, { today: TODAY })
    const b = deriveGarden([...books].reverse(), choices, { today: TODAY })
    const seats = (g: typeof a) =>
      g.years[0].plants
        .map((p) => `${p.id}@${p.bed}:${p.spot}`)
        .sort()
        .join(',')
    expect(seats(a)).toBe(seats(b))
  })
})
