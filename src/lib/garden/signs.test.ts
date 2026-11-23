import { describe, expect, it } from 'vitest'
import type { Book } from '../library'
import type { Plant, YearGarden } from './garden'
import { daysBack, emptySpots, readingSigns, signsFor } from './signs'
import { SPOTS_PER_BED } from './numbers'

/** The little signs with a book's cover (T-0066, from Hanna). */

const plant = (id: string, since: string | undefined, cover?: string, bed = 0, spot = 0): Plant =>
  ({ id, since, bed, spot, book: { id, title: id, coverUrl: cover } }) as unknown as Plant

const year = (plants: Plant[], beds = 1, y = 2026): YearGarden => ({ year: y, beds, plants }) as unknown as YearGarden

const reading = (id: string, title = id, cover?: string): Book => ({ id, title, status: 'reading', coverUrl: cover }) as unknown as Book

const TODAY = '2026-11-23'

describe('the cover signs', () => {
  it('counts the days back to a finish day, and refuses what is not a day', () => {
    expect(daysBack(TODAY, '2026-11-23')).toBe(0)
    expect(daysBack(TODAY, '2026-11-01')).toBe(22)
    expect(daysBack(TODAY, undefined)).toBeNull()
    expect(daysBack(TODAY, 'someday')).toBeNull()
  })

  it('gives a sign to a book finished in the last month, and not to an older one', () => {
    const signs = signsFor(year([plant('new', '2026-11-20'), plant('old', '2026-01-02', undefined, 0, 1)]), TODAY)
    expect(signs.map((s) => s.id)).toEqual(['new'])
    expect(signs[0].reading).toBe(false)
  })

  it('never gives a sign to a plant with no finish day at all', () => {
    expect(signsFor(year([plant('earlier', undefined)]), TODAY)).toEqual([])
  })

  it('puts the most recently finished first, and stops at the cap', () => {
    const plants = Array.from({ length: 12 }, (_, i) => plant(`p${i}`, `2026-11-${String(10 + i).padStart(2, '0')}`, undefined, 0, i))
    const signs = signsFor(year(plants), TODAY)
    expect(signs).toHaveLength(8)
    expect(signs[0].id).toBe('p11')
    expect(signs[7].id).toBe('p4')
  })

  it('carries the cover when the book has one, and a blank sign when it has not', () => {
    const signs = signsFor(
      year([plant('withcover', '2026-11-21', 'https://example.test/c.jpg'), plant('bare', '2026-11-20', undefined, 0, 1)]),
      TODAY,
    )
    expect(signs.find((s) => s.id === 'withcover')?.cover).toBe('https://example.test/c.jpg')
    expect(signs.find((s) => s.id === 'bare')?.cover).toBeUndefined()
  })

  it('ignores a finish day in the future (a clock that is a day out)', () => {
    expect(signsFor(year([plant('ahead', '2026-11-30')]), TODAY)).toEqual([])
  })
})

describe('a sign for the book she is reading now', () => {
  const half = year([plant('a', '2026-11-20', undefined, 0, 0), plant('b', '2026-11-21', undefined, 0, 1)])

  it('lists the empty spots of the garden, bed by bed', () => {
    const spots = emptySpots(half)
    expect(spots).toHaveLength(SPOTS_PER_BED - 2)
    expect(spots[0]).toEqual({ bed: 0, spot: 2 })
  })

  it('stands on the first empty spot, marked as being read', () => {
    const signs = readingSigns([reading('now', 'What She Is Reading')], half, TODAY)
    expect(signs).toHaveLength(1)
    expect(signs[0]).toMatchObject({ id: 'now', bed: 0, spot: 2, reading: true })
  })

  it('never puts two signs on one spot, and never more than the cap', () => {
    const many = Array.from({ length: 6 }, (_, i) => reading(`r${i}`, `Book ${i}`))
    const signs = readingSigns(many, half, TODAY)
    expect(signs).toHaveLength(3)
    expect(new Set(signs.map((s) => `${s.bed}:${s.spot}`)).size).toBe(3)
  })

  it('shows nothing in an older year, where there is no reading to come', () => {
    expect(readingSigns([reading('now')], year([plant('a', '2019-05-05')], 1, 2019), TODAY)).toEqual([])
  })

  it('ignores books she is not reading right now', () => {
    const shelf = [{ id: 'want', title: 'Later', status: 'want' } as unknown as Book, reading('now')]
    expect(readingSigns(shelf, half, TODAY).map((s) => s.id)).toEqual(['now'])
  })

  it('stops when the garden has no empty spot left', () => {
    const full = year(Array.from({ length: SPOTS_PER_BED }, (_, i) => plant(`p${i}`, '2026-11-20', undefined, 0, i)))
    expect(readingSigns([reading('now')], full, TODAY)).toEqual([])
  })
})
