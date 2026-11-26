import { describe, expect, it } from 'vitest'
import type { Book } from '../library'
import { addDays } from '../creatures/days'
import type { ChoiceEvent } from '../creatures/choices'
import { deriveGarden, freeSpots, growthOf, readingDayList, scaleOf, stageOf, startYear, visitorsFor, yearOf } from './garden'
import { EARLIER_YEAR, GROW_READING_DAYS, SPOTS_PER_BED } from './numbers'
import type { GardenItemId } from './numbers'
import { itemKey, plantKey } from './spots'
import { weatherOf } from './weather'

/**
 * The garden worked out from her shelf (T-0060, D-0050): every count here is
 * her garden, so each rule has a test (D-0050 Consequences).
 */

let next = 0
const book = (over: Partial<Book> = {}): Book => ({
  id: `b${next++}`,
  title: 'A book',
  authors: [],
  color: '#333',
  status: 'read',
  addedAt: next,
  ...over,
})

/** A book finished on a day, read `reads` times; she read it on its finish day, as the app notes. */
const finished = (day: string, over: Partial<Book> = {}, reads = 1): Book =>
  book({
    status: 'read',
    finished: Array.from({ length: reads }, (_, i) => (i === 0 ? day : addDays(day, 30 * i))),
    readCount: reads,
    readingLog: { [day]: 0.3 },
    ...over,
  })

const log = (...events: Array<Partial<ChoiceEvent> & { key: string }>): ChoiceEvent[] =>
  events.map((e, i) => ({ id: `e${i}`, at: 1000 + i, kind: 'place', ...e }) as ChoiceEvent)

const TODAY = '2026-11-23'

describe('which books become plants', () => {
  it('gives every finished book one plant', () => {
    const g = deriveGarden([finished('2026-03-02'), finished('2026-04-05')], [], { today: TODAY })
    expect(g.plants).toBe(2)
    expect(yearOf(g, 2026)!.plants).toHaveLength(2)
  })

  it('gives a book she put aside without finishing no plant', () => {
    const g = deriveGarden([book({ status: 'dnf', progress: 0.4 }), book({ status: 'reading' }), book({ status: 'want' })], [], { today: TODAY })
    expect(g.plants).toBe(0)
    expect(g.years).toHaveLength(0)
  })

  it('keeps the plant of a book she finished and then put aside again', () => {
    const g = deriveGarden([finished('2026-05-05', { status: 'dnf' })], [], { today: TODAY })
    expect(g.plants).toBe(1)
  })

  it('loses the plant when the book is removed from the shelf', () => {
    const b = finished('2026-05-05')
    expect(deriveGarden([b], [], { today: TODAY }).plants).toBe(1)
    expect(deriveGarden([], [], { today: TODAY }).plants).toBe(0)
  })

  it('makes one bigger plant of a re-read, never a second plant', () => {
    const g = deriveGarden([finished('2026-02-02', {}, 3)], [], { today: TODAY })
    const year = yearOf(g, 2026)!
    expect(year.plants).toHaveLength(1)
    expect(year.plants[0].reads).toBe(3)
    const once = deriveGarden([finished('2026-02-02')], [], { today: TODAY }).years[0].plants[0]
    expect(year.plants[0].scale).toBeGreaterThan(once.scale)
  })

  it('marks a sleep read as night-blooming and lets it flower in every season', () => {
    const g = deriveGarden([finished('2026-12-05', { sleepRead: true, genres: ['Fantasy'], pages: 700 })], [], { today: '2026-12-20' })
    const plant = g.years[0].plants[0]
    expect(plant.night).toBe(true)
    expect(plant.blooming).toBe(true)
    expect(plant.kind.id).toBe('oak')
  })

  it('puts a finish with no day at all in the garden of its own', () => {
    const g = deriveGarden([book({ status: 'read', readCount: 1 })], [], { today: TODAY })
    expect(g.years.map((y) => y.year)).toEqual([EARLIER_YEAR])
    expect(g.years[0].label).toBe('Earlier')
    expect(g.years[0].plants[0].growth).toBe(1)
  })

  it('puts the years newest first with Earlier last', () => {
    const g = deriveGarden(
      [finished('2024-01-01'), finished('2026-01-01'), book({ status: 'read', readCount: 1 }), finished('2025-01-01')],
      [],
      { today: TODAY },
    )
    expect(g.years.map((y) => y.year)).toEqual([2026, 2025, 2024, EARLIER_YEAR])
  })

  it('puts a plant in the year of its first finish, also when it was read again later', () => {
    const b = book({ status: 'read', finished: ['2024-06-01', '2026-06-01'], readCount: 2 })
    const g = deriveGarden([b], [], { today: TODAY })
    expect(g.years.map((y) => y.year)).toEqual([2024])
    expect(g.years[0].plants[0].reads).toBe(2)
  })
})

