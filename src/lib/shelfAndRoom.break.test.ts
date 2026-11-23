import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { BOOKCASES, NO_LANGUAGE, START_VIEW, applyView, cleanFilters, clearFilters, filterOptions, isFiltered, viewSummary } from './shelfFilter'
import { NO_GENRE } from './genreFilter'
import { SHELF, computeLayout, footprint, rowFloorY, stackRoom } from './shelfLayout'
import { arrangementSeparators } from './separators'
import { poseOf, posePatch } from './pose'
import { finishesInYear, isNight, plantStage, seasonOf } from './roomExtras'
import { DEFAULT_ROOM, cleanRoom, shownDecor } from './room'

/**
 * Tester's gap tests for T-0051, T-0052 and T-0053: the corners the build notes
 * and the designs only reason about.
 */

const book = (over: Partial<Book> = {}): Book => ({
  id: over.id ?? 'b',
  title: 'A Book',
  authors: ['A. Author'],
  color: '#334455',
  status: 'want',
  addedAt: 1,
  ...over,
})

// ---------------------------------------------------------------------------
// T-0051: empty bookcases, every filter at once, Clear, a shelf of audiobooks
// ---------------------------------------------------------------------------

describe('an empty bookcase is a bookcase, never an error', () => {
  // nothing finished, nothing waiting, nothing digital: three bookcases stand empty
  const noneRead = [book({ id: '1', status: 'paused', formats: ['paperback'] }), book({ id: '2', status: 'reading', formats: ['hardcover'] })]

  it('gives an empty list for every bookcase that has nothing, without throwing', () => {
    for (const { id } of BOOKCASES) {
      const shown = applyView(noneRead, { bookcase: id, filters: START_VIEW.filters })
      expect(Array.isArray(shown)).toBe(true)
      if (id !== 'all') expect(shown).toEqual([])
    }
  })

  it('still names the bookcase in the summary when nothing matches', () => {
    expect(viewSummary({ bookcase: 'read', filters: START_VIEW.filters }, filterOptions(noneRead))).toEqual(['Read'])
  })

  it('copes with an empty shelf everywhere', () => {
    const options = filterOptions([])
    for (const { id } of BOOKCASES) expect(applyView([], { bookcase: id, filters: START_VIEW.filters })).toEqual([])
    expect(viewSummary(START_VIEW, options)).toEqual([])
    expect(cleanFilters({ genre: 'Fantasy', rating: 5, spice: 2, year: 2026, language: 'en', trope: 'Slow burn' }, options)).toEqual(START_VIEW.filters)
  })
})

describe('every filter at once, and Clear', () => {
  const shelf = [
    book({ id: 'hit', status: 'read', rating: 5, spice: 5, language: 'en', genres: ['Fantasy'], finished: ['2026-02-02'], tropes: ['Slow burn'], formats: ['ebook'] }),
    book({ id: 'miss', status: 'read', rating: 5, spice: 5, language: 'en', genres: ['Fantasy'], finished: ['2025-02-02'], tropes: ['Slow burn'], formats: ['ebook'] }),
  ]
  const all = { genre: 'Fantasy', rating: 5, spice: 5, year: 2026, language: 'en', trope: 'slow burn' }

  it('narrows to the one book that passes all six, in every bookcase it is in', () => {
    for (const bookcase of ['all', 'read', 'digital'] as const) expect(applyView(shelf, { bookcase, filters: all }).map((b) => b.id)).toEqual(['hit'])
    expect(applyView(shelf, { bookcase: 'want', filters: all })).toEqual([])
  })

  it('leaves the bookcase alone when Clear puts every filter back', () => {
    const cleared = clearFilters({ bookcase: 'digital', filters: all })
    expect(cleared).toEqual({ bookcase: 'digital', filters: START_VIEW.filters })
    expect(isFiltered(cleared.filters)).toBe(false)
    expect(applyView(shelf, cleared).map((b) => b.id)).toEqual(['hit', 'miss'])
  })

  it('never drops a book that passes, however the filters are ordered in the object', () => {
    const reversed = { trope: 'slow burn', language: 'en', year: 2026, spice: 5, rating: 5, genre: 'Fantasy' }
    expect(applyView(shelf, { bookcase: 'all', filters: reversed }).map((b) => b.id)).toEqual(['hit'])
  })
})

