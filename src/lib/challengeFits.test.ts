import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import type { OwnChallenge } from './ownChallenges'
import { FIT_MAX, ownFits, ownNone, pileOf, seasonFits, seasonNone, worldFits, worldNone } from './challengeFits'

/** Books from her own pile that would fit a challenge (T-0066, from Hanna). */

const TODAY = '2026-11-23'
let n = 0
const book = (over: Partial<Book> = {}): Book =>
  ({
    id: `b${n++}`,
    title: `Book ${n}`,
    authors: ['An Author'],
    color: '#333',
    status: 'want',
    addedAt: n,
    ...over,
  }) as Book

describe('the pile a suggestion may come from', () => {
  it('leaves out a book she has already read', () => {
    const read = book({ status: 'read', finished: ['2026-01-01'] })
    expect(pileOf([read, book({ status: 'reading' })], TODAY).map((b) => b.id)).not.toContain(read.id)
  })

  it('puts what she is reading before what she is only planning', () => {
    const want = book({ status: 'want', title: 'A' })
    const reading = book({ status: 'reading', title: 'Z' })
    expect(pileOf([want, reading], TODAY)[0].id).toBe(reading.id)
  })
})

describe('a book for the world challenge', () => {
  it('offers a book set in a country she has not read this year', () => {
    const read = book({ status: 'read', finished: ['2026-02-02'], places: ['France'] })
    const next = book({ status: 'reading', places: ['Peru'] })
    const fits = worldFits([read, next], 2026, TODAY)
    expect(fits).toHaveLength(1)
    expect(fits[0].book.id).toBe(next.id)
    expect(fits[0].why).toBe('Set in Peru')
  })

  it('never offers a country she has already read this year', () => {
    const read = book({ status: 'read', finished: ['2026-02-02'], places: ['France'] })
    expect(worldFits([read, book({ status: 'reading', places: ['France'] })], 2026, TODAY)).toEqual([])
  })

  it('offers three different countries, not three books about one', () => {
    const shelf = ['Peru', 'Peru', 'Japan', 'Kenya', 'Brazil'].map((p) => book({ status: 'reading', places: [p] }))
    const fits = worldFits(shelf, 2026, TODAY)
    expect(fits).toHaveLength(FIT_MAX)
    expect(new Set(fits.map((f) => f.why)).size).toBe(FIT_MAX)
  })

  it('offers nothing for a book with no place at all', () => {
    expect(worldFits([book({ status: 'reading' })], 2026, TODAY)).toEqual([])
  })

  it('says how many countries are still to go when nothing fits', () => {
    expect(worldNone(4)).toBe('Nothing on your shelf is set in a new country — 4 more countries to go.')
    expect(worldNone(1)).toContain('1 more country to go')
    expect(worldNone(0)).toBe('')
  })
})

describe('a book for the seasonal challenge', () => {
  it('offers a book that counts for a season she has not finished', () => {
    const cosy = book({ status: 'reading', genres: ['Romance'] })
    const fits = seasonFits([cosy], 2026, TODAY)
    for (const f of fits) expect(f.why).toMatch(/^For (spring|summer|autumn|winter)$/)
  })

  it('offers one book per season rather than three for the same one', () => {
    const shelf = Array.from({ length: 6 }, () => book({ status: 'reading', genres: ['Romance'] }))
    const fits = seasonFits(shelf, 2026, TODAY)
    expect(new Set(fits.map((f) => f.why)).size).toBe(fits.length)
  })

  it('says which seasons are still open when nothing fits', () => {
    expect(seasonNone(['spring', 'winter'])).toBe('Nothing on your shelf fits spring or winter yet.')
    expect(seasonNone([])).toBe('')
  })
})

describe('a book for one of her own challenges', () => {
  const challenge = (over: Partial<OwnChallenge> = {}): OwnChallenge =>
    ({ id: 'c1', year: 2026, name: 'More fantasy', target: 5, rule: 'genre', value: 'Fantasy', ...over }) as OwnChallenge

  it('offers a book from her pile that the rule accepts', () => {
    const hit = book({ status: 'reading', genres: ['Fantasy'] })
    const miss = book({ status: 'reading', genres: ['Romance'] })
    const fits = ownFits([hit, miss], challenge(), TODAY)
    expect(fits.map((f) => f.book.id)).toEqual([hit.id])
    expect(fits[0].why).toBe('More fantasy')
  })

  it('offers nothing when her pile has nothing for the rule, and says so', () => {
    expect(ownFits([book({ status: 'reading', genres: ['Romance'] })], challenge(), TODAY)).toEqual([])
    expect(ownNone('More fantasy')).toBe('Nothing on your shelf fits More fantasy yet.')
  })

  it('never offers more than three', () => {
    const shelf = Array.from({ length: 7 }, () => book({ status: 'reading', genres: ['Fantasy'] }))
    expect(ownFits(shelf, challenge(), TODAY)).toHaveLength(FIT_MAX)
  })
})
