import { describe, expect, it } from 'vitest'
import type { Book } from '../library'
import { PLANT_KINDS, PLANT_KIND_IDS, blooming, bookLength, kindOf, lengthPages, plantKind } from './plants'
import { SEASONS } from './seasons'
import { DEFAULT_PAGES } from './numbers'

/**
 * The plant catalogue (T-0060, D-0050 §3): the book decides the kind, so every
 * rule that turns a book into a plant has a test — a change to one changes her
 * garden.
 */

let next = 0
const book = (over: Partial<Book> = {}): Book => ({
  id: `b${next++}`,
  title: 'A book',
  authors: [],
  color: '#333',
  status: 'read',
  addedAt: 0,
  ...over,
})

describe('how long a book is', () => {
  it('is its pages', () => {
    expect(lengthPages(book({ pages: 320 }))).toBe(320)
    expect(bookLength(book({ pages: 90 }))).toBe('short')
    expect(bookLength(book({ pages: 320 }))).toBe('medium')
    expect(bookLength(book({ pages: 700 }))).toBe('long')
  })

  it('turns the listening time of a book she only listens to into pages', () => {
    // 900 minutes ÷ 1.5 = 600 pages: a long book
    expect(lengthPages(book({ formats: ['storytel'], minutes: 900 }))).toBe(600)
    expect(bookLength(book({ formats: ['storytel'], minutes: 900 }))).toBe('long')
  })

  it('counts a book with no length at all as 280 pages, which is a medium book', () => {
    expect(lengthPages(book())).toBe(DEFAULT_PAGES)
    expect(bookLength(book())).toBe('medium')
  })

  it('keeps the pages of a book she also has on paper', () => {
    expect(lengthPages(book({ formats: ['paperback', 'audiobook'], pages: 150, minutes: 900 }))).toBe(150)
  })
})

describe('what a book becomes', () => {
  it('makes a thick fantasy book an oak and a shorter one a sapling', () => {
    expect(kindOf(book({ genres: ['Fantasy'], pages: 700 })).id).toBe('oak')
    expect(kindOf(book({ genres: ['Fantasy'], pages: 300 })).id).toBe('sapling')
    expect(kindOf(book({ genres: ['Fantasy'], pages: 120 })).id).toBe('sapling')
  })

  it('makes a romance a rose, climbing when it is long and wild when it is short', () => {
    expect(kindOf(book({ genres: ['Romance'], pages: 600 })).id).toBe('climbing-rose')
    expect(kindOf(book({ genres: ['Romance'], pages: 320 })).id).toBe('rose')
    expect(kindOf(book({ genres: ['Romance'], pages: 150 })).id).toBe('wild-rose')
  })

  it('makes a thriller, a crime story and a horror book dark and thorny', () => {
    expect(kindOf(book({ genres: ['Thriller'], pages: 600 })).id).toBe('bramble')
    expect(kindOf(book({ genres: ['Crime'], pages: 300 })).id).toBe('thornbush')
    expect(kindOf(book({ genres: ['Horror'], pages: 150 })).id).toBe('thornbush')
    expect(kindOf(book({ genres: ['Mystery'], pages: 300 })).thorns).toBe(true)
  })

  it('makes a short book a small flower', () => {
    expect(kindOf(book({ genres: ["Children's"], pages: 90 })).id).toBe('daisy')
    expect(kindOf(book({ pages: 90 })).id).toBe('daisy')
    expect(kindOf(book({ pages: 90 })).family).toBe('flower')
  })

  it('follows the first genre the catalogue knows, not the first genre on the book', () => {
    // "Fiction" is not a shelf genre the catalogue maps; Romance decides
    expect(kindOf(book({ genres: ['Adventure', 'Romance'], pages: 300 })).id).toBe('sunflower')
    expect(kindOf(book({ genres: ['Fiction' as string, 'Romance'], pages: 300 })).id).toBe('rose')
  })

  it('gives a book with no genre a plant from its length alone: a thick one is still a tree', () => {
    expect(kindOf(book({ pages: 700 })).id).toBe('birch')
    expect(kindOf(book({ pages: 700 })).family).toBe('tree')
    expect(kindOf(book({ genres: [], pages: 300 })).id).toBe('fern')
    expect(kindOf(book()).id).toBe('fern')
  })

  it('has an evergreen or a winter flower for the seasons that would be bare', () => {
    expect(kindOf(book({ genres: ['Science fiction'], pages: 400 })).evergreen).toBe(true)
    expect(kindOf(book({ genres: ['Classics'], pages: 400 })).evergreen).toBe(true)
    expect(kindOf(book({ genres: ['Poetry'], pages: 80 })).blooms).toContain('winter')
  })
})

describe('the catalogue itself', () => {
  it('has a name, a family and colours for every kind, and no two the same id', () => {
    expect(new Set(PLANT_KIND_IDS).size).toBe(PLANT_KIND_IDS.length)
    for (const id of PLANT_KIND_IDS) {
      const k = PLANT_KINDS[id]
      expect(k.name.length, id).toBeGreaterThan(2)
      expect(['tree', 'shrub', 'flower', 'fern']).toContain(k.family)
      for (const c of [k.leaf, k.autumnLeaf, k.flower, k.stem]) expect(c, id).toMatch(/^#[0-9a-f]{6}$/)
      expect(k.height, id).toBeGreaterThan(0)
      expect(k.height, id).toBeLessThanOrEqual(1)
    }
  })

  it('falls back to a daisy for a kind it does not know (an older or newer device)', () => {
    expect(plantKind('nonesuch').id).toBe('daisy')
  })
})

describe('when a plant shows flowers', () => {
  const oak = PLANT_KINDS.oak
  const pine = PLANT_KINDS.pine

  it('follows the kind in its own seasons', () => {
    expect(blooming(oak, 'spring')).toBe(true)
    expect(blooming(oak, 'winter')).toBe(false)
    expect(blooming(PLANT_KINDS.snowdrop, 'winter')).toBe(true)
  })

  it('lets a night-blooming sleep read flower in every season, winter too', () => {
    for (const season of SEASONS) expect(blooming(pine, season, { night: true }), season).toBe(true)
  })

  it('lets a re-read flower again, but not in winter', () => {
    expect(blooming(oak, 'summer', { reads: 2 })).toBe(true)
    expect(blooming(oak, 'winter', { reads: 3 })).toBe(false)
  })
})
