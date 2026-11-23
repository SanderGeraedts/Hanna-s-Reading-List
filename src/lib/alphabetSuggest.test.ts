import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { letterPool } from './alphabetSuggest'
import { drawSuggestion } from './bingoSuggest'

/** A book from her pile for a letter she has not read yet (D-0070). */

const TODAY = '2026-11-23'
let n = 0
const book = (over: Partial<Book> = {}): Book =>
  ({
    id: `b${n++}`,
    title: `Title ${n}`,
    authors: ['Nora Writer'],
    color: '#333',
    status: 'want',
    addedAt: n,
    ...over,
  }) as Book

describe('a book for a missing letter', () => {
  it('offers a book whose title starts with the letter', () => {
    const hit = book({ title: 'Babel' })
    const miss = book({ title: 'Circe' })
    expect(letterPool('B', [hit, miss], 'title', TODAY).map((c) => c.book.id)).toEqual([hit.id])
  })

  it('does not care how she typed the letter', () => {
    const hit = book({ title: 'Babel' })
    expect(letterPool('b', [hit], 'title', TODAY)).toHaveLength(1)
  })

  it('counts an author by first name and by surname', () => {
    const hit = book({ title: 'Anything', authors: ['Sarah J. Maas'] })
    expect(letterPool('S', [hit], 'author', TODAY).map((c) => c.book.id)).toEqual([hit.id])
    expect(letterPool('M', [hit], 'author', TODAY).map((c) => c.book.id)).toEqual([hit.id])
    expect(letterPool('Q', [hit], 'author', TODAY)).toEqual([])
  })

  it('never offers a book she has already finished', () => {
    const done = book({ title: 'Babel', status: 'read', finished: ['2026-02-02'] })
    expect(letterPool('B', [done], 'title', TODAY)).toEqual([])
  })

  it('offers nothing when her pile has nothing for the letter', () => {
    expect(letterPool('Q', [book({ title: 'Babel' })], 'title', TODAY)).toEqual([])
  })

  it('gives every book a weight, so one can be drawn', () => {
    const pool = letterPool('B', [book({ title: 'Babel' }), book({ title: 'Boulder' })], 'title', TODAY)
    expect(pool).toHaveLength(2)
    for (const c of pool) expect(c.weight).toBeGreaterThan(0)
    const first = drawSuggestion(pool, [], () => 0)
    expect(first).toBeDefined()
    // the next draw is the other one: a letter with two books can offer another
    const next = drawSuggestion(pool, first!.shown, () => 0)
    expect(next!.book.id).not.toBe(first!.book.id)
  })

  it('has nothing to draw from an empty pool', () => {
    expect(drawSuggestion([], [])).toBeUndefined()
  })
})