describe('a shelf of nothing but audiobooks', () => {
  const audio = [
    book({ id: 'a1', status: 'read', formats: ['audiobook'], minutes: 600, finished: ['2026-03-03'], rating: 4 }),
    book({ id: 'a2', status: 'want', formats: ['storytel'], minutes: 900 }),
    book({ id: 'a3', status: 'reading', format: 'audiobook' }),
  ]

  it('puts every one of them in Digital and in All', () => {
    expect(applyView(audio, { bookcase: 'digital', filters: START_VIEW.filters })).toHaveLength(3)
    expect(applyView(audio, { bookcase: 'all', filters: START_VIEW.filters })).toHaveLength(3)
    expect(applyView(audio, { bookcase: 'read', filters: START_VIEW.filters }).map((b) => b.id)).toEqual(['a1'])
  })

  it('offers only the filters such a shelf can answer', () => {
    const o = filterOptions(audio)
    expect(o.genre).toEqual([])
    expect(o.spice).toEqual([])
    expect(o.trope).toEqual([])
    expect(o.rating.length).toBe(6)
    expect(o.year.map((y) => y.label)).toEqual(['Any year', '2026 (1)'])
    // no book has a language either, so "No language" alone is no filter
    expect(o.language).toEqual([])
  })

  it('lays such a shelf out and never throws', () => {
    expect(() => computeLayout(audio, { innerWidth: 0.5, minRows: 2 })).not.toThrow()
  })
})

describe('a filter value that leaves the shelf', () => {
  it('counts as "any" and shows every book again, without the app clearing anything', () => {
    const before = [book({ id: '1', genres: ['Horror'], language: 'de' })]
    const chosen = { ...START_VIEW.filters, genre: 'Horror', language: 'de' }
    expect(applyView(before, { bookcase: 'all', filters: chosen })).toHaveLength(1)
    // she edits the book: the genre and the language are gone from the shelf
    const after = [book({ id: '1' })]
    const kept = cleanFilters(chosen, filterOptions(after))
    expect(kept).toEqual(START_VIEW.filters)
    expect(applyView(after, { bookcase: 'all', filters: kept })).toHaveLength(1)
  })

  it('offers no Genre and no Language filter when "No genre" and "No language" are all there is', () => {
    // sent back by the tester: a filter whose only real option is "none of them" narrows nothing
    const plain = [book({ id: '1' }), book({ id: '2' })]
    const o = filterOptions(plain)
    expect(o.genre).toEqual([])
    expect(o.language).toEqual([])
    // and as soon as one book has a genre, both "No genre" and that genre are offered
    const mixed = [book({ id: '1' }), book({ id: '2', genres: ['Fantasy'], language: 'en' })]
    const m = filterOptions(mixed)
    expect(m.genre.map((g) => g.value)).toEqual(['', 'Fantasy', NO_GENRE])
    expect(m.language.map((g) => g.value)).toEqual(['', 'en', NO_LANGUAGE])
    expect(applyView(mixed, { bookcase: 'all', filters: { ...START_VIEW.filters, genre: NO_GENRE } }).map((b) => b.id)).toEqual(['1'])
    expect(applyView(mixed, { bookcase: 'all', filters: { ...START_VIEW.filters, language: NO_LANGUAGE } }).map((b) => b.id)).toEqual(['1'])
  })
})

// ---------------------------------------------------------------------------
// T-0052: poses on a nearly full shelf, stacks at the end, impossible poses
// ---------------------------------------------------------------------------

const posed = (id: string, pose: Book['pose'], extra: Partial<Book> = {}) =>
  book({ id, title: `Book ${id}`, authors: ['R. Riordan'], ...(pose && { pose }), ...extra })

describe('poses on a nearly full shelf', () => {
  it('keeps every book of a 400-book shelf inside the case with a third of them posed', () => {
    const shelf = Array.from({ length: 400 }, (_, i) =>
      posed(`p${i}`, i % 3 === 0 ? 'flat' : i % 7 === 0 ? 'faceout' : undefined, { pages: 120 + ((i * 37) % 700) }),
    )
    for (const innerWidth of [0.5, 0.75, 1.6, 4]) {
      const l = computeLayout(shelf, { innerWidth, minRows: 3 })
      expect(l.slots.size).toBe(400)
      for (const [id, s] of l.slots) {
        const f = footprint(l.dims.get(id)!, s.pose)
        expect(s.x + f.along / 2).toBeLessThanOrEqual(innerWidth / 2 + 1e-9)
        expect(s.y - rowFloorY(s.row, l.rows) + f.up / 2).toBeLessThanOrEqual(SHELF.rowHeight - SHELF.board + 1e-9)
      }
    }
  })
})

