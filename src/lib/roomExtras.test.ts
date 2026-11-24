import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { NIGHT_FROM, NIGHT_UNTIL, finishesInYear, isNight, lampLightOn, plantStage, roomLight, seasonOf } from './roomExtras'

/** The cosy room extras' own sums (T-0053, D-0045): the clock, the plant and the season. */

const at = (hour: number, minute = 0) => new Date(2026, 10, 23, hour, minute)
const book = (over: Partial<Book> = {}): Book => ({
  id: over.id ?? 'b',
  title: 'A Book',
  authors: ['A. Author'],
  color: '#334455',
  status: 'read',
  addedAt: 1,
  ...over,
})

describe('day and night (D-0045 §3)', () => {
  it('is night from 19:00 until 07:00', () => {
    expect(NIGHT_FROM).toBe(19)
    expect(NIGHT_UNTIL).toBe(7)
    for (const h of [19, 20, 23, 0, 3, 6]) expect(isNight(at(h))).toBe(true)
    for (const h of [7, 8, 12, 17, 18]) expect(isNight(at(h))).toBe(false)
  })

  it('stays night across midnight', () => {
    expect(isNight(at(23, 59))).toBe(true)
    expect(isNight(new Date(2026, 10, 24, 0, 0))).toBe(true)
    expect(isNight(at(6, 59))).toBe(true)
    expect(isNight(at(7, 0))).toBe(false)
    expect(isNight(at(18, 59))).toBe(false)
  })
})

describe('the plant grows with this year’s reading (D-0045 §4)', () => {
  const shelf = (finishes: string[]) => finishes.map((day, i) => book({ id: `b${i}`, finished: [day] }))
  const thisYear = (n: number) => shelf(Array.from({ length: n }, () => '2026-05-05'))

  it('is a sprout with nothing finished, and never an empty pot', () => {
    expect(plantStage([], at(12))).toBe('sprout')
    expect(plantStage(thisYear(0), at(12))).toBe('sprout')
  })

  it('takes its five steps at 1, 5, 15 and 30', () => {
    const steps: Array<[number, string]> = [
      [0, 'sprout'],
      [1, 'small'],
      [4, 'small'],
      [5, 'medium'],
      [14, 'medium'],
      [15, 'full'],
      [29, 'full'],
      [30, 'flowering'],
      [300, 'flowering'],
    ]
    for (const [n, stage] of steps) expect(plantStage(thisYear(n), at(12))).toBe(stage)
  })

  it('counts only this calendar year, and counts a re-read twice', () => {
    const books = [book({ id: 'a', finished: ['2025-12-31'] }), book({ id: 'b', finished: ['2026-01-01', '2026-06-06'] })]
    expect(finishesInYear(books, 2026)).toBe(2)
    expect(finishesInYear(books, 2025)).toBe(1)
    expect(finishesInYear(books, 2024)).toBe(0)
  })

  it('does not count a finish with no day', () => {
    expect(finishesInYear([book({ id: 'x', readCount: 3 })], 2026)).toBe(0)
  })
})

describe('the season’s decorations (D-0045 §5)', () => {
  const month = (m: number) => seasonOf(new Date(2026, m - 1, 15))

  it('gives her pumpkins, tree and flowers the months she asked for', () => {
    expect(month(10)).toBe('pumpkins')
    expect(month(12)).toBe('tree')
    for (const m of [3, 4, 5]) expect(month(m)).toBe('flowers')
  })

  it('covers every month of the year, each in exactly one band', () => {
    const bands: Record<string, number[]> = { pumpkins: [9, 10, 11], tree: [12, 1, 2], flowers: [3, 4, 5], sunflowers: [6, 7, 8] }
    const seen = new Set<number>()
    for (const [season, months] of Object.entries(bands))
      for (const m of months) {
        expect(month(m)).toBe(season)
        expect(seen.has(m)).toBe(false)
        seen.add(m)
      }
    expect(seen.size).toBe(12)
  })
})

describe('the evening light (D-0045 §3, §6)', () => {
  it('keeps the room bright by day and brings only the fill right down at night', () => {
    expect(roomLight(false)).toEqual({ dim: 1, key: 1 })
    const night = roomLight(true)
    expect(night.dim).toBeLessThan(0.5)
    // the key light keeps most of its strength, so the spines still read
    expect(night.key).toBeGreaterThan(0.5)
    expect(night.key).toBeLessThan(1)
  })

  it('lights the lamp only in the evening, only with the corner on, and never on a phone', () => {
    expect(lampLightOn({ night: true, readingCorner: true, lite: false })).toBe(true)
    expect(lampLightOn({ night: false, readingCorner: true, lite: false })).toBe(false)
    expect(lampLightOn({ night: true, readingCorner: false, lite: false })).toBe(false)
    expect(lampLightOn({ night: true, readingCorner: true, lite: true })).toBe(false)
    expect(lampLightOn({ night: false, readingCorner: true, lite: true })).toBe(false)
  })
})