describe('growing', () => {
  const days = (from: string, n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [addDays(from, i + 1), 0.05]))

  it('starts a plant as a sprout on the day the book was finished', () => {
    const b = finished('2026-11-20', { readingLog: { '2026-11-19': 0.5, '2026-11-20': 0.5 } })
    const g = deriveGarden([b], [], { today: '2026-11-20' })
    const plant = g.years[0].plants[0]
    expect(plant.growth).toBe(0)
    expect(plant.stage).toBe('sprout')
    expect(plant.scale).toBeLessThan(0.4)
  })

  it('grows it on each day she reads and reaches full size after enough of them', () => {
    const since = '2026-01-10'
    const other = book({ status: 'reading', readingLog: { [since]: 0.2, ...days(since, GROW_READING_DAYS) } })
    const g = deriveGarden([finished(since, { readingLog: { [since]: 0.3 } }), other], [], { today: TODAY })
    const plant = g.years[0].plants.find((p) => p.since === since)!
    expect(plant.growth).toBe(1)
    expect(plant.stage).toBe('grown')
  })

  it('pauses on the days she reads nothing: only reading days count, however far apart', () => {
    const since = '2026-01-10'
    const close = { '2026-01-11': 0.2, '2026-01-12': 0.2, '2026-01-13': 0.2 }
    const apart = { '2026-02-11': 0.2, '2026-05-12': 0.2, '2026-09-13': 0.2 }
    const one = deriveGarden([finished(since), book({ status: 'reading', readingLog: close })], [], { today: TODAY })
    const two = deriveGarden([finished(since), book({ status: 'reading', readingLog: apart })], [], { today: TODAY })
    // three reading days after the finish, whether they are three days or three months apart
    expect(one.years[0].plants[0].growth).toBe(two.years[0].plants[0].growth)
    expect(one.years[0].plants[0].growth).toBeCloseTo(3 / GROW_READING_DAYS)
  })

  it('never shrinks: more reading only ever grows it, and nothing can take growth away', () => {
    expect(growthOf('2026-01-01', [])).toBe(1)
    expect(growthOf('2026-01-01', ['2026-01-02'])).toBeCloseTo(1 / GROW_READING_DAYS)
    expect(growthOf('2026-01-01', ['2026-01-02', '2026-01-03'])).toBeCloseTo(2 / GROW_READING_DAYS)
    expect(growthOf(undefined, ['2026-01-02'])).toBe(1)
    // a book the app never noted her reading: finished before the log existed
    expect(growthOf('2019-01-01', ['2026-01-02'], false)).toBe(1)
  })

  it('starts a book finished before her reading log was kept fully grown', () => {
    const b = finished('2019-04-04', { readingLog: undefined })
    const other = book({ status: 'reading', readingLog: { '2026-01-02': 0.3 } })
    const g = deriveGarden([b, other], [], { today: TODAY })
    expect(g.years.find((y) => y.year === 2019)!.plants[0].growth).toBe(1)
  })

  it('reads every day she read something, oldest first', () => {
    const list = readingDayList([book({ readingLog: { '2026-02-02': 0.2, '2026-01-01': 0 } }), book({ readingLog: { '2026-01-05': 0.1 } })])
    expect(list).toEqual(['2026-01-05', '2026-02-02'])
  })

  it('has three stages and a size that goes with them', () => {
    expect(stageOf(0)).toBe('sprout')
    expect(stageOf(0.5)).toBe('young')
    expect(stageOf(1)).toBe('grown')
    expect(scaleOf(1, 1)).toBeCloseTo(1)
    expect(scaleOf(1, 10)).toBeGreaterThan(scaleOf(1, 2))
    // the cap: a fifth read is as big as it gets
    expect(scaleOf(1, 20)).toBe(scaleOf(1, 5))
  })
})

