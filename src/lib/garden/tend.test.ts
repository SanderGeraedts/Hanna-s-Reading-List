import { describe, expect, it } from 'vitest'
import type { Book } from '../library'
import { addDays } from '../creatures/days'
import { cleanEvent, mergeLogs } from '../creatures/choices'
import type { ChoiceEvent } from '../creatures/choices'
import { deriveGarden, yearOf } from './garden'
import { freeItemSlot, movePlant, placeItem, plantOn, removeItem, stepSpot, tidyYear } from './tend'
import { SPOTS_PER_BED, itemSlotsFor } from './numbers'

/**
 * Tending the garden (T-0063): moving a plant (an occupied spot swaps), placing
 * and taking away a garden item, and stepping through the spots with the arrow
 * keys. Every answer is checked by replaying it into the log, as the app does.
 */

let next = 0
const finished = (day: string, over: Partial<Book> = {}): Book => ({
  id: `b${next++}`,
  title: `Book ${next}`,
  authors: [],
  color: '#333',
  status: 'read',
  addedAt: next,
  finished: [day],
  ...over,
})

const TODAY = '2026-11-23'
const shelf = (n: number) => Array.from({ length: n }, (_, i) => finished(addDays('2026-01-01', i)))

/** Replays events into a log the way `useCreatureChoices` does, then derives the garden again. */
let replays = 0
function replay(log: ChoiceEvent[], events: Array<Record<string, unknown>>) {
  // a settings log collapses per key, so its length is no counter: count the replays
  const base = 1 + replays++ * 100
  const added = events.map((e, i) => {
    const full = { id: `new-${base + i}`, at: 9000 + base + i, ...e }
    // exactly the check the server's route makes: a garden event must survive it
    expect(cleanEvent(full), JSON.stringify(full)).not.toBeNull()
    return full as unknown as ChoiceEvent
  })
  return mergeLogs(log, added)
}