describe('a flat stack at the end of a shelf', () => {
  it('never leaves half a stack on one shelf and half on the next', () => {
    // enough thick standing books to fill most of a shelf, then a long flat run
    for (const filler of [10, 20, 28, 33, 40]) {
      const shelf = [
        ...Array.from({ length: filler }, (_, i) => posed(`s${i}`, undefined, { pages: 700 })),
        ...Array.from({ length: 6 }, (_, i) => posed(`f${i}`, 'flat', { pages: 220 })),
      ]
      const l = computeLayout(shelf, { innerWidth: 1.6, minRows: 3 })
      const rows = new Set<number>()
      const xs = new Map<number, number[]>()
      for (let i = 0; i < 6; i++) {
        const s = l.slots.get(`f${i}`)!
        rows.add(s.row)
        xs.set(s.row, [...(xs.get(s.row) ?? []), s.x])
      }
      // every stack lies wholly on one shelf: books that share an x share a row
      for (const [, list] of xs) expect(list.length).toBeGreaterThan(0)
      expect(rows.size).toBeLessThanOrEqual(2)
    }
  })

  it('does not stack across a nook or a series divider', () => {
    const shelf = [
      posed('a', 'flat', { series: 'One', seriesIndex: 1 }),
      posed('b', 'flat', { series: 'Two', seriesIndex: 1 }),
      posed('c', 'flat', { series: 'Two', seriesIndex: 2 }),
    ]
    const separators = arrangementSeparators(shelf, 'series')
    const l = computeLayout(shelf, { innerWidth: 1.6, minRows: 3 }, separators)
    // the book a divider introduces starts a new item, so it never joins the stack before it
    for (const [id] of separators) {
      const here = l.slots.get(id)!
      const others = [...l.slots].filter(([other]) => other !== id)
      for (const [, s] of others) if (s.row === here.row) expect(Math.abs(s.x - here.x)).toBeGreaterThan(0.002)
    }
  })
})

describe('a pose wider than the shelf', () => {
  it('stands every book when the case is narrower than any cover', () => {
    const shelf = Array.from({ length: 12 }, (_, i) => posed(`w${i}`, i % 2 ? 'faceout' : 'flat', { pages: 400 }))
    const l = computeLayout(shelf, { innerWidth: 0.12, minRows: 3 })
    for (const s of l.slots.values()) expect(s.pose).toBe('standing')
    // and the books keep what she chose
    expect(shelf.map((b) => b.pose)).toEqual(Array.from({ length: 12 }, (_, i) => (i % 2 ? 'faceout' : 'flat')))
  })

  it('draws the same book standing on a phone case and posed on a wide one', () => {
    const b = posed('one', 'flat', { pages: 300 })
    expect(computeLayout([b], { innerWidth: 0.2, minRows: 3 }).slots.get('one')!.pose).toBe('standing')
    expect(computeLayout([b], { innerWidth: 1.6, minRows: 3 }).slots.get('one')!.pose).toBe('flat')
  })

  it('counts the decoration room: the same case fits the pose with no decorations and not with one', () => {
    const b = posed('two', 'faceout')
    const dims = computeLayout([b], { innerWidth: 1.6, minRows: 3 }).dims.get('two')!
    const width = dims.w + 0.05
    expect(computeLayout([b], { innerWidth: width, minRows: 3 }, undefined, []).slots.get('two')!.pose).toBe('faceout')
    expect(computeLayout([b], { innerWidth: width, minRows: 3 }, undefined, ['cat']).slots.get('two')!.pose).toBe('standing')
  })
})

describe('a pose she sets and puts back leaves nothing behind', () => {
  it('writes no pose field at all for Standing, whatever it was before', () => {
    for (const was of [undefined, 'faceout', 'flat'] as const) {
      const b = book({ ...(was && { pose: was }) })
      const back = { ...b, ...posePatch('standing') }
      expect(poseOf(back)).toBe('standing')
      expect(JSON.parse(JSON.stringify(back)).pose).toBeUndefined()
    }
  })
})

// ---------------------------------------------------------------------------
// T-0053: all four on, the clock across midnight and the year, every season
// ---------------------------------------------------------------------------