describe('beds', () => {
  it('gives an empty year garden one bed and no plants', () => {
    const g = deriveGarden([finished('2026-01-01')], [], { today: TODAY })
    expect(g.years[0].beds).toBe(1)
    expect(freeSpots(g.years[0], 0)).toHaveLength(SPOTS_PER_BED - 1)
  })

  it('gives 114 plants in one year ten beds, with every plant on a spot of its own', () => {
    const books = Array.from({ length: 114 }, (_, i) => finished(addDays('2026-01-01', i)))
    const g = deriveGarden(books, [], { today: TODAY })
    const year = yearOf(g, 2026)!
    expect(year.plants).toHaveLength(114)
    expect(year.beds).toBe(10)
    const spots = new Set(year.plants.map((p) => `${p.bed}:${p.spot}`))
    expect(spots.size).toBe(114)
    for (const p of year.plants) expect(p.bed).toBeLessThan(year.beds)
  })

  it('unlocks the next bed exactly when the spots run out', () => {
    const at = (n: number) => deriveGarden(Array.from({ length: n }, (_, i) => finished(addDays('2026-01-01', i))), [], { today: TODAY }).years[0].beds
    expect(at(SPOTS_PER_BED)).toBe(1)
    expect(at(SPOTS_PER_BED + 1)).toBe(2)
    expect(at(SPOTS_PER_BED * 2)).toBe(2)
    expect(at(SPOTS_PER_BED * 2 + 1)).toBe(3)
  })
})

describe('her own spots', () => {
  it('puts a plant where she put it', () => {
    const b = finished('2026-01-01')
    // the spots she once moved plants to are left in the log and no longer read (D-0071 §1)
    const g = deriveGarden([b], log({ key: plantKey(b.id), bed: 0, spot: 7 }), { today: TODAY })
    expect(g.years[0].plants[0]).toMatchObject({ bed: 0, spot: 0 })
  })

  it('ignores the place choices of the den, which in turn ignores the garden’s', () => {
    const b = finished('2026-01-01')
    const g = deriveGarden([b], log({ key: 'home:bed', item: 'bed-basket' }), { today: TODAY })
    expect(g.years[0].plants[0].spot).toBe(0)
  })

})

describe('garden items and visitors', () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => finished(addDays('2026-01-01', i), { genres: ['Romance'], pages: 300 }))

  it('unlocks the items by finished books all time, and never takes one back', () => {
    expect(deriveGarden(many(4), [], { today: TODAY }).unlocked).toEqual([])
    expect(deriveGarden(many(5), [], { today: TODAY }).unlocked).toEqual(['path'])
    expect(deriveGarden(many(25), [], { today: TODAY }).unlocked).toEqual(['path', 'bench', 'birdbath', 'seedlings', 'pond'])
    expect(deriveGarden(many(50), [], { today: TODAY }).unlocked).toHaveLength(9)
  })

  it('says what is next to unlock and how far off it is', () => {
    expect(deriveGarden(many(19), [], { today: TODAY }).next).toMatchObject({ item: 'seedlings', books: 20, toGo: 1 })
    expect(deriveGarden(many(50), [], { today: TODAY }).next).toMatchObject({ item: 'snowman', books: 60, toGo: 10 })
    expect(deriveGarden(many(300), [], { today: TODAY }).next).toBeNull()
  })

  it('shows an item she has placed in that year garden only', () => {
    const books = many(30)
    const g = deriveGarden(books, log({ key: itemKey(2026, 'bench'), slot: 2 }), { today: TODAY })
    expect(g.years[0].items.get('bench')).toBe(2)
    expect(deriveGarden(books, log({ key: itemKey(2025, 'bench'), slot: 2 }), { today: TODAY }).years[0].items.size).toBe(0)
  })

  it('takes an item away again when the newest choice says so', () => {
    const books = many(30)
    const g = deriveGarden(
      books,
      log({ key: itemKey(2026, 'bench'), slot: 2 }, { key: itemKey(2026, 'bench'), slot: 2, off: 1 }),
      { today: TODAY },
    )
    expect(g.years[0].items.has('bench')).toBe(false)
  })

  it('brings no visitors to an empty garden and bees once enough is in bloom', () => {
    const none = new Map<GardenItemId, number>()
    expect(visitorsFor(0, 0, none)).toEqual({ bees: 0, butterflies: 0, birds: 0 })
    expect(visitorsFor(4, 4, none).bees).toBe(1)
    expect(visitorsFor(8, 8, none)).toMatchObject({ bees: 2, butterflies: 1 })
  })

  it('brings birds with a birdbath or a pond, and never more visitors than the cap', () => {
    expect(visitorsFor(20, 20, new Map([['birdbath', 0]])).birds).toBe(2)
    const full = visitorsFor(200, 200, new Map([['pond', 1]]))
    expect(full.bees + full.butterflies + full.birds).toBeLessThanOrEqual(6)
    const phone = visitorsFor(200, 200, new Map([['pond', 1]]), true)
    expect(phone.bees + phone.butterflies + phone.birds).toBeLessThanOrEqual(3)
    expect(phone.birds).toBeGreaterThan(0)
  })
})