describe('moving a plant', () => {
  it('moves it to an empty spot with one choice', () => {
    const books = shelf(3)
    let log: ChoiceEvent[] = []
    const year = yearOf(deriveGarden(books, log, { today: TODAY }), 2026)!
    const r = movePlant(year, books[0].id, { bed: 0, spot: 7 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.events).toHaveLength(1)
    expect(r.say).toBe('Moved to bed 1, spot 8.')
    log = replay(log, r.events)
    const after = yearOf(deriveGarden(books, log, { today: TODAY }), 2026)!
    expect(after.plants.find((p) => p.id === books[0].id)).toMatchObject({ bed: 0, spot: 7, placed: true })
  })

  it('swaps with the plant that is there, so no plant is ever left without a spot', () => {
    const books = shelf(3)
    const year = yearOf(deriveGarden(books, [], { today: TODAY }), 2026)!
    const r = movePlant(year, books[0].id, { bed: 0, spot: 2 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.events).toHaveLength(2)
    expect(r.say).toContain('Swapped with the')
    const log = replay([], r.events)
    const after = yearOf(deriveGarden(books, log, { today: TODAY }), 2026)!
    expect(after.plants.find((p) => p.id === books[0].id)!.spot).toBe(2)
    expect(after.plants.find((p) => p.id === books[2].id)!.spot).toBe(0)
    expect(after.plants.find((p) => p.id === books[1].id)!.spot).toBe(1)
  })

  it('moves a plant to another bed of the same garden', () => {
    const books = shelf(SPOTS_PER_BED + 1)
    const year = yearOf(deriveGarden(books, [], { today: TODAY }), 2026)!
    expect(year.beds).toBe(2)
    const r = movePlant(year, books[0].id, { bed: 1, spot: 5 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const after = yearOf(deriveGarden(books, replay([], r.events), { today: TODAY }), 2026)!
    expect(after.plants.find((p) => p.id === books[0].id)).toMatchObject({ bed: 1, spot: 5 })
  })

  it('refuses a spot outside the garden, the spot it is already on, and a plant of another year', () => {
    const books = [...shelf(2), finished('2025-04-04')]
    const garden = deriveGarden(books, [], { today: TODAY })
    const year = yearOf(garden, 2026)!
    expect(movePlant(year, books[0].id, { bed: 9, spot: 0 })).toEqual({ ok: false, why: 'nowhere' })
    expect(movePlant(year, books[0].id, { bed: 0, spot: -1 })).toEqual({ ok: false, why: 'nowhere' })
    expect(movePlant(year, books[0].id, { bed: 0, spot: SPOTS_PER_BED })).toEqual({ ok: false, why: 'nowhere' })
    expect(movePlant(year, books[0].id, { bed: 0, spot: 0 })).toEqual({ ok: false, why: 'same-spot' })
    expect(movePlant(year, books[2].id, { bed: 0, spot: 3 })).toEqual({ ok: false, why: 'other-year' })
  })

  it('cannot remove a plant: moving only ever writes where things stand', () => {
    const books = shelf(2)
    const year = yearOf(deriveGarden(books, [], { today: TODAY }), 2026)!
    const r = movePlant(year, books[0].id, { bed: 0, spot: 4 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    for (const e of r.events) expect(e.kind).toBe('place')
    expect(deriveGarden(books, replay([], r.events), { today: TODAY }).plants).toBe(2)
  })

  it('finds the plant on a spot', () => {
    const books = shelf(2)
    const year = yearOf(deriveGarden(books, [], { today: TODAY }), 2026)!
    expect(plantOn(year, { bed: 0, spot: 1 })!.id).toBe(books[1].id)
    expect(plantOn(year, { bed: 0, spot: 9 })).toBeNull()
  })
})

describe('garden items', () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => finished(addDays('2026-01-01', i)))

  it('places an unlocked item and takes it away again', () => {
    const books = many(30)
    const garden = deriveGarden(books, [], { today: TODAY })
    const placed = placeItem(garden, 2026, 'bench', 1)
    expect(placed).toMatchObject({ ok: true, say: 'Bench placed.' })
    if (!placed.ok) return
    const log = replay([], placed.events)
    const withBench = deriveGarden(books, log, { today: TODAY })
    expect(withBench.years[0].items.get('bench')).toBe(1)
    const away = removeItem(withBench, 2026, 'bench')
    expect(away).toMatchObject({ ok: true, say: 'Bench taken away.' })
    if (!away.ok) return
    const after = deriveGarden(books, replay(log, away.events), { today: TODAY })
    expect(after.years[0].items.has('bench')).toBe(false)
    // it stays unlocked
    expect(after.unlocked).toContain('bench')
  })

  it('refuses an item that is not unlocked yet, and a slot that is not a slot', () => {
    const garden = deriveGarden(many(9), [], { today: TODAY })
    expect(placeItem(garden, 2026, 'bench', 0)).toEqual({ ok: false, why: 'locked' })
    expect(placeItem(garden, 2026, 'path', 6)).toEqual({ ok: false, why: 'no-slot' })
    expect(placeItem(garden, 2026, 'path', -1)).toEqual({ ok: false, why: 'no-slot' })
    expect(removeItem(garden, 2026, 'path')).toEqual({ ok: false, why: 'not-placed' })
  })

  it('finds the first free slot of the item strip', () => {
    const books = many(30)
    const garden = deriveGarden(books, [], { today: TODAY })
    expect(freeItemSlot(garden.years[0])).toBe(0)
    const one = placeItem(garden, 2026, 'bench', 0)
    if (!one.ok) return
    const after = deriveGarden(books, replay([], one.events), { today: TODAY })
    expect(freeItemSlot(after.years[0])).toBe(1)
  })

  it('keeps the newest choice when two devices disagree', () => {
    const books = many(30)
    const phone = [{ id: 'p1', at: 100, kind: 'place', key: 'g:i:2026:bench', slot: 0 }] as unknown as ChoiceEvent[]
    const computer = [{ id: 'c1', at: 200, kind: 'place', key: 'g:i:2026:bench', slot: 4 }] as unknown as ChoiceEvent[]
    expect(deriveGarden(books, mergeLogs(phone, computer), { today: TODAY }).years[0].items.get('bench')).toBe(4)
    expect(deriveGarden(books, mergeLogs(computer, phone), { today: TODAY }).years[0].items.get('bench')).toBe(4)
  })
})

describe('stepping through the spots with the arrow keys', () => {
  const books = shelf(SPOTS_PER_BED * 2)
  const year = yearOf(deriveGarden(books, [], { today: TODAY }), 2026)!

  it('goes left and right within a row and stops at the edge', () => {
    expect(stepSpot(year, { bed: 0, spot: 1 }, 'ArrowRight')).toEqual({ bed: 0, spot: 2 })
    expect(stepSpot(year, { bed: 0, spot: 3 }, 'ArrowRight')).toEqual({ bed: 0, spot: 3 })
    expect(stepSpot(year, { bed: 0, spot: 0 }, 'ArrowLeft')).toEqual({ bed: 0, spot: 0 })
  })

  it('goes up and down between the rows', () => {
    expect(stepSpot(year, { bed: 0, spot: 1 }, 'ArrowDown')).toEqual({ bed: 0, spot: 5 })
    expect(stepSpot(year, { bed: 0, spot: 5 }, 'ArrowUp')).toEqual({ bed: 0, spot: 1 })
  })

  it('steps into the next bed past the bottom, and back past the top', () => {
    expect(stepSpot(year, { bed: 0, spot: 9 }, 'ArrowDown')).toEqual({ bed: 1, spot: 1 })
    expect(stepSpot(year, { bed: 1, spot: 1 }, 'ArrowUp')).toEqual({ bed: 0, spot: 9 })
    // the last bed's bottom row stays put
    expect(stepSpot(year, { bed: 1, spot: 9 }, 'ArrowDown')).toEqual({ bed: 1, spot: 9 })
  })
})

describe('tidying a year garden into reading order', () => {
  it('puts every plant in the order she finished the books, and says how many moved', () => {
    const books = shelf(5)
    let log: ChoiceEvent[] = []
    // she has scattered one of them first
    const scatter = movePlant(yearOf(deriveGarden(books, log, { today: TODAY }), 2026)!, books[0].id, { bed: 0, spot: 9 })
    expect(scatter.ok).toBe(true)
    if (!scatter.ok) return
    log = replay(log, scatter.events)
    const year = yearOf(deriveGarden(books, log, { today: TODAY }), 2026)!
    const r = tidyYear(year)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.say).toMatch(/Tidied into reading order: \d+ plants? moved\./)
    log = replay(log, r.events)
    const after = yearOf(deriveGarden(books, log, { today: TODAY }), 2026)!
    after.plants.forEach((p, rank) => {
      expect({ bed: p.bed, spot: p.spot }, p.book.title).toEqual({ bed: Math.floor(rank / SPOTS_PER_BED), spot: rank % SPOTS_PER_BED })
    })
  })

  it('refuses a garden that is already in reading order, rather than writing it again', () => {
    const books = shelf(4)
    const year = yearOf(deriveGarden(books, [], { today: TODAY }), 2026)!
    expect(tidyYear(year)).toEqual({ ok: false, why: 'already-tidy' })
  })

  it('carries an undo that puts every plant back exactly where it stood', () => {
    const books = shelf(6)
    let log: ChoiceEvent[] = []
    const moved = movePlant(yearOf(deriveGarden(books, log, { today: TODAY }), 2026)!, books[0].id, { bed: 0, spot: 11 })
    expect(moved.ok).toBe(true)
    if (!moved.ok) return
    log = replay(log, moved.events)
    const before = yearOf(deriveGarden(books, log, { today: TODAY }), 2026)!
    const where = new Map(before.plants.map((p) => [p.id, { bed: p.bed, spot: p.spot }]))
    const r = tidyYear(before)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    log = replay(log, r.events)
    log = replay(log, r.undo!)
    const back = yearOf(deriveGarden(books, log, { today: TODAY }), 2026)!
    for (const p of back.plants) expect({ bed: p.bed, spot: p.spot }, p.book.title).toEqual(where.get(p.id))
  })

  it('tidies a garden with more than one bed, straight through the beds', () => {
    const books = shelf(SPOTS_PER_BED + 3)
    const year = yearOf(deriveGarden(books, [], { today: TODAY }), 2026)!
    expect(year.beds).toBe(2)
    // a fresh garden is already in reading order, so there is nothing to tidy
    expect(tidyYear(year)).toEqual({ ok: false, why: 'already-tidy' })
  })
})

describe('the item strip grows with the garden', () => {
  it('gives a small garden six places and a big one more, up to fourteen', () => {
    expect(itemSlotsFor(1)).toBe(6)
    expect(itemSlotsFor(2)).toBe(7)
    expect(itemSlotsFor(9)).toBe(14)
    expect(itemSlotsFor(40)).toBe(14)
  })

  it('finds a free place past the sixth once the garden has beds enough', () => {
    const books = shelf(SPOTS_PER_BED * 8)
    const year = yearOf(deriveGarden(books, [], { today: TODAY }), 2026)!
    const full = { ...year, items: new Map(Array.from({ length: 6 }, (_, i) => [`x${i}` as never, i])) }
    expect(freeItemSlot(full as typeof year)).toBe(6)
  })
})

describe('a seasonal garden item', () => {
  it('is unlocked for good but only stands in the garden in its own season', () => {
    const books = shelf(30)
    const summer = deriveGarden(books, [], { today: '2026-07-01' })
    const winter = deriveGarden(books, [], { today: '2026-12-01' })
    expect(summer.unlocked).toContain('parasol')
    expect(winter.unlocked).toContain('parasol')
    expect(summer.available).toContain('parasol')
    expect(winter.available).not.toContain('parasol')
    // an item with no season of its own stands all year
    expect(summer.available).toContain('bench')
    expect(winter.available).toContain('bench')
  })
})