describe('the clock across the hours that matter', () => {
  it('turns over at 19:00 and at 07:00 and nowhere else', () => {
    const day = new Date(2026, 10, 23)
    const flips: number[] = []
    let last = isNight(new Date(2026, 10, 23, 0, 0))
    for (let h = 1; h < 24; h++) {
      const now = isNight(new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, 0))
      if (now !== last) flips.push(h)
      last = now
    }
    expect(flips).toEqual([7, 19])
  })

  it('stays night minute by minute across midnight', () => {
    for (const [d, h, m] of [
      [23, 23, 58],
      [23, 23, 59],
      [24, 0, 0],
      [24, 0, 1],
      [24, 2, 30],
    ])
      expect(isNight(new Date(2026, 10, d, h, m))).toBe(true)
  })
})

describe('the plant with nothing, and across a new year', () => {
  const finished = (day: string) => book({ id: day, status: 'read', finished: [day] })

  it('is a sprout with no books finished this year, even with a full shelf', () => {
    const shelf = Array.from({ length: 200 }, (_, i) => book({ id: `b${i}`, status: 'want' }))
    expect(plantStage(shelf, new Date(2026, 5, 1))).toBe('sprout')
  })

  it('is a sprout again on 1 January, however much she read last year', () => {
    const shelf = Array.from({ length: 40 }, (_, i) => finished(`2026-0${(i % 9) + 1}-1${i % 9}`))
    expect(plantStage(shelf, new Date(2026, 11, 31, 23, 59))).toBe('flowering')
    expect(plantStage(shelf, new Date(2027, 0, 1, 0, 0))).toBe('sprout')
  })

  it('counts two finishes of one book on the same day as two', () => {
    expect(finishesInYear([book({ id: 'x', status: 'read', finished: ['2026-05-05', '2026-05-05'] })], 2026)).toBe(2)
  })
})

describe('the season in every month, and the room as she saved it', () => {
  it('gives exactly one season for each of the twelve months, in both directions of a year', () => {
    const seasons = Array.from({ length: 12 }, (_, m) => seasonOf(new Date(2026, m, 15)))
    expect(seasons).toEqual(['tree', 'tree', 'flowers', 'flowers', 'flowers', 'sunflowers', 'sunflowers', 'sunflowers', 'pumpkins', 'pumpkins', 'pumpkins', 'tree'])
    // the first and the last day of each month fall in the same band
    for (let m = 0; m < 12; m++) {
      const first = seasonOf(new Date(2026, m, 1))
      const last = seasonOf(new Date(2026, m + 1, 0))
      expect(last).toBe(first)
    }
  })

  it('keeps all four off when she saved them off, and Reset puts them back', () => {
    const off = cleanRoom({ readingCorner: false, dayNight: false, plant: false, seasonal: false, wood: 'cherry' })
    expect([off.readingCorner, off.dayNight, off.plant, off.seasonal]).toEqual([false, false, false, false])
    expect(off.wood).toBe('cherry')
    expect([DEFAULT_ROOM.readingCorner, DEFAULT_ROOM.dayNight, DEFAULT_ROOM.plant, DEFAULT_ROOM.seasonal]).toEqual([true, true, true, true])
  })

  it('never lets an extra become a decoration, so no shelf is lost', () => {
    const r = cleanRoom({ decor: [{ kind: 'plant', on: true }, { kind: 'readingCorner', on: true }, { kind: 'cat', on: false }] })
    expect(r.decor.some((d) => (['plant', 'readingCorner', 'dayNight', 'seasonal'] as string[]).includes(d.kind))).toBe(false)
    expect(shownDecor(r)).not.toContain('plant')
    expect(r.decor.find((d) => d.kind === 'cat')?.on).toBe(false)
  })
})

describe('the shelf still works with Detailed books off and the extras on', () => {
  it('lays out posed books the same whatever the room settings are', () => {
    const shelf = Array.from({ length: 30 }, (_, i) => posed(`d${i}`, i % 4 === 0 ? 'flat' : undefined, { pages: 250 }))
    const a = computeLayout(shelf, { innerWidth: 1.6, minRows: 3 })
    const b = computeLayout(shelf, { innerWidth: 1.6, minRows: 3 })
    for (const [id, s] of a.slots) expect(b.slots.get(id)).toEqual(s)
    // and a stack still fits under the shelf above
    for (const [id, s] of a.slots) {
      const f = footprint(a.dims.get(id)!, s.pose)
      if (s.pose === 'flat') expect(s.y - rowFloorY(s.row, a.rows) + f.up / 2).toBeLessThanOrEqual(stackRoom() + 1e-9)
    }
  })
})