describe('which garden opens first', () => {
  it('is this year when she finished something in it, else the newest', () => {
    const g = deriveGarden([finished('2024-01-01'), finished('2026-01-01')], [], { today: TODAY })
    expect(startYear(g)).toBe(2026)
    const old = deriveGarden([finished('2024-01-01')], [], { today: TODAY })
    expect(startYear(old)).toBe(2024)
    expect(startYear(deriveGarden([], [], { today: TODAY }))).toBeNull()
  })
})

describe('the garden and the creatures never meet', () => {
  it('reads nothing of the creatures and writes nothing to them', () => {
    const b = finished('2026-01-01')
    const creatureLog = log({ key: 'home:bed', item: 'bed-basket' }) as ChoiceEvent[]
    creatureLog.push({ id: 'h1', at: 1, kind: 'hatch', egg: 'welcome', species: 'cat' } as ChoiceEvent)
    creatureLog.push({ id: 'f1', at: 2, kind: 'feed', pet: 'welcome', amount: 5 } as ChoiceEvent)
    const g = deriveGarden([b], creatureLog, { today: TODAY })
    expect(g.plants).toBe(1)
    expect(JSON.stringify(g)).not.toContain('cookie')
  })
})

describe('a more alive garden (D-0083)', () => {
  it('has the weather of the day, the same on every device', () => {
    const g = deriveGarden([finished('2026-04-02')], [], { today: '2026-04-12' })
    expect(g.weather).toBe(weatherOf('2026-04-12'))
    expect(deriveGarden([finished('2026-04-02')], [], { today: '2026-04-12' }).weather).toBe(g.weather)
  })

  it('lets her look at another weather without anything being saved', () => {
    const books = [finished('2026-04-02')]
    const g = deriveGarden(books, [], { today: '2026-04-12', weather: 'snow' })
    expect(g.weather).toBe('snow')
    // the look changes the sky and nothing else
    const real = deriveGarden(books, [], { today: '2026-04-12' })
    expect(g.years[0].plants.map((p) => p.id)).toEqual(real.years[0].plants.map((p) => p.id))
  })

  it('brings scenery with her reading, and says what is on its way', () => {
    const few = deriveGarden([finished('2026-01-01'), finished('2026-02-01')], [], { today: TODAY })
    expect(few.scenery).toEqual([])
    expect(few.nextScenery?.id).toBe('hedge')
    const more = deriveGarden(
      Array.from({ length: 12 }, (_, i) => finished(addDays('2026-01-01', i * 3))),
      [],
      { today: TODAY },
    )
    expect(more.scenery).toContain('hedge')
    expect(more.scenery).toContain('fence')
  })

  it('saves nothing for the scenery: the same shelf gives the same scenery whatever the log holds', () => {
    const books = Array.from({ length: 5 }, (_, i) => finished(addDays('2026-01-01', i * 3)))
    expect(deriveGarden(books, [], { today: TODAY }).scenery).toEqual(
      deriveGarden(books, log({ key: itemKey(2026, 'pond'), slot: 1 }), { today: TODAY }).scenery,
    )
  })

  it('gives today’s kindnesses to the garden she is reading in', () => {
    const books = [finished(`${TODAY.slice(0, 4)}-01-01`, { genres: ['Non-fiction'] })]
    const kind = log({ key: 'g:k:water', day: TODAY }, { key: 'g:k:seed', day: TODAY })
    const plain = deriveGarden(books, [], { today: TODAY })
    const tended = deriveGarden(books, kind, { today: TODAY })
    expect([...tended.kindness].sort()).toEqual(['seed', 'water'])
    expect(tended.years[0].blooming).toBe(plain.years[0].blooming + 1)
    expect(tended.years[0].visitors.birds).toBe(plain.years[0].visitors.birds + 1)
  })

  it('costs nothing to ignore: yesterday’s watering changes nothing today', () => {
    const books = [finished(`${TODAY.slice(0, 4)}-01-01`)]
    const old = log({ key: 'g:k:water', day: addDays(TODAY, -1) })
    expect(deriveGarden(books, old, { today: TODAY }).years[0].blooming).toBe(
      deriveGarden(books, [], { today: TODAY }).years[0].blooming,
    )
    expect(deriveGarden(books, old, { today: TODAY }).kindness).toEqual([])
  })
})
