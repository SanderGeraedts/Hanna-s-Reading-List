import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import {
  READY_TROPES,
  addTrope,
  canonicalTrope,
  foldTrope,
  hasTrope,
  removeTrope,
  shelfTropes,
  tropeCounts,
  tropeSuggestions,
  tropesOf,
} from './tropes'

/** T-0048 / D-0042: one spelling per trope, and her own words join the list. */

const book = (over: Partial<Book> = {}): Book =>
  ({ id: 'b', title: 'T', authors: [], color: '#000', status: 'read', addedAt: 1, ...over }) as Book

describe('foldTrope', () => {
  it('ignores capitals, accents and extra spaces', () => {
    expect(foldTrope('  Enemies   to Lovers ')).toBe('enemies to lovers')
    expect(foldTrope('ENEMIES TO LOVERS')).toBe(foldTrope('enemies to lovers'))
    expect(foldTrope('Café romance')).toBe('cafe romance')
  })
})

describe('tropesOf', () => {
  it('treats a book with no tropes and a book with an empty list the same', () => {
    expect(tropesOf(book())).toEqual([])
    expect(tropesOf(book({ tropes: [] }))).toEqual([])
    expect(hasTrope(book({ tropes: [] }), 'Found family')).toBe(false)
    expect(tropeCounts([book({ tropes: [] }), book()])).toEqual([])
    expect(shelfTropes([book({ tropes: [] })])).toEqual([])
  })
})

describe('canonicalTrope', () => {
  const shelf = [book({ tropes: ['Grumpy/Sunshine'] })]

  it('takes the spelling the shelf already uses', () => {
    expect(canonicalTrope('grumpy/sunshine', shelf)).toBe('Grumpy/Sunshine')
    expect(canonicalTrope('  GRUMPY/SUNSHINE  ', shelf)).toBe('Grumpy/Sunshine')
  })

  it('takes the ready list spelling for a trope she has not used yet', () => {
    expect(canonicalTrope('enemies to lovers', [])).toBe('Enemies to lovers')
    expect(READY_TROPES).toContain('Enemies to lovers')
  })

  it('capitalises a new all-lower-case trope and keeps her own capitals otherwise', () => {
    expect(canonicalTrope('sentient library', [])).toBe('Sentient library')
    expect(canonicalTrope('Sentient LIBRARY', [])).toBe('Sentient LIBRARY')
  })

  it('is empty for nothing but spaces, and never longer than 60 characters', () => {
    expect(canonicalTrope('   ', [])).toBe('')
    expect(canonicalTrope('x'.repeat(200), []).length).toBe(60)
  })
})

describe('tropeSuggestions', () => {
  it('is the ready list plus her own words, each once, alphabetically', () => {
    const list = tropeSuggestions([book({ tropes: ['Sentient library', 'enemies to lovers'] })])
    expect(list).toContain('Sentient library')
    // her shelf's spelling wins over the ready list's for a trope that is in both (D-0042 §4)
    expect(list).toContain('enemies to lovers')
    expect(list).not.toContain('Enemies to lovers')
    expect(new Set(list).size).toBe(list.length)
    expect([...list].sort((a, b) => a.localeCompare(b))).toEqual(list)
  })
})

describe('addTrope and removeTrope', () => {
  it('adds the shelf spelling, and refuses a trope the book already has', () => {
    const shelf = [book({ id: 'other', tropes: ['Enemies to lovers'] })]
    const b = book()
    expect(addTrope(b, 'ENEMIES TO LOVERS', shelf)).toEqual({ tropes: ['Enemies to lovers'] })
    const withIt = book({ tropes: ['Enemies to lovers'] })
    expect(addTrope(withIt, 'enemies to lovers', shelf)).toBe(null)
    expect(addTrope(b, '  ', shelf)).toBe(null)
  })

  it('leaves no empty list behind when the last trope goes', () => {
    expect(removeTrope(book({ tropes: ['Found family'] }), 'found family')).toEqual({ tropes: undefined })
    expect(removeTrope(book({ tropes: ['Found family', 'Slow burn'] }), 'Found family')).toEqual({ tropes: ['Slow burn'] })
  })
})

describe('tropeCounts', () => {
  it('counts each book once per trope, biggest first, ties alphabetically', () => {
    const books = [
      book({ id: '1', tropes: ['Enemies to lovers', 'Found family'] }),
      book({ id: '2', tropes: ['enemies to lovers'] }),
      book({ id: '3', tropes: ['Slow burn'] }),
      // the same trope twice on one book counts once
      book({ id: '4', tropes: ['Slow burn', 'SLOW BURN'] }),
    ]
    expect(tropeCounts(books)).toEqual([
      { name: 'Enemies to lovers', count: 2 },
      { name: 'Slow burn', count: 2 },
      { name: 'Found family', count: 1 },
    ])
  })
})
