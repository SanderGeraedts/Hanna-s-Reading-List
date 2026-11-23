import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { WORLD_GOAL, worldChallenge, worldCountries } from './worldChallenge'

/** Around the world (T-0091, D-0061 §1). */

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['A. Writer'],
  color: '#888888',
  status: 'read',
  readCount: 1,
  addedAt: 0,
  ...extra,
})

const set = (id: string, day: string, places: string[], extra: Partial<Book> = {}) =>
  book(id, { finished: [day], places, ...extra })

const TWELVE = [
  'Japan',
  'Italy',
  'Ireland',
  'Mexico',
  'Nigeria',
  'Peru',
  'France',
  'Germany',
  'Spain',
  'Greece',
  'Egypt',
  'India',
]

describe('around the world', () => {
  it('needs 12 different countries in one year', () => {
    const shelf = TWELVE.map((c, i) => set(`b${i}`, `2026-0${(i % 9) + 1}-01`, [c]))
    const w = worldChallenge(shelf, 2026)
    expect(w.goal).toBe(WORLD_GOAL)
    expect(w.done).toBe(12)
    expect(w.complete).toBe(true)
    expect(worldChallenge(shelf.slice(0, 11), 2026).complete).toBe(false)
  })

  it('counts one country once, however many books are set there', () => {
    const shelf = [set('a', '2026-01-01', ['Japan']), set('b', '2026-02-01', ['Japan']), set('c', '2026-03-01', ['Italy'])]
    expect(worldCountries(shelf, 2026).map((c) => c.country)).toEqual(['Japan', 'Italy'])
  })

  it('counts nothing for a book with no places, an empty list, or only imaginary ones', () => {
    const shelf = [
      book('none', { finished: ['2026-01-01'] }),
      set('empty', '2026-02-01', []),
      set('dream', '2026-03-01', ['Hogwarts School of Witchcraft and Wizardry (Imaginary place)']),
    ]
    expect(worldCountries(shelf, 2026)).toEqual([])
  })

  it('leaves out sleep reads', () => {
    const shelf = [set('sleep', '2026-01-01', ['Japan'], { sleepRead: true }), set('a', '2026-02-01', ['Italy'])]
    expect(worldCountries(shelf, 2026).map((c) => c.country)).toEqual(['Italy'])
  })

  it('only counts the challenge year, and a book finished twice counts once', () => {
    const shelf = [set('old', '2025-06-01', ['Japan']), set('twice', '2026-01-01', ['Italy'], { finished: ['2025-01-01', '2026-01-01'], readCount: 2 })]
    expect(worldCountries(shelf, 2026).map((c) => c.country)).toEqual(['Italy'])
    expect(worldCountries(shelf, 2025).map((c) => c.country).sort()).toEqual(['Italy', 'Japan'])
  })

  it('gives a stable order, with the book that first brought each country', () => {
    const shelf = [set('late', '2026-05-01', ['Italy']), set('early', '2026-02-01', ['Japan', 'Italy'])]
    const got = worldCountries(shelf, 2026)
    expect(got.map((c) => c.country)).toEqual(['Japan', 'Italy'])
    expect(got.map((c) => c.book.id)).toEqual(['early', 'early'])
    expect(worldCountries(shelf, 2026)).toEqual(got)
  })

  it('an empty shelf is 0 of 12, not a crash', () => {
    expect(worldChallenge([], 2026)).toEqual({ countries: [], done: 0, goal: 12, complete: false })
  })
})
